import PhotoCard from "@/components/lifestyle/PhotoCard";
import type { PhotoCardItem } from "@/lib/mock-content";

export default function PhotoCardGrid({ items, cols = 6 }: { items: PhotoCardItem[]; cols?: 4 | 6 }) {
  const colsClass = cols === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-6";
  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-6 ${colsClass}`}>
      {items.map((item) => (
        <PhotoCard key={item.title} {...item} />
      ))}
    </div>
  );
}
