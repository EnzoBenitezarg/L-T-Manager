'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import styles from './cobros.module.css';

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

function CobroForm({ turnosPendientes, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ turnoId: '', monto: '', metodo: 'EFECTIVO' });
  const [selectedTurno, setSelectedTurno] = useState(null);

  const handleTurnoChange = (e) => {
    const tId = e.target.value;
    const t = turnosPendientes.find((x) => x.id === Number(tId));
    setSelectedTurno(t);
    setForm({ ...form, turnoId: tId, monto: t?.servicio?.precio || '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label} htmlFor="turnoId">Turno pendiente *</label>
        <select id="turnoId" name="turnoId" value={form.turnoId} onChange={handleTurnoChange} required className={styles.select}>
          <option value="">Seleccionar turno sin cobrar...</option>
          {turnosPendientes.map((t) => (
            <option key={t.id} value={t.id}>
              {new Date(t.fecha).toLocaleDateString()} - {t.cliente?.nombre} ({t.servicio?.nombre})
            </option>
          ))}
        </select>
      </div>

      {selectedTurno && (
        <>
          <Input 
            label="Monto a cobrar ($) *" 
            name="monto" 
            type="number" 
            min="0" 
            step="0.01" 
            value={form.monto} 
            onChange={(e) => setForm({ ...form, monto: e.target.value })} 
            required 
          />
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="metodo">Método de pago *</label>
            <select id="metodo" name="metodo" value={form.metodo} onChange={(e) => setForm({ ...form, metodo: e.target.value })} required className={styles.select}>
              {METODOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </>
      )}
      
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading || !form.turnoId}>{loading ? 'Registrando...' : 'Registrar cobro'}</Button>
      </div>
    </form>
  );
}

export default function CobrosPage() {
  const [pagos, setPagos] = useState([]);
  const [turnosPendientes, setTurnosPendientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchPagos = useCallback(async () => {
    const res = await fetch('/api/cobros');
    setPagos(await res.json());
    setLoading(false);
  }, []);

  const fetchTurnos = useCallback(async () => {
    const res = await fetch('/api/turnos');
    const all = await res.json();
    // Turnos que no tienen pago registrado
    setTurnosPendientes(all.filter((t) => !t.pago));
  }, []);

  useEffect(() => {
    fetchPagos();
    fetchTurnos();
  }, [fetchPagos, fetchTurnos]);

  const handleSave = async (form) => {
    setSaving(true);
    await fetch('/api/cobros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    await fetchPagos();
    await fetchTurnos();
    setSaving(false);
    setShowModal(false);
  };

  const totalRecaudado = pagos.reduce((acc, p) => acc + Number(p.monto), 0);

  return (
    <div className={styles.page}>
      <PageHeader 
        title="Cobros" 
        subtitle={`Total recaudado: $${totalRecaudado.toLocaleString('es-AR')}`}
        action={<Button onClick={() => setShowModal(true)}>+ Registrar Cobro</Button>}
      />

      {loading ? (
        <div className={styles.empty}>Cargando historial...</div>
      ) : pagos.length === 0 ? (
        <div className={styles.empty}>Aún no hay cobros registrados.</div>
      ) : (
        <div className={styles.list}>
          {pagos.map((p) => (
            <Card key={p.id} className={styles.card}>
              <div className={styles.icon}>💰</div>
              <div className={styles.info}>
                <div className={styles.monto}>${Number(p.monto).toLocaleString('es-AR')}</div>
                <div className={styles.desc}>
                  {p.turno?.cliente?.nombre} — {p.turno?.servicio?.nombre}
                </div>
                <div className={styles.meta}>
                  {new Date(p.fecha).toLocaleDateString('es-AR')} • {p.metodo}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Registrar Cobro" onClose={() => setShowModal(false)}>
          <CobroForm
            turnosPendientes={turnosPendientes}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
            loading={saving}
          />
        </Modal>
      )}
    </div>
  );
}
