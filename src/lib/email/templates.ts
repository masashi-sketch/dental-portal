// 患者様向けメールの共通デフォルト文面と、プレースホルダの置換ロジック。
// 得意先ごとのカスタム文面（clinic_email_templates）が未設定の項目はこちらを使う。
// クライアント側（BGJのメール設定プレビュー）でも使うため、'server-only'は付けない。
// DBからカスタム文面を取得するサーバー専用ロジックはresolveClinicEmail.tsを使う。

export type EmailTemplateVars = {
  patientName: string;
  loginId: string;
  clinicName: string;
  link: string;
};

export const DEFAULT_WELCOME_SUBJECT = '【{{医院名}}】患者様ポータルのご登録ありがとうございます';

export const DEFAULT_WELCOME_BODY = `{{患者名}} 様

患者様ポータルへのご登録が完了しました。

■ ログインID
{{ログインID}}

■ すぐにログインする
以下のリンクをクリックすると、そのままログインできます（30分間有効）。
{{リンク}}

■ 次回以降のログイン
上記ログインIDと、ご登録時に設定したパスワードで、いつでもログインいただけます。

ご不明な点は、通院先の医院までお問い合わせください。`;

export const DEFAULT_PASSWORD_RESET_SUBJECT = '【{{医院名}}】パスワード再設定のご案内';

export const DEFAULT_PASSWORD_RESET_BODY = `{{患者名}} 様

パスワード再設定のご依頼を受け付けました。

以下のリンクから、新しいパスワードを設定してください（30分間有効）。
{{リンク}}

このメールに心当たりがない場合は、破棄してください。`;

export function renderEmailTemplate(template: string, vars: EmailTemplateVars): string {
  return template
    .replaceAll('{{患者名}}', vars.patientName)
    .replaceAll('{{ログインID}}', vars.loginId)
    .replaceAll('{{医院名}}', vars.clinicName)
    .replaceAll('{{リンク}}', vars.link);
}

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// プレーンテキストのみのメールは、認証トークン付きの長いURL（{{リンク}}）が
// 1行78文字前後で折り返され、一部のメールクライアント・中継サーバーでリンクが
// 途中で切れて開けなくなることがある（実際に発生した不具合）。HTML版では
// URLを<a href>属性に埋め込むため、見た目の折り返しがあってもリンク自体は壊れない。
export function renderEmailTemplateHtml(template: string, vars: EmailTemplateVars): string {
  const withVars = escapeHtml(template)
    .replaceAll('{{患者名}}', escapeHtml(vars.patientName))
    .replaceAll('{{ログインID}}', escapeHtml(vars.loginId))
    .replaceAll('{{医院名}}', escapeHtml(vars.clinicName))
    .replaceAll('{{リンク}}', `<a href="${escapeHtml(vars.link)}">${escapeHtml(vars.link)}</a>`);
  return withVars.replaceAll('\n', '<br>\n');
}

// プレビュー画面用のサンプル値。
export const PREVIEW_SAMPLE_VARS: Omit<EmailTemplateVars, 'clinicName'> = {
  patientName: '山田 太郎',
  loginId: 'BU000123',
  link: 'https://dental-portal-biogaia.vercel.app/join/verify?token=xxxxxxxx',
};
