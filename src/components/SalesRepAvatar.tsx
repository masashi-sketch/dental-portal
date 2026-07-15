type Props = {
  name: string;
  photoUrl?: string | null;
  size?: number;
  className?: string;
};

export default function SalesRepAvatar({ name, photoUrl, size = 44, className = '' }: Props) {
  if (photoUrl) {
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
