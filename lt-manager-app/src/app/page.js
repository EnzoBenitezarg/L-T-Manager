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
            <StatCard label="Turnos hoy" value={stats.turnosHoy} icon="📅" href="/turnos" />
            <StatCard label="Pendientes hoy" value={stats.turnosPendientes} icon="⏳" href="/turnos" />
            <StatCard label="Servicios" value={stats.totalServicios} icon="✂️" href="/servicios" />
          </div>

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

          {stats.totalClientes === 0 && (
            <Card className={styles.onboardingCard}>
              <div className={styles.onboardingIcon}>🚀</div>
              <h3 className={styles.onboardingTitle}>¡Empezá en 3 pasos!</h3>
              <div className={styles.onboardingSteps}>
                <Link href="/servicios" className={styles.step}>
                  <span className={styles.stepNum}>1</span>
                  <div>
                    <div className={styles.stepTitle}>Configurá tus servicios</div>
                    <div className={styles.stepDesc}>Agregá los servicios y precios que ofrecés</div>
                  </div>
                </Link>
                <Link href="/clientes" className={styles.step}>
                  <span className={styles.stepNum}>2</span>
                  <div>
                    <div className={styles.stepTitle}>Cargá tus clientes</div>
                    <div className={styles.stepDesc}>Agregá los clientes que ya tenés</div>
                  </div>
                </Link>
                <Link href="/turnos" className={styles.step}>
                  <span className={styles.stepNum}>3</span>
                  <div>
                    <div className={styles.stepTitle}>Agendá un turno</div>
                    <div className={styles.stepDesc}>Creá tu primer turno y empezá a organizarte</div>
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
