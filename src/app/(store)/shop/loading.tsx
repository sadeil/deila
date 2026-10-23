import { ProductCardSkeleton } from "@/components/store/ProductCard";

export default function Loading() {
  return (
    <div className="container pb-24 pt-14" aria-busy="true">
      <div className="skeleton mb-12 h-14 w-72 rounded-xl" />
      <div className="grid gap-14 lg:grid-cols-[240px_1fr]">
        <div className="hidden space-y-3 lg:block">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6">
          {Array.from({ length: 6 }, (_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
