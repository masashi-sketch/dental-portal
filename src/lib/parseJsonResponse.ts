// fetchの成功レスポンス（res.ok === true）をJSONとしてパースする。
//
// 同一ブラウザの別タブで患者/医院/BGJポータルを同時に開いていると、片方でログインし
// 直した瞬間にセッションクッキーが上書きされ、もう片方のタブでのAPI呼び出しが
// 認証ガード（src/proxy.ts）によってログイン画面等へリダイレクトされることがある。
// リダイレクト先は200 OKのHTMLページのため、素朴なres.json()は
// 「Unexpected token '<', "<!DOCTYPE "... is not valid JSON」という
// 分かりにくいエラーになる。content-typeを確認し、分かりやすいメッセージに変換する。
export async function parseJsonResponse<T = unknown>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('セッションの状態が変わった可能性があります。ページを再読み込みしてください。');
  }
  return res.json() as Promise<T>;
}
