export default function PipelineLoading() {
  return (
    <div className="flex flex-col h-full min-h-[calc(100vh-8rem)]">
      {/* Header — espelho exato do page.tsx para evitar salto visual */}
      <div className="mb-6 shrink-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pipeline Comercial</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organize seus contatos e negociações em andamento. Arraste os cards entre as colunas.
        </p>
      </div>

      {/* Board skeleton — colunas com aparência de kanban */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="w-72 shrink-0 flex flex-col rounded-2xl border border-slate-200 bg-white"
            >
              {/* Header da coluna */}
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-3.5 w-24 rounded bg-slate-200 animate-pulse" />
                <div className="ml-auto h-5 w-6 rounded-full bg-slate-100 animate-pulse" />
              </div>
              {/* Cards placeholder */}
              <div className="p-3 space-y-2">
                {Array.from({ length: i % 2 === 0 ? 3 : 2 }).map((__, j) => (
                  <div
                    key={j}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2 animate-pulse"
                  >
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-2.5 bg-slate-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
