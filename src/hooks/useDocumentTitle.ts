'use client';

import { useEffect } from 'react';

// サーバー側generateMetadataでは解決できないケース（BGJ職員のタブ固有プレビュー等）用に、
// クライアント側で取得できたタイトルだけをdocument.titleへ上書きする。
// titleがnull（未取得・非対象）の間はSSRが出したタイトルをそのまま維持する。
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    document.title = title;
  }, [title]);
}
