import Link from "next/link";

export default function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-5 py-3 backdrop-blur md:hidden">
      <Link
        href="/zipservice/new"
        className="flex w-full items-center justify-center rounded-full bg-brand-red px-6 py-3 text-sm font-semibold text-white shadow-brand"
      >
        무료 견적 받기
      </Link>
    </div>
  );
}
