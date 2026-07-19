import { describe, expect, it } from 'vitest';
import { renderEmailTemplate, renderEmailTemplateHtml, type EmailTemplateVars } from './templates';

const vars: EmailTemplateVars = {
  patientName: '山田 太郎',
  loginId: 'BU000123',
  clinicName: '中央歯科',
  link: 'https://dental-portal-biogaia.vercel.app/reset-password?token=abc123',
};

describe('renderEmailTemplate', () => {
  it('プレースホルダをすべて実際の値に置換する', () => {
    const result = renderEmailTemplate(
      '{{患者名}} 様\nログインID: {{ログインID}}\n医院: {{医院名}}\nリンク: {{リンク}}',
      vars,
    );
    expect(result).toBe(
      '山田 太郎 様\nログインID: BU000123\n医院: 中央歯科\nリンク: https://dental-portal-biogaia.vercel.app/reset-password?token=abc123',
    );
  });
});

describe('renderEmailTemplateHtml', () => {
  it('{{リンク}}を<a href>のアンカータグに変換する（プレーンテキストの折り返しでリンクが壊れるのを防ぐ）', () => {
    const result = renderEmailTemplateHtml('以下から再設定してください。\n{{リンク}}', vars);
    expect(result).toContain(`<a href="${vars.link}">${vars.link}</a>`);
  });

  it('改行を<br>に変換する', () => {
    const result = renderEmailTemplateHtml('1行目\n2行目', vars);
    expect(result).toBe('1行目<br>\n2行目');
  });

  it('患者名・医院名等にHTML特殊文字が含まれていてもエスケープする（XSS対策）', () => {
    const dangerousVars: EmailTemplateVars = { ...vars, patientName: '<script>alert(1)</script>' };
    const result = renderEmailTemplateHtml('{{患者名}} 様', dangerousVars);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });
});
