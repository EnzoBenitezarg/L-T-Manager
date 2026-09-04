'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import styles from './Sidebar.module.css';
import { itemsDelNegocio, RUBROS } from '@/lib/navegacion';
import { itemsDelNegocioFiltrados, esAdmin, ROL_ETIQUETA } from '@/lib/permisos';

function useMobile() {
  const [esMobile, setEsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setEsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return esMobile;
}

export default function Sidebar({ negocio, usuario, miembro }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = itemsDelNegocioFiltrados(itemsDelNegocio(negocio), miembro);
  const rubro = RUBROS.find((r) => r.key === negocio?.rubro);
  const esEmpleado = !!miembro && !esAdmin(miembro);
  const esMobile = useMobile();
  const [masAbierto, setMasAbierto] = useState(false);

  // En mobile: 5 módulos a la vista, el resto en "Más"
  const MAX_VISIBLES = 6;
  let navItems = items;
  let masItems = [];
  if (esMobile && items.length > MAX_VISIBLES) {
    navItems = items.slice(0, MAX_VISIBLES - 1);
    masItems = items.slice(MAX_VISIBLES - 1);
  }

  function handleLogout() {
    setMasAbierto(false);
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      router.push('/login');
      router.refresh();
    });
  }

  function renderNavItem(item) {
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
    return (
      <Link key={item.href} href={item.href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}
        onClick={() => setMasAbierto(false)}>
        <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
        </svg>
        <span className={styles.navLabel}>{item.label}</span>
        {isActive && <span className={styles.activeBar} />}
      </Link>
    );
  }

  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand}>
        <div className={styles.brandMark}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="" className={styles.brandLogo} />
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
        {navItems.map(renderNavItem)}
        {masItems.length > 0 && (
          <button className={`${styles.navItem} ${styles.masBtn}`} onClick={() => setMasAbierto(true)} aria-label="Ver más secciones">
            <svg className={styles.navIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
            <span className={styles.navLabel}>Más</span>
          </button>
        )}
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

      {/* Menú "Más" (mobile) */}
      {masAbierto && (
        <div className={styles.masOverlay} onClick={() => setMasAbierto(false)} role="dialog" aria-modal="true">
          <div className={styles.masPanel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.masHeader}>
              <span className={styles.masTitle}>Todas las secciones</span>
              <button className={styles.masClose} onClick={() => setMasAbierto(false)} aria-label="Cerrar">✕</button>
            </div>
            <nav className={styles.masNav}>
              {masItems.map(renderNavItem)}
            </nav>
            <div className={styles.masFooter}>
              {!esEmpleado && (
                <Link href="/home" className={styles.negociosLink} onClick={() => setMasAbierto(false)}>
                  Mis negocios
                </Link>
              )}
              <button onClick={handleLogout} className={styles.logoutBtn}>
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
