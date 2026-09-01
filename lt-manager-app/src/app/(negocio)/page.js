'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import styles from './page.module.css';

function StatCard({ label, value, icon, href }) {
  const content = (
    <Card className={styles.statCard}>
      <div className={styles.statIcon}>{icon}</div>
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
      .then((r) => r.json())
      .then((d) => { setStats(d); setLoading(false); });
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  })();

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.heroTitle}>
            {greeting} 👋
          </h1>
          <p className={styles.heroSub}>
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingGrid}>
          {[...Array(4)].map((_, i) => <div key={i} className={styles.skeleton} />)}
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <StatCard label="Clientes" value={stats.totalClientes} icon="👥" href="/clientes" />
            {stats.esRetail ? (
              <>
                <StatCard label="Ventas hoy" value={`$${stats.ventasHoy?.total.toFixed(2)}`} icon="💰" href="/ventas" />
                <StatCard label="Stock bajo" value={stats.stockBajo?.length || 0} icon="⚠️" href="/productos" />
              </>
            ) : (
              <>
                <StatCard label="Turnos hoy" value={stats.turnosHoy} icon="📅" href="/turnos" />
                <StatCard label="Pendientes hoy" value={stats.turnosPendientes} icon="⏳" href="/turnos" />
              </>
            )}
            <StatCard label="Servicios" value={stats.totalServicios} icon="✂️" href="/servicios" />
          </div>

          {stats.esRetail && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>💰 Caja de hoy</h2>
              <div className={styles.deudoresList}>
                <Card className={styles.deudorItem}>
                  <span className={styles.turnoCliente}>Ventas del día</span>
                  <span className={styles.turnoServicio}>${stats.ventasHoy?.total.toFixed(2)} ({stats.ventasHoy?.cantidad} operaciones)</span>
                </Card>
                <Card className={styles.deudorItem}>
                  <span className={styles.turnoCliente}>Gastos del día</span>
                  <span className={styles.turnoServicio}>${stats.gastosHoy.toFixed(2)}</span>
                </Card>
              </div>
            </div>
          )}

          {stats.membresia && (
            <div className={styles.memStatsGrid}>
              <div className={`${styles.memStat} ${styles.memOk}`}>
                <div className={styles.memValue}>{stats.membresia.activos}</div>
                <div className={styles.memLabel}>✅ Socios al día</div>
              </div>
              <div className={`${styles.memStat} ${styles.memWarn}`}>
                <div className={styles.memValue}>{stats.membresia.porVencer}</div>
                <div className={styles.memLabel}>⏳ Por vencer (≤3 días)</div>
              </div>
              <div className={`${styles.memStat} ${styles.memBad}`}>
                <div className={styles.memValue}>{stats.membresia.vencidos}</div>
                <div className={styles.memLabel}>⚠️ Vencidos</div>
              </div>
              <div className={styles.memStat}>
                <div className={styles.memValue}>{stats.totalClientes}</div>
                <div className={styles.memLabel}>👥 Total clientes</div>
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Próximos turnos</h2>
            {stats.proximosTurnos.length === 0 ? (
              <Card className={styles.emptyCard}>
                <p className={styles.emptyText}>No hay turnos pendientes próximos.</p>
                <Link href="/turnos" className={styles.emptyLink}>→ Agendar turno</Link>
              </Card>
            ) : (
              <div className={styles.turnosList}>
                {stats.proximosTurnos.map((t) => (
                  <Card key={t.id} className={styles.turnoItem}>
                    <div className={styles.turnoHora}>
                      {new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className={styles.turnoInfo}>
                      <span className={styles.turnoCliente}>{t.cliente?.nombre}</span>
                      <span className={styles.turnoServicio}>{t.servicio?.nombre}</span>
                    </div>
                    <Link href="/turnos" className={styles.turnoVerLink}>Ver →</Link>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {stats.deudores?.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>⏳ Deudores ({stats.deudores.length})</h2>
              <div className={styles.deudoresList}>
                {stats.deudores.map((t) => (
                  <Card key={t.id} className={styles.deudorItem}>
                    <span className={styles.turnoCliente}>{t.cliente?.nombre}</span>
                    <span className={styles.turnoServicio}>{t.servicio?.nombre}</span>
                    <Link href="/ventas" className={styles.turnoVerLink}>Cobrar →</Link>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {stats.stockBajo?.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>⚠️ Productos con stock bajo ({stats.stockBajo.length})</h2>
              <div className={styles.deudoresList}>
                {stats.stockBajo.map((p) => (
                  <Card key={p.id} className={styles.deudorItem}>
                    <span className={styles.turnoCliente}>{p.nombre}</span>
                    <span className={styles.turnoServicio}>Stock: {p.stock} / mín {p.stockMinimo}</span>
                    <Link href="/productos" className={styles.turnoVerLink}>Reponer →</Link>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {stats.totalClientes === 0 && (
            <Card className={styles.onboardingCard}>
              <div className={styles.onboardingIcon}>🚀</div>
              <h3 className={styles.onboardingTitle}>¡Empezá en 3 pasos!</h3>
              <div className={styles.onboardingSteps}>
                {stats.esRetail ? (
                  <Link href="/productos" className={styles.step}>
                    <span className={styles.stepNum}>1</span>
                    <div>
                      <div className={styles.stepTitle}>Cargá tus productos</div>
                      <div className={styles.stepDesc}>Agregá los productos y precios que vendés</div>
                    </div>
                  </Link>
                ) : (
                  <Link href="/servicios" className={styles.step}>
                    <span className={styles.stepNum}>1</span>
                    <div>
                      <div className={styles.stepTitle}>Configurá tus servicios</div>
                      <div className={styles.stepDesc}>Agregá los servicios y precios que ofrecés</div>
                    </div>
                  </Link>
                )}
                <Link href="/clientes" className={styles.step}>
                  <span className={styles.stepNum}>2</span>
                  <div>
                    <div className={styles.stepTitle}>Cargá tus clientes</div>
                    <div className={styles.stepDesc}>Agregá los clientes que ya tenés</div>
                  </div>
                </Link>
                {stats.esRetail ? (
                  <Link href="/ventas" className={styles.step}>
                    <span className={styles.stepNum}>3</span>
                    <div>
                      <div className={styles.stepTitle}>Registrá una venta</div>
                      <div className={styles.stepDesc}>Cobrá tu primera venta y empezá a manejar la caja</div>
                    </div>
                  </Link>
                ) : (
                  <Link href="/turnos" className={styles.step}>
                    <span className={styles.stepNum}>3</span>
                    <div>
                      <div className={styles.stepTitle}>Agendá un turno</div>
                      <div className={styles.stepDesc}>Creá tu primer turno y empezá a organizarte</div>
                    </div>
                  </Link>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
