'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../auth.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  async function handleDemo() {
    setError('');
    setDemoLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@ltmanager.com', password: 'demo1234' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo entrar a la demo');
        setDemoLoading(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Error de conexión');
      setDemoLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo iniciar sesión');
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
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>L</div>
          <h1 className={styles.title}>L&T Manager</h1>
          <p className={styles.subtitle}>Iniciá sesión en tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
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
          <label className={styles.label}>
            Contraseña
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className={styles.switchText}>
          ¿No tenés cuenta? <Link href="/registro" className={styles.switchLink}>Crear cuenta</Link>
        </p>

        <div className={styles.demoBox}>
          <div className={styles.demoDivider}>o probá la demo</div>
          <button type="button" className={styles.demoBtn} onClick={handleDemo} disabled={loading || demoLoading}>
            {demoLoading ? 'Cargando demo...' : '🚀 Probar la demo'}
          </button>
          <p className={styles.demoHint}>Entrás con un negocio de ejemplo, sin registrarte.</p>
        </div>
      </div>
    </div>
  );
}
