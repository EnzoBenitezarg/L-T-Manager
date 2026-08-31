'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import styles from './turnos.module.css';

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'var(--c-yellow)' },
  COMPLETADO: { label: 'Completado', color: 'var(--c-green)' },
  CANCELADO: { label: 'Cancelado', color: 'var(--c-red)' },
};

function toDateString(date) {
  return date.toISOString().split('T')[0];
}

function TurnoForm({ clientes, servicios, fechaDefault, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    clienteId: '',
    servicioId: '',
    fecha: fechaDefault ? `${fechaDefault}T10:00` : '',
  });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="clienteId">Cliente *</label>
        <select id="clienteId" name="clienteId" value={form.clienteId} onChange={handleChange} required className={styles.select}>
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}{c.telefono ? ` — ${c.telefono}` : ''}</option>
          ))}
        </select>
      </div>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="servicioId">Servicio *</label>
        <select id="servicioId" name="servicioId" value={form.servicioId} onChange={handleChange} required className={styles.select}>
          <option value="">Seleccionar servicio...</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre} — ${Number(s.precio).toLocaleString('es-AR')} ({s.duracion} min)</option>
          ))}
        </select>
      </div>
      <Input
        label="Fecha y hora *"
        name="fecha"
        type="datetime-local"
        value={form.fecha}
        onChange={handleChange}
        required
      />
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar turno'}</Button>
      </div>
    </form>
  );
}

export default function TurnosPage() {
  const [turnos, setTurnos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));

  const fetchTurnos = useCallback(async (fecha) => {
    setLoading(true);
    const res = await fetch(`/api/turnos?fecha=${fecha}`);
    setTurnos(await res.json());
    setLoading(false);
  }, []);

  const fetchSupport = useCallback(async () => {
    const [cRes, sRes] = await Promise.all([fetch('/api/clientes'), fetch('/api/servicios')]);
    setClientes(await cRes.json());
    setServicios(await sRes.json());
  }, []);

  useEffect(() => { fetchTurnos(selectedDate); }, [fetchTurnos, selectedDate]);
  useEffect(() => { fetchSupport(); }, [fetchSupport]);

  const handleSave = async (form) => {
    setSaving(true);
    await fetch('/api/turnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    await fetchTurnos(selectedDate);
    setSaving(false);
    setShowModal(false);
  };

  const handleEstado = async (id, estado) => {
    await fetch(`/api/turnos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    });
    await fetchTurnos(selectedDate);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este turno?')) return;
    await fetch(`/api/turnos/${id}`, { method: 'DELETE' });
    await fetchTurnos(selectedDate);
  };

  const navDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateString(d));
  };

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const isToday = selectedDate === toDateString(new Date());

  return (
    <div className={styles.page}>
      <PageHeader 
        title="Turnos"
        subtitle={`${turnos.length} turno${turnos.length !== 1 ? 's' : ''} para hoy`}
        action={<Button onClick={() => setShowModal(true)}>+ Nuevo turno</Button>}
      />

      {/* Date Navigator */}
      <div className={styles.dateNav}>
        <button className={styles.dateBtn} onClick={() => navDate(-1)}>‹</button>
        <div className={styles.dateDisplay}>
          <span className={styles.dateStr}>{displayDate}</span>
          {isToday && <span className={styles.todayBadge}>Hoy</span>}
        </div>
        <button className={styles.dateBtn} onClick={() => navDate(1)}>›</button>
        <button className={styles.todayBtn} onClick={() => setSelectedDate(toDateString(new Date()))}>
          Ir a hoy
        </button>
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : turnos.length === 0 ? (
        <div className={styles.empty}>
          No hay turnos para este día.
          <br />
          <Button variant="ghost" onClick={() => setShowModal(true)} className={styles.emptyBtn}>
            + Agendar turno
          </Button>
        </div>
      ) : (
        <div className={styles.turnosList}>
          {turnos.map((t) => {
            const hora = new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
            const est = ESTADOS[t.estado] || ESTADOS.PENDIENTE;
            return (
              <Card key={t.id} className={styles.turnoCard}>
                <div className={styles.turnoHora}>{hora}</div>
                <div className={styles.turnoInfo}>
                  <div className={styles.turnoCliente}>{t.cliente?.nombre}</div>
                  <div className={styles.turnoServicio}>
                    {t.servicio?.nombre} · ${Number(t.servicio?.precio || 0).toLocaleString('es-AR')}
                  </div>
                  {t.cliente?.telefono && (
                    <a href={`tel:${t.cliente.telefono}`} className={styles.turnoTel}>
                      📞 {t.cliente.telefono}
                    </a>
                  )}
                </div>
                <div className={styles.turnoRight}>
                  <span className={styles.estadoBadge} style={{ backgroundColor: est.color }}>
                    {est.label}
                  </span>
                  <div className={styles.turnoActions}>
                    {t.estado === 'PENDIENTE' && (
                      <Button variant="ghost" size="sm" onClick={() => handleEstado(t.id, 'COMPLETADO')}>✓ Completar</Button>
                    )}
                    {t.estado === 'PENDIENTE' && (
                      <Button variant="ghost" size="sm" className={styles.cancelBtn} onClick={() => handleEstado(t.id, 'CANCELADO')}>Cancelar</Button>
                    )}
                    <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDelete(t.id)}>Eliminar</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Nuevo turno" onClose={() => setShowModal(false)}>
          <TurnoForm
            clientes={clientes}
            servicios={servicios}
            fechaDefault={selectedDate}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}
