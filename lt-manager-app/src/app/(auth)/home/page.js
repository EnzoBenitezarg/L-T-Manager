'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './home.module.css';
import { RUBROS } from '@/lib/navegacion';

export default function HomePage() {
  const router = useRouter();
  const [negocios, setNegocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nombre, setNombre] = useState('');
  const [rubro, setRubro] = useState('BARBERIA');
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    fetch('/api/negocios')
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setNegocios(d);
        setLoading(false);
      });
  }, []);

  async function seleccionar(id) {
    const res = await fetch(`/api/negocios/${id}`, { method: 'POST' });
    if (res.ok) {
      router.push('/');
      router.refresh();
    }
  }

  async function crearNegocio(e) {
    e.preventDefault();
    setError('');
    setCreando(true);
    try {
      const res = await fetch('/api/negocios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, rubro }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo crear el negocio');
        setCreando(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Error de conexión');
      setCreando(false);
    }
  }

  function logout() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => router.push('/login'));
  }

  if (loading) return <div className={styles.page}>Cargando...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoMark}>L</div>
          <h1 className={styles.title}>Tus negocios</h1>
        </div>
        <button className={styles.logout} onClick={logout}>Cerrar sesión</button>
      </header>

      <div className={styles.grid}>
        {negocios.map((n) => {
          const rubroInfo = RUBROS.find((r) => r.key === n.rubro);
          const rol = n.rolMiembro === 'DUENIO' || n.esDueño ? null : n.rolMiembro;
          return (
            <button key={n.id} className={styles.card} onClick={() => seleccionar(n.id)}>
              <div className={styles.cardEmoji}>{rubroInfo?.emoji || '🏪'}</div>
              <div className={styles.cardNombre}>{n.nombre}</div>
              <div className={styles.cardRubro}>
                {rubroInfo?.label || n.rubro}
                {rol && <span className={styles.rolBadge}>{rol === 'EMPLEADO' ? 'Empleado' : 'Encargado'}</span>}
              </div>
              <div className={styles.entrar}>Entrar →</div>
            </button>
          );
        })}

        {negocios.some((n) => n.esDueño) && (
          <button className={`${styles.card} ${styles.newCard}`} onClick={() => setShowForm(!showForm)}>
            <div className={styles.cardEmoji}>＋</div>
            <div className={styles.cardNombre}>Nuevo negocio</div>
            <div className={styles.cardRubro}>Crear otro</div>
          </button>
        )}
      </div>

      {showForm && (
        <form className={styles.form} onSubmit={crearNegocio}>
          <h2 className={styles.formTitle}>Crear nuevo negocio</h2>
          <label className={styles.label}>
            Nombre
            <input
              className={styles.input}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del negocio"
              required
            />
          </label>
          <label className={styles.label}>Rubro</label>
          <div className={styles.rubros}>
            {RUBROS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`${styles.rubroBtn} ${rubro === r.key ? styles.rubroBtnActive : ''}`}
                onClick={() => setRubro(r.key)}
              >
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.button} disabled={creando}>
            {creando ? 'Creando...' : 'Crear negocio'}
          </button>
        </form>
      )}
    </div>
  );
}
