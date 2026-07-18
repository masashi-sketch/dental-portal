import 'server-only';

// Slack Incoming Webhookへメッセージを送るだけの薄い関数。一方向通知専用
// （Slack側からの返信取り込みは行わない設計のため、レスポンス内容は見ない）。
// 失敗してもfalseを返すのみで例外は投げない。呼び出し元（問い合わせ登録処理）を
// 失敗させないため（src/lib/email/sendEmail.tsの呼び出し元と同じ設計思想）。
export async function postWebhookMessage(webhookUrl: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch (e) {
    console.error('postWebhookMessage failed:', e);
    return false;
  }
}
