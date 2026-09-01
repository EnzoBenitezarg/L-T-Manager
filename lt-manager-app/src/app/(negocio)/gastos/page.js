'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { METODO_ETIQUETA } from '@/lib/formato';
import styles from './gastos.module.css';

function toDateString(date) {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

export default function GastosPage() {
  const [gastos, setGastos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ concepto: '', monto: '', categoria: '' });
  const [inicial, setInicial] = useState(0);
  const [conteoReal, setConteoReal] = useState('');
  const [cajaHistorial, setCajaHistorial] = useState([]);
  const [cajaSaved, setCajaSaved] = useState('');

  const fetchData = useCallback(async () => {
    const [gRes, pRes, cRes] = await Promise.all([fetch('/api/gastos'), fetch('/api/cobros'), fetch('/api/caja')]);
    setGastos(await gRes.json());
    setPagos(await pRes.json());
    const caja = await cRes.json();
    setResumen(caja.resumen || null);
    if (caja.caja) {
      setInicial(caja.caja.apertura || 0);
      setConteoReal(caja.caja.conteoReal != null ? String(caja.caja.conteoReal) : '');
    }
    setCajaHistorial(caja.historial || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const guardarCaja = async ({ apertura, conteoReal }) => {
    const payload = {};
    if (apertura != null) payload.apertura = apertura;
    if (conteoReal != null) payload.conteoReal = conteoReal;
    await fetch('/api/caja', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const cRes = await fetch('/api/caja');
    const caja = await cRes.json();
    setResumen(caja.resumen || null);
    setCajaHistorial(caja.historial || []);
    setCajaSaved('✅ Caja guardada');
    setTimeout(() => setCajaSaved(''), 2500);
  };

  const hoy = toDateString(new Date());

  const gastosHoyLocal = gastos
    .filter((g) => toDateString(new Date(g.fecha)) === hoy)
    .reduce((acc, g) => acc + Number(g.monto), 0);

  const cobrosHoy = pagos
    .filter((p) => toDateString(new Date(p.fecha)) === hoy)
    .reduce((acc, p) => acc + Number(p.monto) + Number(p.propina || 0), 0);

  // El resumen del backend ya incluye turnos (cobros) + ventas de productos + propinas + gastos.
  const ingresosHoy = resumen != null ? resumen.totalIngresos : cobrosHoy;
  const gastosHoyFinal = resumen != null ? resumen.gastosHoy : gastosHoyLocal;

  const totalGastos = gastos.reduce((acc, g) => acc + Number(g.monto), 0);
  const esperadoCaja = (Number(inicial) || 0) + ingresosHoy - gastosHoyFinal;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/gastos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    await fetchData();
    setSaving(false);
    setShowModal(false);
    setForm({ concepto: '', monto: '', categoria: '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return;
    await fetch(`/api/gastos/${id}`, { method: 'DELETE' });
    await fetchData();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Gastos y Caja"
        subtitle="Registrá tus egresos y controlá la caja del día"
        action={<Button onClick={() => setShowModal(true)}>+ Nuevo gasto</Button>}
      />

      {/* Caja diaria */}
      <Card className={styles.caja}>
        <div className={styles.cajaTitle}>💰 Caja del día</div>
        <div className={styles.cajaGrid}>
          <div className={styles.cajaStat}>
            <div className={styles.cajaLabel}>Ingresos de hoy</div>
            <div className={styles.cajaValue}>${ingresosHoy.toLocaleString('es-AR')}</div>
          </div>
          <div className={styles.cajaStat}>
            <div className={styles.cajaLabel}>Gastos de hoy</div>
            <div className={styles.cajaValue}>-${gastosHoyFinal.toLocaleString('es-AR')}</div>
          </div>
          <div className={styles.cajaStat}>
            <div className={styles.cajaLabel}>Apertura</div>
            <div className={styles.cajaInputRow}>
              <Input type="number" value={inicial} onChange={(e) => setInicial(Number(e.target.value))} placeholder="¿Cuánto arrancaste?" />
              <Button size="sm" variant="secondary" onClick={() => guardarCaja({ apertura: inicial })}>Guardar</Button>
            </div>
          </div>
          <div className={styles.cajaStat}>
            <div className={styles.cajaLabel}>Esperado en caja</div>
            <div className={`${styles.cajaValue} ${esperadoCaja < 0 ? styles.negativo : ''}`}>${esperadoCaja.toLocaleString('es-AR')}</div>
          </div>
        </div>

        {(resumen && (resumen.totalIngresos > 0 || resumen.propinas > 0)) && (
          <div className={styles.metodos}>
            <div className={styles.cajaLabel}>Ingresos por método de pago</div>
            <div className={styles.metodosRow}>
              {METODOS.map((m) => {
                const val = resumen.ingresosPorMetodo?.[m] || 0;
                return (
                  <span key={m} className={`${styles.metodoChip} ${val === 0 ? styles.metodoChipOff : ''}`}>
                    {METODO_ETIQUETA[m] || m} · ${val.toLocaleString('es-AR')}
                  </span>
                );
              })}
              {resumen.propinas > 0 && (
                <span className={styles.metodoChip}>➕ Propinas · ${resumen.propinas.toLocaleString('es-AR')}</span>
              )}
            </div>
          </div>
        )}

        <div className={styles.cajaConteo}>
          <div className={styles.cajaLabel}>Conteo real (para comparar)</div>
          <div className={styles.cajaInputRow}>
            <Input type="number" value={conteoReal} onChange={(e) => setConteoReal(e.target.value)} placeholder="Conteo al cierre..." />
            <Button size="sm" variant="secondary" onClick={() => guardarCaja({ conteoReal: Number(conteoReal) })} disabled={conteoReal === ''}>Guardar</Button>
          </div>
          {conteoReal !== '' && (
            <div className={styles.diferencia}>
              Diferencia: <strong>${(Number(conteoReal) - esperadoCaja).toLocaleString('es-AR')}</strong>
            </div>
          )}
          {cajaSaved && <div className={styles.cajaSaved}>{cajaSaved}</div>}
        </div>
      </Card>

      {cajaHistorial.length > 0 && (
        <Card className={styles.cajaHistorial}>
          <div className={styles.cajaTitle}>📅 Historial de caja (últimos días)</div>
          <div className={styles.cajaHistList}>
            {cajaHistorial.map((c) => (
              <div key={c.id} className={styles.cajaHistItem}>
                <span className={styles.cajaHistFecha}>{new Date(c.fecha).toLocaleDateString('es-AR')}</span>
                <span className={styles.cajaHistVal}>Apertura: ${Number(c.apertura).toLocaleString('es-AR')}</span>
                <span className={styles.cajaHistVal}>
                  Conteo: {c.conteoReal != null ? `$${Number(c.conteoReal).toLocaleString('es-AR')}` : '—'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className={styles.totalBar}>
        <span>Total gastos registrados:</span>
        <strong>${totalGastos.toLocaleString('es-AR')}</strong>
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : gastos.length === 0 ? (
        <div className={styles.empty}>Todavía no hay gastos registrados.</div>
      ) : (
        <div className={styles.list}>
          {gastos.map((g) => (
            <Card key={g.id} className={styles.gastoCard}>
              <div className={styles.gastoInfo}>
                <div className={styles.gastoConcepto}>{g.concepto}</div>
                {g.categoria && <div className={styles.gastoCategoria}>{g.categoria}</div>}
              </div>
              <div className={styles.gastoRight}>
                <div className={styles.gastoMonto}>-${Number(g.monto).toLocaleString('es-AR')}</div>
                <div className={styles.gastoFecha}>{new Date(g.fecha).toLocaleDateString('es-AR')}</div>
                <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDelete(g.id)}>Eliminar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="Nuevo gasto" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className={styles.form}>
            <Input label="Concepto *" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} required placeholder="Ej: Compra de insumos" />
            <Input label="Monto ($) *" type="number" min="0" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required />
            <Input label="Categoría (opcional)" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ej: Insumos, Alquiler, Servicios" />
            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar gasto'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}