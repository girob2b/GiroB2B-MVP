/**
 * loading.tsx — /categoria/[slug]
 * Skeleton que espelha o grid de cards da categoria durante ISR revalidation
 * ou navegação RSC.
 */

function CardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 gap-3 animate-pulse">
      <div className="flex gap-1.5">
        <div className="h-5 w-20 rounded-full bg-slate-200" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-full rounded-lg bg-slate-200" />
        <div className="h-4 w-2/3 rounded-lg bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-2.5 w-12 rounded bg-slate-200" />
            <div className="h-3.5 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-slate-100 pt-3">
        <div className="h-3 w-24 rounded bg-slate-200" />
        <div className="h-3 w-16 rounded bg-slate-200" />
      </div>
    </div>
  );
}

export default function CategoriaLoading() {
  return (
    <div className="space-y-6">
      {/* breadcrumb + header skeleton */}
      <div className="space-y-2 animate-pulse">
        <div className="h-3.5 w-32 rounded bg-slate-200" />
        <div className="h-7 w-56 rounded-lg bg-slate-200" />
        <div className="h-4 w-40 rounded bg-slate-200" />
      </div>
      {/* cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
