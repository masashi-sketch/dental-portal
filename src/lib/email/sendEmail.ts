import 'server-only';
import nodemailer from 'nodemailer';

// GoogleWorkSpace（jyosys@biogaia.jpのアプリパスワード）経由でSMTP認証し、送信する。
// 新規の有料サービス契約は不要（既存のWorkSpace契約の範囲内）。
// 差出人アドレス自体は固定のエイリアス1つ（WORKSPACE_SENDER_ALIAS）で、
// 表示名だけをクリニックごとに変える（clinic_email_templates.sender_name）。
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.WORKSPACE_SMTP_USER;
  const pass = process.env.WORKSPACE_SMTP_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error('WORKSPACE_SMTP_USER / WORKSPACE_SMTP_APP_PASSWORD が .env.local に設定されていません。');
  }

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

export async function sendPatientEmail({
  to,
  senderName,
  subject,
  text,
  html,
}: {
  to: string;
  senderName: string;
  subject: string;
  text: string;
  // HTML版も併記する。認証トークン付きの長いURLはプレーンテキストのみだと
  // 折り返しでリンクが壊れることがあるため（TROUBLESHOOTING.md参照）、
  // HTML版では<a href>で埋め込み折り返しの影響を受けないようにする。
  html?: string;
}): Promise<void> {
  const alias = process.env.WORKSPACE_SENDER_ALIAS || process.env.WORKSPACE_SMTP_USER;
  await getTransporter().sendMail({
    from: `"${senderName}" <${alias}>`,
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  });
}
