export type IconName =
  | "truck"
  | "box"
  | "sparkle"
  | "spray"
  | "fridge"
  | "sofa"
  | "wifi"
  | "wrench"
  | "bug"
  | "key"
  | "calendar"
  | "chat"
  | "leaf"
  | "gift"
  | "shield"
  | "ladder"
  | "bell"
  | "sun";

const COMMON = "h-full w-full";

function Truck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M2 7h11v9H2z" strokeLinejoin="round" />
      <path d="M13 10h4l4 3v3h-8z" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="1.8" />
      <circle cx="17" cy="18" r="1.8" />
    </svg>
  );
}

function Box() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M3 8l9-4 9 4-9 4-9-4z" strokeLinejoin="round" />
      <path d="M3 8v8l9 4 9-4V8" strokeLinejoin="round" />
      <path d="M12 12v8" />
    </svg>
  );
}

function Sparkle() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path
        d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Spray() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M9 8V5a2 2 0 0 1 2-2h1" strokeLinecap="round" />
      <path d="M8 8h6l1 2v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10z" strokeLinejoin="round" />
      <path d="M15 6h3M16 4h2M14 9h2" strokeLinecap="round" />
    </svg>
  );
}

function Fridge() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <rect x="5" y="2.5" width="14" height="19" rx="1.6" strokeLinejoin="round" />
      <path d="M5 10h14" />
      <path d="M8 5.5v2M8 13v2.5" strokeLinecap="round" />
    </svg>
  );
}

function Sofa() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" strokeLinecap="round" />
      <path d="M3 12h18v4a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16z" strokeLinejoin="round" />
      <path d="M4 17.5V20M20 17.5V20" strokeLinecap="round" />
    </svg>
  );
}

function Wifi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M3.5 9a13 13 0 0 1 17 0" strokeLinecap="round" />
      <path d="M6.7 12.6a8.5 8.5 0 0 1 10.6 0" strokeLinecap="round" />
      <path d="M9.9 16.1a4 4 0 0 1 4.2 0" strokeLinecap="round" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Wrench() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path
        d="M14.7 6.3a4 4 0 0 0-5.4 4.9L3 17.5 5.5 20l6.3-6.3a4 4 0 0 0 4.9-5.4l-2.6 2.6-2.1-.6-.6-2.1z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Bug() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <rect x="8" y="8" width="8" height="10" rx="4" />
      <path d="M12 8V5M9 5l1.5 2M15 5l-1.5 2M4 11l3 1M20 11l-3 1M4 17l3-1M20 17l-3-1" strokeLinecap="round" />
    </svg>
  );
}

function Key() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l9 9M17 17l2-2M14 14l2-2" strokeLinecap="round" />
    </svg>
  );
}

function Calendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" strokeLinecap="round" />
      <path d="M8 14l2.5 2.5L16 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Chat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M4 5h16v11H9l-4 3.5V16H4z" strokeLinejoin="round" />
      <path d="M8 9.5l2 2 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Leaf() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M5 19c8 0 14-6 14-14-8 0-14 6-14 14z" strokeLinejoin="round" />
      <path d="M5 19c2-4 5-7 9-9" strokeLinecap="round" />
    </svg>
  );
}

function Gift() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <rect x="3.5" y="9" width="17" height="11" rx="1.4" strokeLinejoin="round" />
      <path d="M3.5 13h17M12 9v11" />
      <path d="M12 9C9 9 8 7.5 8 6a2 2 0 1 1 4 3zM12 9c3 0 4-1.5 4-3a2 2 0 1 0-4 3z" strokeLinejoin="round" />
    </svg>
  );
}

function Shield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Ladder() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M7 2v20M17 2v20" strokeLinecap="round" />
      <path d="M7 6h10M7 11h10M7 16h10" strokeLinecap="round" />
    </svg>
  );
}

function Bell() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10z" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  );
}

function Sun() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={COMMON}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" strokeLinecap="round" />
    </svg>
  );
}

const ICONS: Record<IconName, () => React.ReactElement> = {
  truck: Truck,
  box: Box,
  sparkle: Sparkle,
  spray: Spray,
  fridge: Fridge,
  sofa: Sofa,
  wifi: Wifi,
  wrench: Wrench,
  bug: Bug,
  key: Key,
  calendar: Calendar,
  chat: Chat,
  leaf: Leaf,
  gift: Gift,
  shield: Shield,
  ladder: Ladder,
  bell: Bell,
  sun: Sun,
};

export default function Icon({ name }: { name: IconName }) {
  const Component = ICONS[name];
  return <Component />;
}
