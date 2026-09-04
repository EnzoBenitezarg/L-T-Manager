import { useMemo } from 'react';
import styles from './BarChart.module.css';

export default function BarChart({
  data = [],
  height = 200,
  className = '',
  formatearValor,
  formatearEje,
}) {
  const { max, points } = useMemo(() => {
    const vals = data.map((d) => Number(d.value) || 0);
    const m = vals.length ? Math.max(...vals) : 0;
    // Redondeo "limpio" del máximo para que el grid quede lindo
    const cleanMax = m <= 0 ? 100 : Math.ceil(m / 100) * 100;
    return { max: cleanMax, points: data.map((d, i) => ({ ...d, i, v: vals[i] })) };
  }, [data]);

  if (!data.length) return null;

  const n = points.length;
  const slot = 100 / n;
  const gridLines = 4;

  const fmtValor =
    formatearValor ||
    ((v) =>
      new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(v));

  const fmtEje =
    formatearEje ||
    ((label, i) => {
      // Etiqueta de día (últimos 2 chars del YYYY-MM-DD) en posiciones dispersas
      if (n > 14) {
        const step = Math.ceil(n / 6);
        return i % step === 0 || i === n - 1 ? label.slice(8, 10) : '';
      }
      return label.slice(8, 10);
    });

  return (
    <div className={`${styles.wrap} ${className}`}>
      <div className={styles.chartBox} style={{ height }}>
        {Array.from({ length: gridLines + 1 }).map((_, g) => {
          const gy = (g / gridLines) * height;
          const gv = (max / gridLines) * (gridLines - g);
          return (
            <div key={g} className={styles.gridLine} style={{ top: gy }}>
              <span className={styles.gridValue}>{fmtValor(gv)}</span>
            </div>
          );
        })}
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={styles.svg}>
          {points.map((d, i) => {
            const h = (d.v / max) * height;
            const y = height - h;
            const bw = slot * 0.6;
            const hasValue = d.v > 0;
            return (
              <rect
                key={i}
                x={i * slot + (slot - bw) / 2}
                y={hasValue ? y : height - 2}
                width={bw}
                height={hasValue ? h : 2}
                rx={2}
                className={hasValue ? styles.bar : styles.barEmpty}
              >
                <title>{`${d.label}: $${d.v.toLocaleString('es-AR')}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      <div className={styles.labels}>
        {points.map((d, i) => (
          <div key={i} className={styles.slot} style={{ width: `${slot}%` }}>
            <span className={styles.label}>{fmtEje(d.label, i)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
