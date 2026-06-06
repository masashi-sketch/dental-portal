const config: Record<string, { from: string; to: string; icon: (s: number) => React.ReactNode }> = {
  supplement: {
    from: '#6366f1', to: '#a5b4fc',
    icon: (s) => (
      <svg width={s} height={s} fill="none" viewBox="0 0 64 64">
        <ellipse cx="32" cy="32" rx="14" ry="22" fill="white" fillOpacity="0.25" />
        <ellipse cx="32" cy="20" rx="14" ry="10" fill="white" fillOpacity="0.35" />
        <ellipse cx="32" cy="44" rx="14" ry="10" fill="white" fillOpacity="0.15" />
        <line x1="18" y1="32" x2="46" y2="32" stroke="white" strokeWidth="2" strokeOpacity="0.5" />
      </svg>
    ),
  },
  yogurt: {
    from: '#f59e0b', to: '#fde68a',
    icon: (s) => (
      <svg width={s} height={s} fill="none" viewBox="0 0 64 64">
        <rect x="18" y="20" width="28" height="32" rx="4" fill="white" fillOpacity="0.3" />
        <rect x="20" y="14" width="24" height="10" rx="3" fill="white" fillOpacity="0.4" />
        <path d="M24 34 Q32 30 40 34" stroke="white" strokeWidth="2" strokeOpacity="0.6" fill="none" />
        <circle cx="32" cy="40" r="3" fill="white" fillOpacity="0.5" />
      </svg>
    ),
  },
  toothbrush: {
    from: '#0891b2', to: '#67e8f9',
    icon: (s) => (
      <svg width={s} height={s} fill="none" viewBox="0 0 64 64">
        <rect x="29" y="8" width="6" height="36" rx="3" fill="white" fillOpacity="0.35" />
        <rect x="22" y="8" width="20" height="14" rx="4" fill="white" fillOpacity="0.25" />
        <rect x="24" y="10" width="4" height="10" rx="2" fill="white" fillOpacity="0.4" />
        <rect x="30" y="10" width="4" height="10" rx="2" fill="white" fillOpacity="0.4" />
        <rect x="36" y="10" width="4" height="10" rx="2" fill="white" fillOpacity="0.4" />
        <rect x="29" y="44" width="6" height="12" rx="3" fill="white" fillOpacity="0.35" />
      </svg>
    ),
  },
  oral: {
    from: '#10b981', to: '#6ee7b7',
    icon: (s) => (
      <svg width={s} height={s} fill="none" viewBox="0 0 64 64">
        <rect x="22" y="10" width="20" height="40" rx="8" fill="white" fillOpacity="0.3" />
        <rect x="26" y="8" width="12" height="6" rx="2" fill="white" fillOpacity="0.45" />
        <rect x="26" y="24" width="12" height="3" rx="1.5" fill="white" fillOpacity="0.4" />
        <rect x="26" y="30" width="12" height="3" rx="1.5" fill="white" fillOpacity="0.3" />
      </svg>
    ),
  },
};

export default function ProductImage({ type, large = false }: { type: string; large?: boolean }) {
  const c = config[type] ?? config.oral;
  const iconSize = large ? 80 : 48;
  return (
    <div
      className={`w-full flex items-center justify-center rounded-t-2xl ${large ? 'h-56 sm:h-72' : 'h-36 sm:h-44'}`}
      style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
    >
      {c.icon(iconSize)}
    </div>
  );
}
