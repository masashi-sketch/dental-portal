#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

export const STATIC_DATA_RULES = [
  {
    id: 'placeholder-link',
    description: '遷移しない href="#"',
    pattern: String.raw`href\s*=\s*["']#["']`,
  },
  {
    id: 'test-tenant-name',
    description: '本番表示に残るテスト医院名',
    pattern: String.raw`テストデンタル(?:歯科)?`,
  },
  {
    id: 'business-placeholder',
    description: '患者・予約・受け取り情報に見える伏字プレースホルダー',
    pattern: String.raw`◯◯　◯◯ 様|◯月◯日（◯）◯◯:◯◯|◯月◯日（◯）|◯◯　◯◯(?=<)|◯◯・◯◯◯◯`,
  },
  {
    id: 'local-mock-collection',
    description: 'ローカルstateだけで操作される既知の固定業務コレクション',
    pattern: String.raw`const\s+initial(?:Campaigns|Articles)\b`,
  },
  {
    id: 'hardcoded-business-collection',
    description: 'KPI・売上・ランキング等の既知の固定業務配列',
    pattern: String.raw`const\s+(?:alerts|recentOrders|clinicRanking|kpis|byStaff|byArea|topCustomers|monthlyData|monthlyTotal)\s*=\s*\[`,
  },
  {
    id: 'hardcoded-customer-code',
    description: '画面コードに埋め込まれた得意先コード',
    pattern: String.raw`\bA\d{6}\b`,
  },
  {
    id: 'handlerless-add-button',
    description: '処理が接続されていない既知の追加ボタン',
    pattern: String.raw`<Button\s+theme=["']sky["']>\s*＋ 追加\s*</Button>`,
  },
  {
    id: 'fixed-business-date',
    description: '業務コンテンツに埋め込まれた固定日付',
    pattern: String.raw`["']20\d{2}-\d{2}-\d{2}["']|20\d{2}年(?:\d{1,2}月|度|春)`,
  },
  {
    id: 'mock-unread-state',
    description: '固定された未読件数・更新日時',
    pattern: String.raw`const\s+CONTENT_UNREAD\b`,
  },
];

const SCAN_ROOTS = ['src/app', 'src/components'];
const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const EXCLUDED_PARTS = new Set(['__tests__', 'manual']);

function toPosixPath(path) {
  return path.replaceAll('\\', '/');
}

function listSourceFiles(projectRoot) {
  const files = [];

  const visit = (absolutePath) => {
    const stats = statSync(absolutePath);
    if (stats.isDirectory()) {
      const relativePath = toPosixPath(relative(projectRoot, absolutePath));
      const parts = relativePath.split('/');
      if (parts.some((part) => EXCLUDED_PARTS.has(part))) return;
      for (const name of readdirSync(absolutePath)) visit(resolve(absolutePath, name));
      return;
    }

    if (SOURCE_EXTENSIONS.has(extname(absolutePath)) && !absolutePath.includes('.test.')) {
      files.push(absolutePath);
    }
  };

  for (const root of SCAN_ROOTS) visit(resolve(projectRoot, root));
  return files.sort();
}

function countMatches(content, rule) {
  return [...content.matchAll(new RegExp(rule.pattern, 'g'))].length;
}

export function collectStaticDataFindings(projectRoot) {
  const findings = [];
  for (const absolutePath of listSourceFiles(projectRoot)) {
    const content = readFileSync(absolutePath, 'utf8');
    const file = toPosixPath(relative(projectRoot, absolutePath));
    for (const rule of STATIC_DATA_RULES) {
      const occurrences = countMatches(content, rule);
      if (occurrences > 0) findings.push({ ruleId: rule.id, file, occurrences });
    }
  }
  return findings;
}

export function auditStaticBusinessData({
  projectRoot,
  baselinePath = resolve(projectRoot, 'config/static-business-data-allowlist.json'),
}) {
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  if (baseline.version !== 1 || !Array.isArray(baseline.entries)) {
    throw new Error('固定データ許可リストの形式が不正です');
  }

  const findings = collectStaticDataFindings(projectRoot);
  const actualByKey = new Map(
    findings.map((finding) => [`${finding.ruleId}:${finding.file}`, finding.occurrences]),
  );
  const baselineByKey = new Map();
  const violations = [];

  for (const entry of baseline.entries) {
    const key = `${entry.ruleId}:${entry.file}`;
    if (baselineByKey.has(key)) {
      violations.push(`許可リストが重複しています: ${key}`);
      continue;
    }
    baselineByKey.set(key, entry.expectedOccurrences);

    if (!STATIC_DATA_RULES.some((rule) => rule.id === entry.ruleId)) {
      violations.push(`存在しないruleIdです: ${entry.ruleId}`);
    }
    if (!entry.reason || !entry.classification) {
      violations.push(`理由または分類がありません: ${key}`);
    }
  }

  for (const finding of findings) {
    const key = `${finding.ruleId}:${finding.file}`;
    const expected = baselineByKey.get(key);
    if (expected === undefined) {
      violations.push(`新しい固定データ候補: ${key} (${finding.occurrences}件)`);
    } else if (finding.occurrences !== expected) {
      violations.push(`件数が変わりました: ${key} (許可 ${expected}件 / 現在 ${finding.occurrences}件)`);
    }
  }

  for (const [key, expected] of baselineByKey) {
    if (!actualByKey.has(key)) {
      violations.push(`解消済み候補が許可リストに残っています: ${key} (許可 ${expected}件 / 現在 0件)`);
    }
  }

  return { findings, baseline, violations };
}

function runCli() {
  const projectRoot = process.cwd();
  const result = auditStaticBusinessData({ projectRoot });
  const totalOccurrences = result.findings.reduce((sum, finding) => sum + finding.occurrences, 0);

  if (result.violations.length > 0) {
    console.error('固定業務データ監査に失敗しました。');
    for (const violation of result.violations) console.error(`- ${violation}`);
    console.error('意図的な静的コンテンツの場合も、理由と分類を許可リストへ明記してください。');
    process.exitCode = 1;
    return;
  }

  console.log(`固定業務データ監査: ${result.findings.length}ファイル・ルール組み合わせ、${totalOccurrences}候補をベースライン内で確認しました。`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) runCli();
