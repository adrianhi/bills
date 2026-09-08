export function LoadingSummaryCards() {
  return (
    <div
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      aria-label="Cargando resumen"
    >
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted" />
      ))}
    </div>
  );
}
