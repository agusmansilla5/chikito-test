type DayData = { label: string; entradas: number; salidas: number };

export function MovementsChart({ data }: { data: DayData[] }) {
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.entradas, d.salidas]));

  return (
    <div className="rounded-xl border border-zinc-200 bg-surface p-5 shadow-sm dark:border-zinc-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Movimientos — últimos 7 días</h2>
        <div className="flex items-center gap-4 text-xs text-foreground/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> Salidas
          </span>
        </div>
      </div>

      <div className="flex h-40 items-end gap-4 border-b border-zinc-100 dark:border-zinc-800">
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-32 w-full items-end justify-center gap-1">
              <div
                title={`Entradas: ${d.entradas}`}
                className="w-3 rounded-t bg-green-600"
                style={{ height: `${(d.entradas / maxVal) * 100}%`, minHeight: d.entradas > 0 ? 3 : 0 }}
              />
              <div
                title={`Salidas: ${d.salidas}`}
                className="w-3 rounded-t bg-red-600"
                style={{ height: `${(d.salidas / maxVal) * 100}%`, minHeight: d.salidas > 0 ? 3 : 0 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        {data.map((d) => (
          <div key={d.label} className="flex-1 pt-2 text-center text-xs capitalize text-foreground/60">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
