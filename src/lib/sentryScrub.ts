import type { ErrorEvent } from '@sentry/nextjs';

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/g;

// sendDefaultPiiは無効のままにしており、Cookie/Authorizationヘッダーは既定で送信されない。
// これはエラーメッセージ本文に患者様・医院スタッフのメールアドレス等が
// 紛れ込んだ場合に備えた多層防御のマスク処理。
export function scrubPii(event: ErrorEvent): ErrorEvent {
  if (event.message) {
    event.message = event.message.replace(EMAIL_PATTERN, '[redacted-email]');
  }
  for (const exception of event.exception?.values ?? []) {
    if (exception.value) {
      exception.value = exception.value.replace(EMAIL_PATTERN, '[redacted-email]');
    }
  }
  return event;
}
