'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import styles from './EquipoPanel.module.css';

const COLORES = ['#c97b2f', '#2a9d6f', '#3b82c4', '#8b5cf6', '#d4861a', '#c0392b', '#0e9aab'];

const ROLES_OPCIONES = [
  { key: 'EMPLEADO', label: 'Empleado', desc: 'Opera agenda, cobros y clientes' },
  { key: 'ADMIN', label: 'Encargado', desc: 'Además administra config y reportes' },
];

export default function EquipoPanel() {
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    nombre: '', email: '', password: '', rol: 'EMPLEADO', porcentajeComision: '0', color: COLORES[0],
  });

  const fetchMiembros = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/miembros');
    setMiembros(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchMiembros(); }, [fetchMiembros]);

  const showMsg = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(''), 2500);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.email.trim() || form.password.length < 6) {
      setError('Completá nombre, email y una contraseña de al menos 6 caracteres');
      return;
    }
    setError('');
    try {
      const res = await fetch('/api/miembros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          email: form.email.trim(),
          password: form.password,
          rol: form.rol,
          porcentajeComision: Number(form.porcentajeComision) || 0,
          color: form.color,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo agregar');
        return;
      }
      setMiembros((prev) => [...prev, data].sort((a, b) => (a.activo === b.activo ? 0 : a.activo ? -1 : 1)));
      setAdding(false);
      setForm({ nombre: '', email: '', password: '', rol: 'EMPLEADO', porcentajeComision: '0', color: COLORES[0] });
      showMsg(`✅ ${data.nombre} se sumó al equipo`);
    } catch {
      setError('Error de conexión');
    }
  };

  const handlePatch = async (id, data) => {
    const res = await fetch(`/api/miembros/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'No se pudo actualizar');
      return;
    }
    const actualizado = await res.json();
    setMiembros((prev) => prev.map((m) => (m.id === id ? actualizado : m)));
  };

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Quitar a ${nombre} del equipo? Sus turnos quedan pero ya no podrá entrar.`)) return;
    const res = await fetch(`/api/miembros/${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || 'No se pudo quitar');
      return;
    }
    setMiembros((prev) => prev.filter((m) => m.id !== id));
    showMsg('Miembro quitado');
  };

  const setPct = (m, value) => {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    handlePatch(m.id, { porcentajeComision: pct });
    setMiembros((prev) => prev.map((x) => (x.id === m.id ? { ...x, porcentajeComision: pct } : x)));
  };

  return (
    <div className={styles.panel}>
      <p className={styles.hint}>
        Cada profesional puede entrar con su propio usuario. Su color y comisión se usan en la agenda y los reportes.
      </p>

      {msg && <div className={styles.msg}>{msg}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {loading ? (
          <div className={styles.empty}>Cargando equipo...</div>
        ) : miembros.length === 0 ? (
          <div className={styles.empty}>Todavía no hay equipo. Agregá a tus profesionales para ver la agenda por columna.</div>
        ) : (
          miembros.map((m) => (
            <div key={m.id} className={`${styles.row} ${m.activo ? '' : styles.inactivo}`}>
              <span className={styles.dot} style={{ background: m.color }} />
              <div className={styles.info}>
                <div className={styles.nombre}>{m.nombre}</div>
                <div className={styles.email}>{m.email}</div>
              </div>

              {m.rol !== 'DUENIO' ? (
                <select
                  className={styles.select}
                  value={m.rol}
                  onChange={(e) => handlePatch(m.id, { rol: e.target.value })}
                >
                  {ROLES_OPCIONES.map((r) => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
              ) : (
                <span className={styles.duenio}>Dueño</span>
              )}

              <div className={styles.comision}>
                <label className={styles.comisionLabel}>% comisión</label>
                <div className={styles.comisionInput}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={m.porcentajeComision ?? 0}
                    onChange={(e) => setPct(m, e.target.value)}
                    className={styles.pct}
                    disabled={!m.activo}
                  />
                  <span>%</span>
                </div>
              </div>

              <div className={styles.actions}>
                <select
                  className={styles.selectColor}
                  value={m.color}
                  onChange={(e) => handlePatch(m.id, { color: e.target.value })}
                  title="Color en la agenda"
                >
                  {COLORES.map((c) => (
                    <option key={c} value={c}>● {c}</option>
                  ))}
                </select>
                {m.rol !== 'DUENIO' ? (
                  <>
                    <button
                      className={styles.toggle}
                      title={m.activo ? 'Desactivar (no podrá entrar)' : 'Activar'}
                      onClick={() => handlePatch(m.id, { activo: !m.activo })}
                    >
                      {m.activo ? '✓' : '✕'}
                    </button>
                    <button className={styles.delete} title="Quitar del equipo" onClick={() => handleDelete(m.id, m.nombre)}>🗑</button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>

      {!adding ? (
        <Button variant="secondary" onClick={() => setAdding(true)}>+ Agregar profesional</Button>
      ) : (
        <form onSubmit={handleAdd} className={styles.form}>
          <div className={styles.formGrid}>
            <Input label="Nombre *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Juan Pérez" />
            <Input label="Email (para entrar) *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase() })} placeholder="ejemplo@mail.com" />
            <Input label="Contraseña *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            <div>
              <label className={styles.label}>Rol</label>
              <select className={styles.selectFull} value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
                {ROLES_OPCIONES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              <p className={styles.rolDesc}>{ROLES_OPCIONES.find((r) => r.key === form.rol)?.desc}</p>
            </div>
            <div className={styles.formColor}>
              <label className={styles.label}>Color en la agenda</label>
              <div className={styles.colorPicker}>
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`${styles.colorBtn} ${form.color === c ? styles.colorOn : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm({ ...form, color: c })}
                  />
                ))}
              </div>
            </div>
            <Input label="% de comisión (0 a 100)" type="number" min="0" max="100" value={form.porcentajeComision} onChange={(e) => setForm({ ...form, porcentajeComision: e.target.value })} />
          </div>
          <div className={styles.formActions}>
            <Button type="submit" size="sm">Guardar profesional</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
          </div>
        </form>
      )}
    </div>
  );
}