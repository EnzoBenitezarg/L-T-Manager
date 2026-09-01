'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import SelectBusqueda from '@/components/ui/SelectBusqueda';
import styles from './cobros.module.css';

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

function CobroForm({ turnosPendientes, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ turnoId: '', monto: '', metodo: 'EFECTIVO', propina: '', descuento: '' });
  const [selectedTurno, setSelectedTurno] = useState(null);

  const handleTurnoChange = (tId) => {
    const turno = turnosPendientes.find((x) => x.id === Number(tId));
    setSelectedTurno(turno);
    setForm({ ...form, turnoId: tId, monto: turno?.servicio?.precio || '' });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Turno pendiente *</label>
        <SelectBusqueda
          options={turnosPendientes.map((t) => ({
            id: t.id,
            nombre: `${t.cliente?.nombre} (${t.servicio?.nombre})`,
            telefono: new Date(t.fecha).toLocaleDateString('es-AR'),
          }))}
          valueKey="id"
          labelKey="nombre"
          secondary="telefono"
          placeholder="Seleccionar turno sin cobrar..."
          searchPlaceholder="🔍 Buscar por cliente o servicio..."
          onSelect={(v) => handleTurnoChange(v)}
        />
      </div>

      {selectedTurno && (
        <>
          <div className={styles.row}>
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
            <Input
              label="Descuento ($)"
              name="descuento"
              type="number"
              min="0"
              step="0.01"
              value={form.descuento || ''}
              onChange={(e) => setForm({ ...form, descuento: e.target.value })}
              placeholder="Precio amigo"
            />
          </div>
          <Input
            label="Propina ($)"
            name="propina"
            type="number"
            min="0"
            step="0.01"
            value={form.propina || ''}
            onChange={(e) => setForm({ ...form, propina: e.target.value })}
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
        <Button variant="secondary" onClick={handleNoCobrar} type="button" disabled={!selectedTurno}>Debe plata</Button>
        <Button type="submit" disabled={loading || !form.turnoId}>{loading ? 'Registrando...' : 'Registrar cobro'}</Button>
      </div>
    </form>
  );

  function handleNoCobrar() {
    onSave({ ...form, noCobrar: true });
  }
}

export default function CobrosPage() {
  const [pagos, setPagos] = useState([]);
  const [turnosPendientes, setTurnosPendientes] = useState([]);
  const [deudores, setDeudores] = useState([]);
  const [tab, setTab] = useState('cobros');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [cobrandoId, setCobrandoId] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [expressMetodo, setExpressMetodo] = useState('EFECTIVO');

  const fetchPagos = useCallback(async () => {
    const res = await fetch('/api/cobros');
    setPagos(await res.json());
    setLoading(false);
  }, []);

  const fetchTurnos = useCallback(async () => {
    const res = await fetch('/api/turnos');
    const all = await res.json();
    setTurnosPendientes(all.filter((t) => !t.pago && t.estado === 'PENDIENTE'));
    setDeudores(all.filter((t) => t.estado === 'FALTA_PAGAR'));
  }, []);

  useEffect(() => {
    fetchPagos();
    fetchTurnos();
  }, [fetchPagos, fetchTurnos]);

  const handleSave = async (form) => {
    setSaving(true);
    if (form.noCobrar) {
      await fetch('/api/cobros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoId: form.turnoId, accion: 'FALTA_PAGAR' }),
      });
    } else {
      await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    }
    await fetchPagos();
    await fetchTurnos();
    setSaving(false);
    setShowModal(false);
  };

  const handleDeuda = async (turnoId, accion) => {
    await fetch('/api/cobros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnoId, accion }),
    });
    await fetchTurnos();
  };

  const showMensaje = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 2500);
  };

  // Cobro express: 1 click, monto = precio, método seleccionado
  const cobrarExpress = async (t, metodo = expressMetodo) => {
    setCobrandoId(t.id);
    try {
      const res = await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnoId: t.id, monto: t.servicio?.precio || 0, metodo, propina: 0, descuento: 0 }),
      });
      if (!res.ok) throw new Error('error');
      const etiqueta = metodo === 'EFECTIVO' ? '💰' : metodo === 'TARJETA' ? '💳' : '🏦';
      showMensaje(`✅ ${etiqueta} Cobrado $${Number(t.servicio?.precio || 0).toLocaleString('es-AR')} — ${t.cliente?.nombre} (${metodo})`);
      await fetchPagos();
      await fetchTurnos();
    } catch {
      showMensaje('❌ No se pudo cobrar');
    } finally {
      setCobrandoId(null);
    }
  };

  const totalServicios = pagos.reduce((acc, p) => acc + Number(p.monto), 0);
  const totalPropinas = pagos.reduce((acc, p) => acc + Number(p.propina || 0), 0);
  const totalDescuentos = pagos.reduce((acc, p) => acc + Number(p.descuento || 0), 0);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Cobros"
        subtitle=""
        action={<Button onClick={() => setShowModal(true)}>+ Registrar Cobro</Button>}
      />

      <div className={styles.summary}>
        <div className={styles.sumItem}>
          <div className={styles.sumValue}>${totalServicios.toLocaleString('es-AR')}</div>
          <div className={styles.sumLabel}>Servicios</div>
        </div>
        <div className={styles.sumItem}>
          <div className={styles.sumValue}>${totalPropinas.toLocaleString('es-AR')}</div>
          <div className={styles.sumLabel}>Propinas</div>
        </div>
        <div className={styles.sumItem}>
          <div className={styles.sumValue}>${totalDescuentos.toLocaleString('es-AR')}</div>
          <div className={styles.sumLabel}>Descuentos</div>
        </div>
        <div className={styles.sumItem}>
          <div className={styles.sumValue}>
            ${(totalServicios + totalPropinas).toLocaleString('es-AR')}
          </div>
          <div className={styles.sumLabel}>Total cobrado</div>
        </div>
      </div>

      {mensaje && <div className={styles.toast}>{mensaje}</div>}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'cobros' ? styles.tabActive : ''}`} onClick={() => setTab('cobros')}>
          Cobros
        </button>
        <button className={`${styles.tab} ${tab === 'deudores' ? styles.tabActive : ''}`} onClick={() => setTab('deudores')}>
          Deudores ({deudores.length})
        </button>
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : tab === 'deudores' ? (
        deudores.length === 0 ? (
          <div className={styles.empty}>No tenés deudores pendientes. ¡Bien! 🎉</div>
        ) : (
          <div className={styles.list}>
            {deudores.map((t) => (
              <Card key={t.id} className={styles.card}>
                <div className={styles.info}>
                  <div className={styles.desc}>{t.cliente?.nombre} — {t.servicio?.nombre}</div>
                  <div className={styles.meta}>
                    {new Date(t.fecha).toLocaleDateString('es-AR')} · ${Number(t.servicio?.precio || 0).toLocaleString('es-AR')}
                  </div>
                </div>
                <div className={styles.deudaActions}>
                  <Button variant="ghost" size="sm" onClick={() => handleDeuda(t.id, 'CANCELAR_DEUDA')}>✔ Cobrado</Button>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          {turnosPendientes.length > 0 && (
            <div className={styles.expressSection}>
              <div className={styles.expressTitle}>
                <span>⚡ Por cobrar</span>
                <span className={styles.expressCount}>{turnosPendientes.length}</span>
              </div>
              <div className={styles.expressMetodos}>
                <span className={styles.expressMetodosLabel}>Método:</span>
                {METODOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`${styles.expressMetodoBtn} ${expressMetodo === m ? styles.expressMetodoBtnActive : ''}`}
                    onClick={() => setExpressMetodo(m)}
                  >
                    {m === 'EFECTIVO' ? '💰' : m === 'TARJETA' ? '💳' : '🏦'} {m}
                  </button>
                ))}
              </div>
              <div className={styles.list}>
                {turnosPendientes.map((t) => (
                  <Card key={t.id} className={styles.expressItem}>
                    <div className={styles.info}>
                      <div className={styles.desc}>{t.cliente?.nombre} — {t.servicio?.nombre}</div>
                      <div className={styles.meta}>
                        {new Date(t.fecha).toLocaleDateString('es-AR')} {new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} · ${Number(t.servicio?.precio || 0).toLocaleString('es-AR')}
                      </div>
                    </div>
                    <div className={styles.expressBtns}>
                      <button className={styles.cobrarBtn} onClick={() => cobrarExpress(t, expressMetodo)} disabled={cobrandoId === t.id}>
                        {cobrandoId === t.id ? '...' : `Cobrar (${expressMetodo})`}
                      </button>
                      <button className={styles.debeBtn} onClick={() => handleDeuda(t.id, 'FALTA_PAGAR')} disabled={cobrandoId === t.id}>
                        Debe
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {pagos.length === 0 ? (
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
                      {p.propina > 0 && ` • Propina: $${Number(p.propina).toLocaleString('es-AR')}`}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
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
