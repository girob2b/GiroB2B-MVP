function Block({ className }: { className: string }) {
  return <div className={`rounded-xl bg-slate-200 animate-pulse ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Block className="h-7 w-44" />
          <Block className="h-4 w-64" />
        </div>
        <Block className="h-10 w-32" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-5 space-y-3">
            <Block className="h-4 w-24" />
            <Block className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Content card */}
      <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
        <Block className="h-5 w-36" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Block className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Block className="h-4 w-full max-w-xs" />
                <Block className="h-3 w-32" />
              </div>
              <Block className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="space-y-2">
        <Block className="h-7 w-44" />
        <Block className="h-4 w-72" />
      </div>
      <div className="rounded-2xl border border-border bg-white p-6 space-y-5">
        <Block className="h-5 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Block className="h-4 w-24" />
              <Block className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-white p-6 space-y-5">
        <Block className="h-5 w-28" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Block className="h-4 w-24" />
              <Block className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
