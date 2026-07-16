import type { HTMLAttributes } from 'react';

type CardTheme = 'sky' | 'violet';

const BORDER_CLASSES: Record<CardTheme, string> = {
  sky: 'border-sky-100',
  violet: 'border-slate-200',
};

type CardProps = HTMLAttributes<HTMLDivElement> & {
  theme?: CardTheme;
};

export default function Card({ theme = 'violet', className = '', children, ...rest }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl border ${BORDER_CLASSES[theme]} ${className}`} {...rest}>
      {children}
    </div>
  );
}
