'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import BarChart from '@/components/ui/BarChart';
import { formatearMonto } from '@/lib/formato';
import styles from './page.module.css';

function StatCard({ label, value, icon, href, badge, tone }) {
  const content = (
    <Card className={styles.statCard}>
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
        {badge != null && (
          <span className={`${styles.badge} ${styles[tone] || styles.badgeFlat}`}>{badge}</span>
        )}
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </Card>
  );
  return href ? <Link href={href} className={styles.statLink}>{content}</Link> : content;
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || 'Error al cargar el panel');
        setStats({
          ...d,
          proximosTurnos: Array.isArray(d.proximosTurnos) ? d.proximosTurnos : [],
          deudores: Array.isArray(d.deudores) ? d.deudores : [],
          stockBajo: Array.isArray(d.stockBajo) ? d.stockBajo : [],
          top: Array.isArray(d.top) ? d.top : [],
          series30: Array.isArray(d.series30) ? d.series30 : [],
          ventasHoy: d.ventasHoy || { cantidad: 0, total: 0 },
          ingresos: d.ingresos || {},
          gastosHoy: Number(d.gastosHoy) || 0,
          totalClientes: Number(d.totalClientes) || 0,
        });
        setLoading(false);
      })
      .catch(() => {
        setStats({
          esRetail: false,
          proximosTurnos: [],
          deudores: [],
          stockBajo: [],
          top: [],
          series30: [],
          ventasHoy: { cantidad: 0, total: 0 },
          ingresos: {},
          gastosHoy: 0,
          totalClientes: 0,
        });
        setLoading(false);
      });
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  const ing = stats?.ingresos || {};
  const vsActual = ing.vsMesAnterior;

  let badgeText = null;
  let badgeTone = 'badgeFlat';
  let changeTone = 'changeFlat';
  if (typeof vsActual === 'number') {
    if (vsActual > 0) { badgeText = `▲ ${vsActual}%`; badgeTone = 'badgeUp'; changeTone = 'changeUp'; }
    else if (vsActual < 0) { badgeText = `▼ ${Math.abs(vsActual)}%`; badgeTone = 'badgeDown'; changeTone = 'changeDown'; }
    else { badgeText = '0%'; }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>{greeting} 👋</h1>
        <p className={styles.heroSub}>
          {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <>
          <div className={styles.loadingGrid}>
            {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
          <div className={styles.skeleton} style={{ height: 260 }} />
        </>
      ) : (
        <>
          {/* KPIs adaptados al rubro */}
          <div className={styles.statsGrid}>
            <StatCard
              label="Ingresos del mes"
              value={formatearMonto(ing.mes)}
              icon="💰"
              badge={badgeText}
              tone={badgeTone}
              href="/reportes"
            />
            <StatCard label="Clientes" value={stats.totalClientes} icon="👥" href="/clientes" />
            {stats.esRetail ? (
              <>
                <StatCard label="Ventas hoy" value={formatearMonto(stats.ventasHoy?.total)} icon="🛍️" href="/ventas" />
                <StatCard label="Stock bajo" value={stats.stockBajo?.length || 0} icon="⚠️" href="/productos" />
              </>
            ) : (
              <>
                <StatCard label="Turnos hoy" value={stats.turnosHoy} icon="📅" href="/turnos" />
                <StatCard label="Pendientes hoy" value={stats.turnosPendientes} icon="⏳" href="/turnos" />
              </>
            )}
          </div>

          {/* Columna izquierda */}
          <div className={styles.colIzq}>
          {/* Gráfico de ingresos últimos 30 días */}
          <Card className={`${styles.mainCard} ${styles.secChart}`}>
            <div className={styles.chartHeader}>
              <div className={styles.chartTitleGroup}>
                <h2 className={styles.sectionTitle}>Ingresos últimos 30 días</h2>
                <p className={styles.chartSub}>
                  {formatearMonto(ing.ultimos30)} en total · {formatearMonto(ing.mesAnterior)} el mes pasado
                </p>
              </div>
              <div className={styles.chartStat}>
                <span className={styles.chartStatValue}>+{formatearMonto(ing.ultimos30)}</span>
                <span className={`${styles.chartStatChange} ${styles[changeTone]}`}>
                  {badgeText ? `${badgeText} vs mes anterior` : ''}
                </span>
              </div>
            </div>

            <BarChart data={stats.series30} height={220} />

            <div className={styles.chartMiniRow}>
              <div className={styles.chartMini}>
                <span className={styles.chartMiniValue}>{formatearMonto(ing.hoy)}</span>
                <span className={styles.chartMiniLabel}>Hoy</span>
              </div>
              <div className={styles.chartMini}>
                <span className={styles.chartMiniValue}>{formatearMonto(ing.promedioDiario)}</span>
                <span className={styles.chartMiniLabel}>Promedio diario</span>
              </div>
              <div className={styles.chartMini}>
                <span className={styles.chartMiniValue}>{formatearMonto(ing.mejorDia)}</span>
                <span className={styles.chartMiniLabel}>Mejor día</span>
              </div>
            </div>
          </Card>

          {/* Ranking por rubro */}
          {stats.top?.length > 0 && (
            <div className={`${styles.section} ${styles.secTop}`}>
              <h2 className={styles.sectionTitle}>
                {stats.esRetail ? '🛍️ Top productos' : '🏆 Top servicios'}
              </h2>
              <div className={styles.topList}>
                {stats.top.map((t, i) => (
                  <Card key={t.id ?? t.nombre} className={styles.topItem}>
                    <span className={`${styles.topRank} ${i === 0 ? styles.topRankFirst : ''}`}>{i + 1}</span>
                    <div className={styles.topInfo}>
                      <span className={styles.topName}>{t.nombre}</span>
                      <span className={styles.topCount}>{t.cantidad} {stats.esRetail ? 'vendidos' : 'cobros'}</span>
                    </div>
                    <span className={styles.topTotal}>{formatearMonto(t.total)}</span>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Membresías (gimnasio) */}
          {stats.membresia && (
            <div className={`${styles.memStatsGrid} ${styles.secMem}`}>
              <div className={`${styles.memStat} ${styles.memOk}`}>
                <span className={styles.memValue}>{stats.membresia.activos}</span>
                <span className={styles.memLabel}>✅ Socios al día</span>
              </div>
              <div className={`${styles.memStat} ${styles.memWarn}`}>
                <span className={styles.memValue}>{stats.membresia.porVencer}</span>
                <span className={styles.memLabel}>⏳ Por vencer</span>
              </div>
              <div className={`${styles.memStat} ${styles.memBad}`}>
                <span className={styles.memValue}>{stats.membresia.vencidos}</span>
                <span className={styles.memLabel}>⚠️ Vencidos</span>
              </div>
              <div className={styles.memStat}>
                <span className={styles.memValue}>{stats.totalClientes}</span>
                <span className={styles.memLabel}>👥 Total clientes</span>
              </div>
            </div>
          )}
          </div>

          {/* Columna derecha */}
          <div className={styles.colDer}>
          {/* Caja de hoy (retail) */}
          {stats.esRetail && (
            <div className={`${styles.section} ${styles.secCaja}`}>
              <h2 className={styles.sectionTitle}>Caja de hoy</h2>
              <div className={styles.deudoresList}>
                <Card className={styles.listItem}>
                  <span className={styles.listCliente}>Ventas del día</span>
                  <span className={styles.listServicio}>{formatearMonto(stats.ventasHoy?.total)}</span>
                </Card>
                <Card className={styles.listItem}>
                  <span className={styles.listCliente}>Gastos del día</span>
                  <span className={styles.listServicio}>{formatearMonto(stats.gastosHoy)}</span>
                </Card>
              </div>
            </div>
          )}

          {/* Próximos turnos */}
          {!stats.esRetail && (
            <div className={`${styles.section} ${styles.secTurnos}`}>
              <h2 className={styles.sectionTitle}>Próximos turnos</h2>
              {stats.proximosTurnos.length === 0 ? (
                <Card className={styles.emptyCard}>
                  <p className={styles.emptyText}>No hay turnos pendientes próximos.</p>
                  <Link href="/turnos" className={styles.emptyLink}>→ Agendar turno</Link>
                </Card>
              ) : (
                <div className={styles.turnosList}>
                  {stats.proximosTurnos.map((t) => (
                    <Card key={t.id} className={styles.listItem}>
                      <div className={styles.listHora}>
                        {new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className={styles.listInfo}>
                        <span className={styles.listCliente}>{t.cliente?.nombre}</span>
                        <span className={styles.listServicio}>{t.servicio?.nombre}</span>
                      </div>
                      <Link href="/turnos" className={styles.listLink}>Ver →</Link>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Deudores */}
          {stats.deudores?.length > 0 && (
            <div className={`${styles.section} ${styles.secDeudores}`}>
              <h2 className={styles.sectionTitle}>Deudores ({stats.deudores.length})</h2>
              <div className={styles.deudoresList}>
                {stats.deudores.map((t) => (
                  <Card key={t.id} className={styles.listItem}>
                    <div className={styles.listInfo}>
                      <span className={styles.listCliente}>{t.cliente?.nombre}</span>
                      <span className={styles.listServicio}>{t.servicio?.nombre}</span>
                    </div>
                    <Link href="/ventas" className={styles.listLink}>Cobrar →</Link>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Stock bajo */}
          {stats.stockBajo?.length > 0 && (
            <div className={`${styles.section} ${styles.secStock}`}>
              <h2 className={styles.sectionTitle}>Productos con stock bajo ({stats.stockBajo.length})</h2>
              <div className={styles.deudoresList}>
                {stats.stockBajo.map((p) => (
                  <Card key={p.id} className={styles.listItem}>
                    <div className={styles.listInfo}>
                      <span className={styles.listCliente}>{p.nombre}</span>
                      <span className={styles.listServicio}>Stock: {p.stock} / mín {p.stockMinimo}</span>
                    </div>
                    <Link href="/productos" className={styles.listLink}>Reponer →</Link>
                  </Card>
                ))}
              </div>
            </div>
          )}
          </div>

          {/* Onboarding */}
          {stats.totalClientes === 0 && (
            <Card className={styles.onboardingCard}>
              <div className={styles.onboardingIcon}>🚀</div>
              <h3 className={styles.onboardingTitle}>¡Empezá en 3 pasos!</h3>
              <div className={styles.onboardingSteps}>
                <Link href={stats.esRetail ? '/productos' : '/servicios'} className={styles.step}>
                  <span className={styles.stepNum}>1</span>
                  <div>
                    <div className={styles.stepTitle}>{stats.esRetail ? 'Cargá tus productos' : 'Configurá tus servicios'}</div>
                    <div className={styles.stepDesc}>Agregá lo que ofrecés con sus precios</div>
                  </div>
                </Link>
                <Link href="/clientes" className={styles.step}>
                  <span className={styles.stepNum}>2</span>
                  <div>
                    <div className={styles.stepTitle}>Cargá tus clientes</div>
                    <div className={styles.stepDesc}>Agregá los clientes que ya tenés</div>
                  </div>
                </Link>
                <Link href={stats.esRetail ? '/ventas' : '/turnos'} className={styles.step}>
                  <span className={styles.stepNum}>3</span>
                  <div>
                    <div className={styles.stepTitle}>{stats.esRetail ? 'Registrá una venta' : 'Agendá un turno'}</div>
                    <div className={styles.stepDesc}>{stats.esRetail ? 'Cobrá tu primera venta' : 'Creá tu primer turno'}</div>
                  </div>
                </Link>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
