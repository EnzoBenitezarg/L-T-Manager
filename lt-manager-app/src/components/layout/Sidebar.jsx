'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';
import { itemsDelNegocio, RUBROS } from '@/lib/navegacion';
import { itemsDelNegocioFiltrados, esAdmin, ROL_ETIQUETA } from '@/lib/permisos';

export default function Sidebar({ negocio, usuario, miembro }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = itemsDelNegocioFiltrados(itemsDelNegocio(negocio), miembro);
  const rubro = RUBROS.find((r) => r.key === negocio?.rubro);
  const esEmpleado = !!miembro && !esAdmin(miembro);

  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          <span>L</span>
        </div>
        <div className={styles.brandText}>
          <span className={styles.brandName}>L&T Manager</span>
          <span className={styles.brandSub}>{negocio?.nombre}</span>
        </div>
      </div>

      {/* Rubro */}
      <div className={styles.rubroBadge}>
        {rubro?.emoji} {rubro?.label}
      </div>

      {/* Usuario actual + cuenta demo */}
      {esEmpleado && miembro && (
        <div className={styles.demoBadge}>
          <span className={styles.demoPill}>{ROL_ETIQUETA[miembro.rol] || 'Empleado'}</span>
          <span className={styles.demoHint}>{usuario?.nombre}</span>
        </div>
      )}
      {usuario?.email === 'demo@ltmanager.com' && (
        <div className={styles.demoBadge}>
          <span className={styles.demoPill}>DEMO</span>
          <span className={styles.demoHint}>datos de ejemplo</span>
        </div>
      )}

      {/* Nav */}
      <nav className={styles.nav}>
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
              <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className={styles.navLabel}>{item.label}</span>
              {isActive && <span className={styles.activeBar} />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        {!esEmpleado && (
          <Link href="/home" className={styles.negociosLink}>
            Mis negocios
          </Link>
        )}
        <div className={styles.planBadge}>Plan {usuario?.plan}</div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
