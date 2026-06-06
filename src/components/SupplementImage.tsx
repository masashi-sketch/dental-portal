const configs: Record<string, { from: string; to: string; icon: (s: number) => React.ReactNode }> = {
  capsule: {
    from: '#4f46e5', to: '#818cf8',
    icon: (s) => (
      <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
        <ellipse cx="40" cy="40" rx="16" ry="26" fill="white" fillOpacity="0.18" />
        <ellipse cx="40" cy="26" rx="16" ry="12" fill="white" fillOpacity="0.32" />
        <ellipse cx="40" cy="54" rx="16" ry="12" fill="white" fillOpacity="0.12" />
        <line x1="24" y1="40" x2="56" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.45" />
        <ellipse cx="40" cy="16" rx="7" ry="4" fill="white" fillOpacity="0.25" />
        <circle cx="52" cy="28" r="3" fill="white" fillOpacity="0.2" />
        <circle cx="30" cy="55" r="2.5" fill="white" fillOpacity="0.2" />
      </svg>
    ),
  },
  tablet: {
    from: '#d97706', to: '#fbbf24',
    icon: (s) => (
      <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="22" fill="white" fillOpacity="0.2" />
        <circle cx="40" cy="40" r="16" fill="white" fillOpacity="0.18" />
        <line x1="24" y1="40" x2="56" y2="40" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
        <line x1="40" y1="24" x2="40" y2="56" stroke="white" strokeWidth="2" strokeOpacity="0.4" />
        <circle cx="54" cy="26" r="5" fill="white" fillOpacity="0.2" />
        <circle cx="54" cy="26" r="3" fill="white" fillOpacity="0.28" />
        <circle cx="24" cy="54" r="4" fill="white" fillOpacity="0.18" />
      </svg>
    ),
  },
  chewable: {
    from: '#059669', to: '#34d399',
    icon: (s) => (
      <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
        <rect x="22" y="22" width="14" height="14" rx="4" fill="white" fillOpacity="0.28" />
        <rect x="44" y="22" width="14" height="14" rx="4" fill="white" fillOpacity="0.22" />
        <rect x="22" y="44" width="14" height="14" rx="4" fill="white" fillOpacity="0.22" />
        <rect x="44" y="44" width="14" height="14" rx="4" fill="white" fillOpacity="0.28" />
        <rect x="33" y="33" width="14" height="14" rx="4" fill="white" fillOpacity="0.18" />
        <circle cx="56" cy="56" r="6" fill="white" fillOpacity="0.15" />
      </svg>
    ),
  },
  multi: {
    from: '#7c3aed', to: '#c4b5fd',
    icon: (s) => (
      <svg width={s} height={s} fill="none" viewBox="0 0 80 80">
        <rect x="26" y="12" width="28" height="42" rx="8" fill="white" fillOpacity="0.2" />
        <rect x="30" y="10" width="20" height="8" rx="3" fill="white" fillOpacity="0.35" />
        <rect x="30" y="24" width="20" height="4" rx="2" fill="white" fillOpacity="0.38" />
        <rect x="30" y="32" width="20" height="4" rx="2" fill="white" fillOpacity="0.28" />
        <rect x="30" y="40" width="20" height="4" rx="2" fill="white" fillOpacity="0.22" />
        <circle cx="57" cy="60" r="9" fill="white" fillOpacity="0.15" />
        <circle cx="57" cy="60" r="5" fill="white" fillOpacity="0.2" />
      </svg>
    ),
  },
};

const sizeMap = { sm: 52, md: 72, lg: 96 } as const;
const heightMap = { sm: 'h-36', md: 'h-48', lg: 'h-56 sm:h-64' } as const;

export default function SupplementImage({ type, size = 'md' }: { type: string; size?: 'sm' | 'md' | 'lg' }) {
  const c = configs[type] ?? configs.capsule;
  return (
    <div
      className={`w-full ${heightMap[size]} flex items-center justify-center rounded-2xl`}
      style={{ background: `linear-gradient(145deg, ${c.from}, ${c.to})` }}
    >
      {c.icon(sizeMap[size])}
    </div>
  );
}
