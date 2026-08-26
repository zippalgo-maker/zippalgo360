export default function CompanyLogo({
  name,
  gradient,
  className = "h-14 w-14 text-xl",
}: {
  name: string;
  gradient: [string, string];
  className?: string;
}) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-2xl font-extrabold text-white ${className}`}
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})` }}
    >
      {name.slice(0, 1)}
    </span>
  );
}
