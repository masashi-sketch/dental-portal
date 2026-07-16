'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonTheme = 'sky' | 'violet';
type ButtonSize = 'sm' | 'lg';

const THEME_CLASSES: Record<ButtonTheme, string> = {
  sky: 'bg-sky-500 hover:bg-sky-400',
  violet: 'bg-violet-600 hover:bg-violet-700',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-sm font-semibold px-4 py-2.5',
  lg: 'text-base font-bold px-5 py-3',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme: ButtonTheme;
  size?: ButtonSize;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export default function Button({
  theme,
  size = 'lg',
  icon,
  fullWidth,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        THEME_CLASSES[theme],
        SIZE_CLASSES[size],
        fullWidth ? 'flex-1' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
