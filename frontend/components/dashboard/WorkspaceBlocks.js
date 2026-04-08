export function MetricCards({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="card-grid">
      {items.map((item) => (
        <article className="metric-card" key={item.label}>
          <span>{item.label}</span>
          <strong style={{ color: item.color || "var(--ink)" }}>{item.value ?? "--"}</strong>
        </article>
      ))}
    </section>
  );
}

export function DataPanel({ title, badge, full = false, children }) {
  return (
    <article className="panel" style={full ? { gridColumn: "1 / -1" } : undefined}>
      <div className="panel-header">
        <h2>{title}</h2>
        {badge ? <span className="pill">{badge}</span> : null}
      </div>
      {children}
    </article>
  );
}

export function RowList({ items = [], empty = "No records found.", renderItem }) {
  return (
    <div className="table-stack">
      {items.length ? items.map(renderItem) : <p className="muted">{empty}</p>}
    </div>
  );
}

export function KeyValueRows({ items = [] }) {
  return (
    <div className="table-stack">
      {items.map((item) => (
        <div className="table-row" key={item.label}>
          <div>
            <strong>{item.label}</strong>
            {item.description ? <span>{item.description}</span> : null}
          </div>
          <strong style={{ color: item.color || "var(--ink)" }}>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}
