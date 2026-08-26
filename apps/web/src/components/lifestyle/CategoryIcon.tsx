import type { CategoryIconName } from "@/lib/lifestyle-data";

const COMMON = "h-6 w-6";

function Truck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={COMMON}>
      <path d="M2 7h11v9H2z" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </svg>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={COMMON}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Spray() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={COMMON}>
      <path d="M9 8V5a2 2 0 0 1 2-2h1" strokeLinecap="round" />
      <path d="M8 8h6l1 2v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10z" strokeLinejoin="round" />
      <path d="M15 6h3M16 4h2M14 9h2" strokeLinecap="round" />
    </svg>
  );
}

function Fridge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={COMMON}>
      <rect x="5" y="2.5" width="14" height="19" rx="1.6" strokeLinejoin="round" />
      <path d="M5 10h14" />
      <path d="M8 5.5v2M8 13v2.5" strokeLinecap="round" />
    </svg>
  );
}

function Sofa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={COMMON}>
      <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" strokeLinecap="round" />
      <path d="M3 12h18v4a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16z" strokeLinejoin="round" />
      <path d="M4 17.5V20M20 17.5V20" strokeLinecap="round" />
    </svg>
  );
}

function Wifi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={COMMON}>
      <path d="M3.5 9a13 13 0 0 1 17 0" strokeLinecap="round" />
      <path d="M6.7 12.6a8.5 8.5 0 0 1 10.6 0" strokeLinecap="round" />
      <path d="M9.9 16.1a4 4 0 0 1 4.2 0" strokeLinecap="round" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ICONS: Record<CategoryIconName, () => React.ReactElement> = {
  moving: Truck,
  move_out_cleaning: Sparkle,
  living_cleaning: Spray,
  appliance: Fridge,
  furniture: Sofa,
  subscription: Wifi,
};

export default function CategoryIcon({ name }: { name: CategoryIconName }) {
  const Icon = ICONS[name];
  return <Icon />;
}
