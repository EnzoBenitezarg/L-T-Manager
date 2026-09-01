'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import BarChart from '@/components/ui/BarChart';
import styles from './reportes.module.css';

const TABS = [
  { key: 'ventas', label: '📈 Ventas 30 días' },
  { key: 'servicios', label: '✂️ Servicios' },
  { key: 'productos', label: '🛍️ Productos' },
  { key: 'comisiones', label: '🤝 Comisiones' },
];

export default function ReportesPage() {
  const [tab, setTab] = useState('ventas');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/reportes');
      const d = await res.json();
      if (res.ok) setData(d);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fechaCorta = (fecha) =>
    new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

  let mejorDia = null;
  if (data) {
    mejorDia = data.series30.reduce((a, b) => (b.value > (a?.value || 0) ? b : a), null);
  }

  const topRow = (t, i, max, unidad) => {
    const pct = max > 0 ? Math.round((t.total / max) * 100) : 0;
    return (
      <div key={`${t.nombre}-${i}`} className={styles.topRow}>
        <span className={styles.topRank}>{i + 1}</span>
        <div className={styles.topInfo}>
          <div className={styles.topNombre}>{t.nombre}</div>
          <div className={styles.topTrack}>
            <div className={styles.topBar} style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className={styles.topDatos}>
          <div className={styles.topTotal}>${t.total.toLocaleString('es-AR')}</div>
          <div className={styles.topCant}>
            {t.cantidad.toLocaleString('es-AR')} {unidad}
            {t.cantidad !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <PageHeader title="Reportes" subtitle="Entendé cómo le va a tu negocio de un vistazo" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : !data ? (
        <div className={styles.empty}>No se pudieron cargar los reportes.</div>
      ) : tab === 'ventas' ? (
        <>
          <div className={styles.chips}>
            <Card className={styles.chip}>
              <span className={styles.chipLabel}>Ingresos 30 días</span>
              <span className={styles.chipValue}>${data.stats.total.toLocaleString('es-AR')}</span>
            </Card>
            <Card className={styles.chip}>
              <span className={styles.chipLabel}>Promedio diario</span>
              <span className={styles.chipValue}>${Math.round(data.stats.promedio).toLocaleString('es-AR')}</span>
            </Card>
            <Card className={styles.chip}>
              <span className={styles.chipLabel}>Días con ventas</span>
              <span className={styles.chipValue}>{data.stats.conVentas} de 30</span>
            </Card>
            <Card className={styles.chip}>
              <span className={styles.chipLabel}>Mejor día</span>
              <span className={styles.chipValue}>
                {mejorDia?.value ? `${fechaCorta(mejorDia.label)} · $${mejorDia.value.toLocaleString('es-AR')}` : '—'}
              </span>
            </Card>
          </div>
          <Card className={styles.chartCard}>
            <div className={styles.chartTitle}>Ingresos de los últimos 30 días</div>
            {data.stats.total === 0 ? (
              <div className={styles.empty} style={{ padding: '2.5rem 0' }}>
                Todavía no hay ventas registradas.
              </div>
            ) : (
              <BarChart data={data.series30} height={240} />
            )}
          </Card>
        </>
      ) : tab === 'servicios' ? (
        <Card className={styles.topCard}>
          <div className={styles.chartTitle}>Servicios más cobrados</div>
          {data.topServicios.length === 0 ? (
            <div className={styles.empty} style={{ padding: '2.5rem 0' }}>
              Todavía no hay cobros de servicios.
            </div>
          ) : (
            data.topServicios.map((s, i) => topRow(s, i, data.topServicios[0]?.total, 'cobro'))
          )}
        </Card>
      ) : tab === 'comisiones' ? (
        <div className={styles.comisiones}>
          {data.comisiones.length === 0 ? (
            <Card className={styles.empty} style={{ padding: '2.5rem 0' }}>
              Todavía no hay comisiones de profesionales (asigná profesionales a los turnos y cobralos).
            </Card>
          ) : (
            data.comisiones.map((c) => {
              const max = Math.max(...data.comisiones.map((x) => x.comision), 1);
              return (
                <Card key={c.id} className={styles.comisionCard}>
                  <span className={styles.comisionDot} style={{ background: c.color }} />
                  <div className={styles.comisionInfo}>
                    <div className={styles.comisionNombre}>{c.nombre}</div>
                    <div className={styles.comisionMeta}>{c.cantidad} cobros · base ${c.base.toLocaleString('es-AR')}</div>
                    <div className={styles.comisionTrack}>
                      <div className={styles.comisionBar} style={{ width: `${Math.max(3, Math.round((c.comision / max) * 100))}%` }} />
                    </div>
                    <div className={styles.comisionDetalle}>
                      <span>Comisión ${c.comision.toLocaleString('es-AR')}</span>
                      <span>Propinas ${c.propina.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      ) : (
        <Card className={styles.topCard}>
          <div className={styles.chartTitle}>Productos más vendidos</div>
          {data.topProductos.length === 0 ? (
            <div className={styles.empty} style={{ padding: '2.5rem 0' }}>
              Todavía no hay ventas de productos.
            </div>
          ) : (
            data.topProductos.map((p, i) => topRow(p, i, data.topProductos[0]?.total, 'unidad'))
          )}
        </Card>
      )}
    </div>
  );
}