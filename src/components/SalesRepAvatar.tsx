'use client';

import { useState } from 'react';

type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
};

export default function SalesRepAvatar({ name, photoUrl, size = 44, className = '' }: Props) {
  // photoUrlが削除済み・URL誤り等で読み込みに失敗した場合、ブラウザ標準の
  // 壊れた画像アイコンのまま表示され続けないよう、イニシャル表示にフォールバックする。
  // photoUrlが変わったらエラー状態をリセットし再度画像表示を試みる（レンダー中に
  // 直接比較・setStateするReact推奨パターン。useEffectは使わない）。
  const [imgError, setImgError] = useState(false);
  const [trackedPhotoUrl, setTrackedPhotoUrl] = useState(photoUrl);
  if (photoUrl !== trackedPhotoUrl) {
    setTrackedPhotoUrl(photoUrl);
    setImgError(false);
  }

  if (photoUrl && !imgError) {
    return (
      // photoUrlは任意の外部URLのため next/image の remotePatterns では対応できない。素のimgタグを使う。
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className={`rounded-xl object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`bg-gradient-to-br from-violet-400 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name ? name[0] : '?'}
    </div>
  );
}
