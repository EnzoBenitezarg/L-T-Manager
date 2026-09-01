'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';
import { RUBROS } from '@/lib/navegacion';

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [negocioNombre, setNegocioNombre] = useState('');
  const [rubro, setRubro] = useState('BARBERIA');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, negocioNombre, rubro }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo crear la cuenta');
        setLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  }

  return (
    <div className={styles.center}>
      <div className={styles.cardWide}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>L</div>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.subtitle}>Empezá a organizar tu negocio</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid2}>
            <label className={styles.label}>
              Tu nombre
              <input
                className={styles.input}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Juan"
                required
              />
            </label>
            <label className={styles.label}>
              Email
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </label>
          </div>

          <label className={styles.label}>
            Contraseña
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </label>

          <label className={styles.label}>
            Nombre de tu negocio
            <input
              className={styles.input}
              value={negocioNombre}
              onChange={(e) => setNegocioNombre(e.target.value)}
              placeholder="Ej: Barbería de Juan"
              required
            />
          </label>

          <label className={styles.label}>Rubro del negocio</label>
          <div className={styles.rubros}>
            {RUBROS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`${styles.rubroBtn} ${rubro === r.key ? styles.rubroBtnActive : ''}`}
                onClick={() => setRubro(r.key)}
              >
                <span>{r.emoji}</span> {r.label}
              </button>
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Creando...' : 'Crear cuenta'}
          </button>
        </form>

        <p className={styles.switchText}>
          ¿Ya tenés cuenta? <Link href="/login" className={styles.switchLink}>Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
