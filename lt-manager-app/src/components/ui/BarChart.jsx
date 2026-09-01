import styles from './BarChart.module.css';

// Gráfico de barras en SVG/CSS puro (sin dependencias).
// data: [{ label, value }]
export default function BarChart({ data = [], height = 220, className = '', formatearValor }) {
  if (!data.length) return null;
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const n = data.length;
  const barSlot = 100 / n;

  const fmt =
    formatearValor ||
    ((v) =>
      new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(v));

  return (
    <div className={`${styles.wrap} ${className}`}>
      {n <= 15 && (
        <div className={styles.values}>
          {data.map((d, i) => (
            <span key={i} className={styles.value} style={{ width: `${barSlot}%` }}>
              {fmt(d.value)}
            </span>
          ))}
        </div>
      )}
      <div className={styles.chartBox} style={{ height }}>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={styles.svg}>
          {data.map((d, i) => {
            const v = Number(d.value) || 0;
            const h = (v / max) * height;
            const y = height - h;
            return (
              <rect
                key={i}
                x={i * barSlot + barSlot * 0.14}
                y={y}
                width={barSlot * 0.72}
                height={h}
                className={styles.bar}
                rx={2}
              >
                <title>{`${d.label}: $${v.toLocaleString('es-AR')}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div className={styles.labels}>
        {data.map((d, i) => (
          <span
            key={i}
            className={styles.label}
            style={{ width: `${barSlot}%`, visibility: n <= 15 || i % 5 === 0 || i === n - 1 ? 'visible' : 'hidden' }}
          >
            {d.label.slice(8, 10)}
          </span>
        ))}
      </div>
    </div>
  );
}