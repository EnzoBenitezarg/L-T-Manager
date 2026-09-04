'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import SelectBusqueda from '@/components/ui/SelectBusqueda';
import { aDatetimeLocal } from '@/lib/fecha';
import styles from './turnos.module.css';

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

const ESTADOS = {
  PENDIENTE: { label: 'Pendiente', color: 'var(--c-yellow)' },
  COMPLETADO: { label: 'Completado', color: 'var(--c-green)' },
  CANCELADO: { label: 'Cancelado', color: 'var(--c-red)' },
};

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function toDateString(date) {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
}

function calcularFin(inicio, duracion) {
  const d = new Date(inicio);
  d.setMinutes(d.getMinutes() + (duracion || 0));
  return d;
}

function ReprogramarForm({ turno, clientes, servicios, profesionales, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    clienteId: turno.clienteId,
    servicioId: turno.servicioId,
    fecha: aDatetimeLocal(turno.fecha),
    duracionOverride: turno.duracionOverride ? String(turno.duracionOverride) : '',
    profesionalId: turno.profesionalId || '',
  });
  const [servicioSeleccionado, setServicioSeleccionado] = useState(
    () => servicios.find((s) => s.id === turno.servicioId) || null
  );
  const [turnosDelDia, setTurnosDelDia] = useState([]);
  const [moverSerie, setMoverSerie] = useState(false);

  // Cuando cambia la fecha, trae los turnos de ese día para avisar conflictos en vivo
  useEffect(() => {
    if (!form.fecha) return;
    const dia = toDateString(new Date(form.fecha));
    fetch(`/api/turnos?fecha=${dia}`)
      .then((r) => r.json())
      .then(setTurnosDelDia);
  }, [form.fecha]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'servicioId') {
      setServicioSeleccionado(servicios.find((s) => s.id === Number(value)));
    }
  };

  const duracionEfectiva = form.duracionOverride
    ? Number(form.duracionOverride)
    : servicioSeleccionado?.duracion || 0;

  const choque = useMemo(() => {
    if (!form.fecha || !duracionEfectiva) return null;
    const inicio = new Date(form.fecha);
    const fin = calcularFin(inicio, duracionEfectiva);
    const profId = Number(form.profesionalId) || null;
    return (turnosDelDia || []).find((t) => {
      if (t.id === turno.id) return false;
      if (profId && t.profesionalId && profId !== t.profesionalId) return false;
      const tInicio = new Date(t.fecha);
      const tFin = calcularFin(tInicio, t.duracionOverride || t.servicio?.duracion || 0);
      return inicio < tFin && fin > tInicio;
    });
  }, [form.fecha, duracionEfectiva, turnosDelDia, turno.id, form.profesionalId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(turno.id, {
      fecha: form.fecha,
      clienteId: Number(form.clienteId),
      servicioId: Number(form.servicioId),
      duracionOverride: form.duracionOverride ? Number(form.duracionOverride) : undefined,
      profesionalId: form.profesionalId ? Number(form.profesionalId) : null,
      moverSerie: turno.serieId ? moverSerie : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Cliente *</label>
        <SelectBusqueda
          options={clientes.map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono || '' }))}
          valueKey="id"
          labelKey="nombre"
          secondary="telefono"
          placeholder="Seleccionar cliente..."
          searchPlaceholder="🔍 Buscar por nombre o teléfono..."
          onSelect={(v) => setForm({ ...form, clienteId: v })}
        />
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
        label="Nueva fecha y hora *"
        name="fecha"
        type="datetime-local"
        value={form.fecha}
        onChange={handleChange}
        required
      />
      <Input
        label={`Duración (min)${servicioSeleccionado ? ` — usual: ${servicioSeleccionado.duracion}` : ''}`}
        name="duracionOverride"
        type="number"
        min="5"
        step="5"
        value={form.duracionOverride}
        onChange={handleChange}
        placeholder="Usar la del servicio si se deja vacío"
      />
      {(profesionales || []).length > 0 && (
        <div className={styles.formGroup}>
          <label className={styles.label}>Profesional</label>
          <select
            className={styles.select}
            value={form.profesionalId}
            onChange={(e) => setForm({ ...form, profesionalId: e.target.value })}
          >
            <option value="">Sin asignar</option>
            {profesionales.filter((p) => p.activo).map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}
      {turno.serieId && (
        <label className={styles.repeticion}>
          <input type="checkbox" checked={moverSerie} onChange={(e) => setMoverSerie(e.target.checked)} />
          <span>Mover <strong>toda</strong> la serie de turnos</span>
        </label>
      )}
      {choque && (
        <div className={styles.conflicto}>
          ⚠️ <strong>Conflicto de horario:</strong> se superpone con
          {choque.cliente?.nombre ? ` ${choque.cliente.nombre}` : ' otro turno'}
          {choque.fecha ? ` (${new Date(choque.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })})` : ''}.
        </div>
      )}
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Mover turno'}</Button>
      </div>
    </form>
  );
}

function TurnoForm({ clientes, servicios, profesionales, fechaDefault, turnosDelDia, onSave, onCancel, loading, onCrearCliente }) {
  const [form, setForm] = useState({
    clienteId: '',
    servicioId: '',
    fecha: fechaDefault ? `${fechaDefault}T10:00` : '',
    duracionOverride: '',
    profesionalId: '',
    repetir: false,
    cadaSemanas: '1',
    cantidad: '4',
  });
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [crearCliente, setCrearCliente] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTel, setNuevoTel] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (name === 'servicioId') {
      setServicioSeleccionado(servicios.find((s) => s.id === Number(value)));
    }
  };

  const handleChangeForm = (campo, valor) => setForm({ ...form, [campo]: valor });

  // Detección de choque de horarios con otros turnos del día
  const duracionEfectiva = form.duracionOverride ? Number(form.duracionOverride) : servicioSeleccionado?.duracion || 0;
  const choque = useMemo(() => {
    if (!form.fecha || !duracionEfectiva) return null;
    const inicio = new Date(form.fecha);
    const fin = calcularFin(inicio, duracionEfectiva);
    const profId = Number(form.profesionalId) || null;
    return (turnosDelDia || []).find((t) => {
      if (profId && t.profesionalId && profId !== t.profesionalId) return false;
      const tInicio = new Date(t.fecha || t.fecha);
      const tFin = calcularFin(tInicio, t.duracionOverride || t.servicio?.duracion || 0);
      return inicio < tFin && fin > tInicio;
    });
  }, [form.fecha, duracionEfectiva, turnosDelDia, form.profesionalId]);

  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  const opcionesClientes = clientes.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    telefono: c.telefono || '',
  }));

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Cliente *</label>
        {crearCliente ? (
          <div className={styles.crearClienteBox}>
            <Input
              label="Nombre"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre del cliente"
              required
            />
            <Input
              label="Teléfono (opcional)"
              value={nuevoTel}
              onChange={(e) => setNuevoTel(e.target.value)}
              placeholder="11 1234-5678"
            />
            <div className={styles.row} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
              <Button
                type="button"
                size="sm"
                disabled={!nuevoNombre.trim()}
                onClick={async () => {
                  const id = await onCrearCliente({ nombre: nuevoNombre.trim(), telefono: nuevoTel.trim() || null });
                  if (id) {
                    setForm({ ...form, clienteId: id });
                    setCrearCliente(false);
                  }
                }}
              >
                Crear y usar
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCrearCliente(false)}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <>
            <SelectBusqueda
              options={opcionesClientes}
              valueKey="id"
              labelKey="nombre"
              secondary="telefono"
              placeholder="Seleccionar cliente..."
              searchPlaceholder="🔍 Buscar por nombre o teléfono..."
              onSelect={(v) => setForm({ ...form, clienteId: v })}
            />
            <button type="button" className={styles.crearClienteLink} onClick={() => setCrearCliente(true)}>
              + ¿No está? Crear cliente
            </button>
            {form.clienteId && (
              <p className={styles.clienteElegido}>
                ✓ {clientes.find((c) => c.id === Number(form.clienteId))?.nombre}
              </p>
            )}
          </>
        )}
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
      <Input
        label={`Duración (min)${servicioSeleccionado ? ` — usual: ${servicioSeleccionado.duracion}` : ''}`}
        name="duracionOverride"
        type="number"
        min="5"
        step="5"
        value={form.duracionOverride}
        onChange={handleChange}
        placeholder="Usar la del servicio si se deja vacío"
      />
      {(profesionales || []).length > 0 && (
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="profesionalId">Profesional</label>
          <select id="profesionalId" className={styles.select} value={form.profesionalId} onChange={(e) => handleChangeForm('profesionalId', e.target.value)}>
            <option value="">Sin asignar</option>
            {profesionales.filter((p) => p.activo).map((p) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>
      )}
      {servicioSeleccionado && (
        <div className={styles.formGroup}>
          <label className={styles.repeticion}>
            <input
              type="checkbox"
              checked={form.repetir}
              onChange={(e) => handleChangeForm('repetir', e.target.checked)}
            />
            <span>Repetir todas las semanas</span>
          </label>
          {form.repetir && (
            <div className={styles.repeticionControles}>
              <select className={styles.select} value={form.cadaSemanas} onChange={(e) => handleChangeForm('cadaSemanas', e.target.value)}>
                <option value="1">Cada 1 semana</option>
                <option value="2">Cada 2 semanas</option>
              </select>
              <select className={styles.select} value={form.cantidad} onChange={(e) => handleChangeForm('cantidad', e.target.value)}>
                <option value="0">Sin límite (semanal fijo)</option>
                {[2, 3, 4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>{n} turnos</option>
                ))}
              </select>
            </div>
          )}
          <p className={styles.clienteElegido}>ℹ️ La serie crea un turno por semana, con el mismo profesional, en el mismo día y horario.</p>
        </div>
      )}
      {choque && !form.repetir && (
        <div className={styles.conflicto}>
          ⚠️ <strong>Conflicto de horario:</strong> se superpone con
          {choque.cliente?.nombre ? ` ${choque.cliente.nombre}` : ' otro turno'}
          {choque.fecha ? ` (${new Date(choque.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })})` : ''}.
        </div>
      )}
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : form.repetir ? 'Guardar serie de turnos' : 'Guardar turno'}</Button>
      </div>
    </form>
  );
}

function BloqueoForm({ onSave, onCancel, loading }) {
  const [form, setForm] = useState({ tipo: 'dia', fecha: toDateString(new Date()), horaInicio: '14:00', horaFin: '15:00', diaSemana: '', motivo: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Tipo de bloqueo</label>
        <select className={styles.select} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
          <option value="dia">Día completo (no laborable)</option>
          <option value="rango">Rango de horas (descanso)</option>
          <option value="semana">Día de la semana recurrente</option>
        </select>
      </div>

      {form.tipo === 'semana' ? (
        <div className={styles.formGroup}>
          <label className={styles.label}>Día de la semana</label>
          <select className={styles.select} value={form.diaSemana} onChange={(e) => setForm({ ...form, diaSemana: e.target.value })}>
            <option value="">Seleccionar día...</option>
            {DIAS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </div>
      ) : (
        <Input
          label={form.tipo === 'rango' ? 'Fecha' : 'Fecha (no laborable)'}
          name="fecha"
          type="date"
          value={form.fecha}
          onChange={(e) => setForm({ ...form, fecha: e.target.value })}
          required
        />
      )}

      {form.tipo === 'rango' && (
        <div className={styles.row}>
          <Input label="Desde" name="horaInicio" type="time" value={form.horaInicio} onChange={(e) => setForm({ ...form, horaInicio: e.target.value })} required />
          <Input label="Hasta" name="horaFin" type="time" value={form.horaFin} onChange={(e) => setForm({ ...form, horaFin: e.target.value })} required />
        </div>
      )}

      <Input label="Motivo (opcional)" name="motivo" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} placeholder="Ej: Descanso, almuerzo" />
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar bloqueo'}</Button>
      </div>
    </form>
  );
}

export default function TurnosPage() {
  const [turnos, setTurnos] = useState([]);
  const [turnosSemana, setTurnosSemana] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [bloqueos, setBloqueos] = useState([]);
  const [espera, setEspera] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showBloqueo, setShowBloqueo] = useState(false);
  const [showEspera, setShowEspera] = useState(false);
  const [view, setView] = useState('dia');
  const [selectedDate, setSelectedDate] = useState(toDateString(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => toDateString(new Date()).slice(0, 7));
  const [turnosMes, setTurnosMes] = useState([]);
  const [sugeridoEspera, setSugeridoEspera] = useState(null);
  const [cobroTurno, setCobroTurno] = useState(null);
  const [cobroMonto, setCobroMonto] = useState('');
  const [cobroMetodo, setCobroMetodo] = useState('EFECTIVO');
  const [cobroPropina, setCobroPropina] = useState('');
  const [cobroSaving, setCobroSaving] = useState(false);
  const [moverTurno, setMoverTurno] = useState(null);
  const [msg, setMsg] = useState('');

  const fetchTurnos = useCallback(async (fecha) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/turnos?fecha=${fecha}`);
      setTurnos(await res.json());
    } catch {
      setTurnos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBloqueos = useCallback(async () => {
    try {
      const res = await fetch('/api/bloqueos');
      setBloqueos(await res.json());
    } catch {
      setBloqueos([]);
    }
  }, []);

  const fetchEspera = useCallback(async () => {
    try {
      const res = await fetch('/api/espera');
      setEspera(await res.json());
    } catch {
      setEspera([]);
    }
  }, []);

  const fetchSupport = useCallback(async () => {
    try {
      const [cRes, sRes, mRes] = await Promise.all([fetch('/api/clientes'), fetch('/api/servicios'), fetch('/api/miembros')]);
      setClientes(await cRes.json());
      setServicios(await sRes.json());
      setMiembros(await mRes.json());
    } catch {
      setClientes([]);
      setServicios([]);
      setMiembros([]);
    }
  }, []);

  useEffect(() => { fetchTurnos(selectedDate); }, [fetchTurnos, selectedDate]);
  useEffect(() => { fetchSupport(); fetchBloqueos(); fetchEspera(); }, [fetchSupport, fetchBloqueos, fetchEspera]);

  const handleSave = async (form) => {
    setSaving(true);
    const res = await fetch('/api/turnos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const d = await res.json();
      showMsg(`❌ ${d.error || 'No se pudo crear el turno'}`);
      setSaving(false);
      return;
    }
    await fetchTurnos(selectedDate);
    await fetchSupport();
    setSaving(false);
    setShowModal(false);
    showMsg('✅ Turno creado');
  };

  const handleCrearCliente = async (datos) => {
    const res = await fetch('/api/clientes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    });
    if (!res.ok) {
      const d = await res.json();
      showMsg(`❌ ${d.error || 'No se pudo crear el cliente'}`);
      return;
    }
    const nuevo = await res.json();
    setClientes((prev) => [...prev, nuevo]);
    showMsg(`✅ Cliente ${nuevo.nombre} creado`);
    return nuevo.id;
  };

  const handleBloqueo = async (form) => {
    setSaving(true);
    await fetch('/api/bloqueos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    await fetchBloqueos();
    setSaving(false);
    setShowBloqueo(false);
  };

  const handleDeleteBloqueo = async (id) => {
    if (!confirm('¿Eliminar este bloqueo?')) return;
    await fetch(`/api/bloqueos/${id}`, { method: 'DELETE' });
    await fetchBloqueos();
  };

  const handleEspera = async (form) => {
    await fetch('/api/espera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    await fetchEspera();
    setShowEspera(false);
  };

  const handleQuitarEspera = async (id) => {
    await fetch(`/api/espera/${id}`, { method: 'DELETE' });
    await fetchEspera();
  };

  const handleEstado = async (id, estado) => {
    if (estado === 'CANCELADO' && espera.length > 0) {
      setSugeridoEspera(espera[0]);
    }
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

  const handleReprogramar = async (id, form) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/turnos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        showMsg(`❌ ${d.error || 'No se pudo reprogramar el turno'}`);
        setSaving(false);
        return;
      }
      await fetchTurnos(selectedDate);
      await fetchSupport();
      setSaving(false);
      setMoverTurno(null);
      showMsg('✅ Turno reprogramado');
    } catch {
      showMsg('❌ Error de conexión');
      setSaving(false);
    }
  };

  const showMsg = (texto) => {
    setMsg(texto);
    setTimeout(() => setMsg(''), 2500);
  };

  // Abrir modal de cobro del turno (cobro publicado al finalizar)
  const abrirCobro = (t) => {
    setCobroTurno(t);
    setCobroMonto(String(t.servicio?.precio || ''));
    setCobroMetodo('EFECTIVO');
    setCobroPropina('');
  };

  const cobrarTurno = async (e) => {
    e.preventDefault();
    if (!cobroTurno || !cobroMonto) return;
    setCobroSaving(true);
    try {
      const res = await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId: cobroTurno.id,
          monto: Number(cobroMonto),
          metodo: cobroMetodo,
          propina: Number(cobroPropina) || 0,
          descuento: 0,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        showMsg(`❌ ${d.error || 'No se pudo cobrar'}`);
      } else {
        showMsg(`✅ Cobrado $${Number(cobroMonto).toLocaleString('es-AR')} — ${cobroTurno.cliente?.nombre}`);
        setCobroTurno(null);
      }
      await fetchTurnos(selectedDate);
    } catch {
      showMsg('❌ Error de conexión');
    } finally {
      setCobroSaving(false);
    }
  };

  const marcarDeudaDesdeTurno = async (t) => {
    await fetch('/api/cobros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnoId: t.id, accion: 'FALTA_PAGAR' }),
    });
    showMsg(`⏳ Marcado como debe — ${t.cliente?.nombre}`);
    await fetchTurnos(selectedDate);
  };

  const navDate = (days) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(toDateString(d));
  };

  const navMonth = (delta) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const displayDate = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const displayMonth = (() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  })();

  const esMesActual = selectedMonth === toDateString(new Date()).slice(0, 7);

  const isToday = selectedDate === toDateString(new Date());

  const bloqueosDelDia = (fechaStr) => {
    const dow = new Date(fechaStr + 'T12:00:00').getDay();
    return bloqueos.filter((b) => {
      const bFecha = b.fecha ? toDateString(new Date(b.fecha)) : null;
      if (b.diaSemana != null) return b.diaSemana === dow;
      if (bFecha === fechaStr) return true;
      return false;
    });
  };

  const diasSemana = [];
  const start = new Date(selectedDate + 'T12:00:00');
  start.setDate(start.getDate() - start.getDay()); // inicio domingo
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    diasSemana.push(toDateString(d));
  }
  const semana = view === 'semana' ? diasSemana : [];

  // Celdas del calendario mensual (mes + celdas vacías de offset)
  const celdasMes = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const primerDia = new Date(y, m - 1, 1).getDay();
    const totalDias = new Date(y, m, 0).getDate();
    const celdas = [];
    for (let i = 0; i < primerDia; i++) celdas.push(null);
    for (let d = 1; d <= totalDias; d++) celdas.push(`${selectedMonth}-${String(d).padStart(2, '0')}`);
    return celdas;
  }, [selectedMonth]);

  useEffect(() => {
    if (view !== 'semana') return;
    Promise.all(semana.map((f) => fetch(`/api/turnos?fecha=${f}`).then((r) => r.json())))
      .then((resultados) => setTurnosSemana(resultados.flat()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, selectedDate]);

  useEffect(() => {
    if (view !== 'mes') return;
    const [y, m] = selectedMonth.split('-').map(Number);
    const desde = `${selectedMonth}-01`;
    const ultimoDia = new Date(y, m, 0).getDate();
    const hasta = `${selectedMonth}-${String(ultimoDia).padStart(2, '0')}`;
    fetch(`/api/turnos?desde=${desde}&hasta=${hasta}`)
      .then((r) => r.json())
      .then(setTurnosMes);
  }, [view, selectedMonth]);

  const turnosDeDia = (fecha) => turnosSemana.filter((t) => toDateString(new Date(t.fecha)) === fecha);
  const turnosDeMes = (fecha) => turnosMes.filter((t) => toDateString(new Date(t.fecha)) === fecha);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Turnos"
        subtitle={`${turnos.length} turno${turnos.length !== 1 ? 's' : ''} en este día`}
        action={<Button onClick={() => setShowModal(true)}>+ Nuevo turno</Button>}
      />

      {/* View toggle + Date Navigator */}
      <div className={styles.toolbar}>
        <div className={styles.viewToggle} role="tablist" aria-label="Cambiar vista">
          <button
            role="tab"
            aria-selected={view === 'dia'}
            className={`${styles.viewBtn} ${view === 'dia' ? styles.viewActive : ''}`}
            onClick={() => setView('dia')}
          >
            <span className={styles.viewIcon}>📅</span>
            <span>Día</span>
          </button>
          <button
            role="tab"
            aria-selected={view === 'semana'}
            className={`${styles.viewBtn} ${view === 'semana' ? styles.viewActive : ''}`}
            onClick={() => setView('semana')}
          >
            <span className={styles.viewIcon}>🗓️</span>
            <span>Semana</span>
          </button>
          <button
            role="tab"
            aria-selected={view === 'mes'}
            className={`${styles.viewBtn} ${view === 'mes' ? styles.viewActive : ''}`}
            onClick={() => setView('mes')}
          >
            <span className={styles.viewIcon}>📆</span>
            <span>Mes</span>
          </button>
        </div>

        {view !== 'mes' ? (
          <div className={styles.dateNav}>
            <button className={styles.dateBtn} onClick={() => navDate(view === 'semana' ? -7 : -1)} aria-label="Anterior">‹</button>
            <div className={styles.dateDisplay}>
              <span className={styles.dateStr}>{displayDate}</span>
              {isToday && view === 'dia' && <span className={styles.todayBadge}>Hoy</span>}
            </div>
            <button className={styles.dateBtn} onClick={() => navDate(view === 'semana' ? 7 : 1)} aria-label="Siguiente">›</button>
            <button className={styles.todayBtn} onClick={() => setSelectedDate(toDateString(new Date()))}>Hoy</button>
          </div>
        ) : (
          <div className={styles.dateNav}>
            <button className={styles.dateBtn} onClick={() => navMonth(-1)} aria-label="Mes anterior">‹</button>
            <div className={styles.dateDisplay}>
              <span className={styles.dateStr}>{displayMonth}</span>
              {esMesActual && <span className={styles.todayBadge}>Este mes</span>}
            </div>
            <button className={styles.dateBtn} onClick={() => navMonth(1)} aria-label="Mes siguiente">›</button>
            <button className={styles.todayBtn} onClick={() => setSelectedMonth(toDateString(new Date()).slice(0, 7))}>Hoy</button>
          </div>
        )}

        <Button variant="secondary" size="sm" onClick={() => setShowBloqueo(true)}>🔒 Bloqueo</Button>
      </div>

      {/* Lista de espera access */}
      <div className={styles.esperaBar}>
        <button className={styles.esperaBarBtn} onClick={() => setShowEspera(true)}>
          📋 Lista de espera ({espera.length})
        </button>
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : view === 'semana' ? (
        <div className={styles.semanaGrid}>
          {semana.map((fecha) => {
            const dia = new Date(fecha + 'T12:00:00').getDay();
            const turnosDia = turnosDeDia(fecha);
            const bloqueosDia = bloqueosDelDia(fecha);
            const esHoy = fecha === toDateString(new Date());
            return (
              <Card key={fecha} className={`${styles.semanaDia} ${esHoy ? styles.semanaHoy : ''}`}>
                <div className={styles.semanaHeader}>
                  <div className={styles.semanaDiaNombre}>{DIAS[dia]}</div>
                  <div className={styles.semanaDiaNum}>{new Date(fecha + 'T12:00:00').getDate()}</div>
                </div>
                <div className={styles.semanaTurns}>
                  {bloqueosDia.length > 0 && (
                    <div className={styles.semanaBloqueo}>🔒 No laborable</div>
                  )}
                  {turnosDia.length === 0 && !bloqueosDia.length ? (
                    <div className={styles.semanaVacio}>—</div>
                  ) : (
                    turnosDia.map((t) => (
                      <div key={t.id} className={styles.semanaTurno}>
                        <span className={styles.semanaHora}>{new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className={styles.semanaCliente}>{t.cliente?.nombre}</span>
                      </div>
                    ))
                  )}
                </div>
                <button className={styles.semanaAgregar} onClick={() => { setSelectedDate(fecha); setView('dia'); setShowModal(true); }}>+</button>
              </Card>
            );
          })}
        </div>
      ) : view === 'mes' ? (
        <div className={styles.calendar}>
          <div className={styles.calendarHead}>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((letra, i) => (
              <div key={i} className={styles.calendarHeadCell}>{letra}</div>
            ))}
          </div>
          <div className={styles.calendarGrid}>
            {celdasMes.map((fecha, i) => {
              if (!fecha) return <div key={`v${i}`} className={styles.calendarCellEmpty} />;
              const dia = new Date(fecha + 'T12:00:00').getDate();
              const turnosDia = turnosDeMes(fecha);
              const esHoy = fecha === toDateString(new Date());
              const bloqueado = bloqueosDelDia(fecha).length > 0;
              return (
                <button key={fecha} className={`${styles.calendarCell} ${esHoy ? styles.calendarHoy : ''} ${bloqueado ? styles.calendarBloqueado : ''}`} onClick={() => { setSelectedDate(fecha); setView('dia'); }}>
                  <span className={styles.calendarNum}>{dia}</span>
                  <div className={styles.calendarDots}>
                    {turnosDia.length > 0 && <span className={styles.calendarCount}>{turnosDia.length}</span>}
                    {bloqueado && <span className={styles.calendarLock}>🔒</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.dayContent}>
          {/* Bloqueos del día */}
          {bloqueosDelDia(selectedDate).map((b) => (
            <Card key={b.id} className={styles.bloqueoCard}>
              <div className={styles.bloqueoInfo}>
                <span className={styles.bloqueoIcon}>🔒</span>
                <div>
                  <div className={styles.bloqueoTitulo}>{b.diaSemana != null ? `No laborable: ${DIAS[b.diaSemana]}` : b.horaInicio ? `Bloqueado de ${b.horaInicio} a ${b.horaFin}` : 'Día no laborable'}</div>
                  {b.motivo && <div className={styles.bloqueoMotivo}>{b.motivo}</div>}
                </div>
              </div>
              <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDeleteBloqueo(b.id)}>Eliminar</Button>
            </Card>
          ))}

          {turnos.length === 0 ? (
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
                        {t.duracionOverride && ` · ${t.duracionOverride} min`}
                        {t.profesional?.id && (
                          <span className={styles.profBadge} style={{ borderLeftColor: t.profesional?.color || 'currentColor' }}>
                            {t.profesional?.nombre}
                          </span>
                        )}
                        {t.serieId && <span className={styles.serieBadge}>🔁</span>}
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
                        {t.estado !== 'COMPLETADO' && t.estado !== 'CANCELADO' && (
                          <Button variant="ghost" size="sm" className={styles.moveBtn} onClick={() => setMoverTurno(t)} title="Reprogramar turno">✏️<span className={styles.btnLabel}>Reagendar</span></Button>
                        )}
                        {t.cliente?.telefono && (
                          <>
                            <a
                              href={`https://wa.me/${t.cliente.telefono.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola ${t.cliente.nombre}, te confirmo tu turno de ${t.servicio?.nombre} para ${new Date(t.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs.`)}`}
                              target="_blank" rel="noopener noreferrer" className={styles.waLink} title="Confirmar por WhatsApp">💬<span className={styles.btnLabel}>Confirmar</span></a>
                            <a
                              href={`https://wa.me/${t.cliente.telefono.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola ${t.cliente.nombre}! Te recuerdo tu turno de ${t.servicio?.nombre} el ${new Date(t.fecha).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs.`)}`}
                              target="_blank" rel="noopener noreferrer" className={styles.waLink} title="Recordar por WhatsApp">🔔<span className={styles.btnLabel}>Recordar</span></a>
                          </>
                        )}
                        {t.estado === 'PENDIENTE' && (
                          <Button variant="ghost" size="sm" onClick={() => handleEstado(t.id, 'COMPLETADO')}>✓<span className={styles.btnLabel}>Hecho</span></Button>
                        )}
                        {t.estado === 'PENDIENTE' && (
                          <Button variant="ghost" size="sm" onClick={() => abrirCobro(t)} className={styles.cobroBtn} title="Completar y cobrar">💰<span className={styles.btnLabel}>Cobrar</span></Button>
                        )}
                        {t.estado === 'PENDIENTE' && (
                          <Button variant="ghost" size="sm" onClick={() => marcarDeudaDesdeTurno(t)} className={styles.debeBtn} title="Marcar como debe">⏳<span className={styles.btnLabel}>Debe</span></Button>
                        )}
                        {t.estado === 'PENDIENTE' && (
                          <Button variant="ghost" size="sm" className={styles.cancelBtn} onClick={() => handleEstado(t.id, 'CANCELADO')}>✕<span className={styles.btnLabel}>Cancelar</span></Button>
                        )}
                        <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDelete(t.id)}>🗑<span className={styles.btnLabel}>Borrar</span></Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sugerencia de lista de espera al cancelar */}
      {sugeridoEspera && (
        <Modal title="¿Llamar a alguien de la lista de espera?" onClose={() => setSugeridoEspera(null)}>
          <div className={styles.sugerencia}>
            <p>Se canceló un turno. Hay gente esperando:</p>
            <div className={styles.sugeridoCliente}>{sugeridoEspera.cliente?.nombre}</div>
            {sugeridoEspera.cliente?.telefono && (
              <a
                className={styles.waBtn}
                href={`https://wa.me/${sugeridoEspera.cliente.telefono.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hola ${sugeridoEspera.cliente.nombre}, se liberó un turno. ¿Te interesa?`)}`}
                target="_blank" rel="noopener noreferrer"
              >
                💬 Llamar por WhatsApp
              </a>
            )}
            <div className={styles.formActions} style={{ marginTop: '0.75rem' }}>
              <Button variant="secondary" onClick={() => { handleQuitarEspera(sugeridoEspera.id); setSugeridoEspera(null); }}>Ya lo llamé, quitar</Button>
              <Button variant="ghost" onClick={() => setSugeridoEspera(null)}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}

      {showModal && (
        <Modal title="Nuevo turno" onClose={() => setShowModal(false)}>
          <TurnoForm
            clientes={clientes}
            servicios={servicios}
            profesionales={miembros}
            fechaDefault={selectedDate}
            turnosDelDia={turnos}
            onSave={handleSave}
            onCancel={() => setShowModal(false)}
            onCrearCliente={handleCrearCliente}
            loading={saving}
          />
        </Modal>
      )}

      {showBloqueo && (
        <Modal title="Bloquear horario" onClose={() => setShowBloqueo(false)}>
          <BloqueoForm onSave={handleBloqueo} onCancel={() => setShowBloqueo(false)} loading={saving} />
        </Modal>
      )}

      {moverTurno && (
        <Modal title={`Reprogramar turno de ${moverTurno.cliente?.nombre || 'cliente'}`} onClose={() => setMoverTurno(null)}>
          <ReprogramarForm
            turno={moverTurno}
            clientes={clientes}
            servicios={servicios}
            profesionales={miembros}
            onSave={handleReprogramar}
            onCancel={() => setMoverTurno(null)}
            loading={saving}
          />
        </Modal>
      )}

      {showEspera && (
        <Modal title={`Lista de espera (${espera.length})`} size="lg" onClose={() => setShowEspera(false)}>
          <EsperaPanel clientes={clientes} espera={espera} onAdd={handleEspera} onRemove={handleQuitarEspera} />
        </Modal>
      )}

      {msg && <div className={styles.toast}>{msg}</div>}

      {cobroTurno && (
        <Modal title={`Cobrar a ${cobroTurno.cliente?.nombre}`} onClose={() => setCobroTurno(null)}>
          <form onSubmit={cobrarTurno} className={styles.form}>
            <div className={styles.cobroServicio}>
              {cobroTurno.servicio?.nombre} · {new Date(cobroTurno.fecha).toLocaleDateString('es-AR')} {new Date(cobroTurno.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <Input
              label="Monto ($) *"
              type="number"
              min="0"
              step="0.01"
              value={cobroMonto}
              onChange={(e) => setCobroMonto(e.target.value)}
              required
            />
            <div className={styles.row}>
              <Input
                label="Propina ($)"
                type="number"
                min="0"
                step="0.01"
                value={cobroPropina}
                onChange={(e) => setCobroPropina(e.target.value)}
              />
              <div className={styles.formGroup}>
                <label className={styles.label}>Método *</label>
                <select className={styles.select} value={cobroMetodo} onChange={(e) => setCobroMetodo(e.target.value)}>
                  {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.formActions}>
              <Button type="button" variant="ghost" onClick={() => { marcarDeudaDesdeTurno(cobroTurno); setCobroTurno(null); }} disabled={cobroSaving}>
                Marcar como debe
              </Button>
              <Button type="submit" disabled={cobroSaving || !cobroMonto}>
                {cobroSaving ? 'Cobrando...' : '💰 Cobrar y completar'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function EsperaPanel({ clientes, espera, onAdd, onRemove }) {
  const [clienteId, setClienteId] = useState('');
  const [texto, setTexto] = useState('');

  return (
    <div>
      <div className={styles.form}>
        <SelectBusqueda
          label="Cliente en espera *"
          options={clientes.map((c) => ({ id: c.id, nombre: c.nombre, telefono: c.telefono || '' }))}
          valueKey="id"
          labelKey="nombre"
          secondary="telefono"
          placeholder="Seleccionar cliente..."
          searchPlaceholder="🔍 Buscar..."
          onSelect={(v) => setClienteId(v)}
        />
        {clienteId && (
          <p className={styles.clienteElegido}>✓ {clientes.find((c) => c.id === Number(clienteId))?.nombre}</p>
        )}
        <Input label="Nota (opcional)" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej: prefiere sábado a la tarde" />
        <div className={styles.formActions}>
          <Button onClick={() => { if (clienteId) { onAdd({ clienteId, texto }); setClienteId(''); setTexto(''); } }}>
            + Agregar a espera
          </Button>
        </div>
      </div>

      <div className={styles.esperaList}>
        {espera.length === 0 ? (
          <div className={styles.empty} style={{ padding: '1.5rem 0' }}>No hay clientes en lista de espera.</div>
        ) : (
          espera.map((e) => (
            <div key={e.id} className={styles.esperaItem}>
              <div className={styles.esperaPos}>{espera.indexOf(e) + 1}</div>
              <div className={styles.esperaInfo}>
                <div className={styles.esperaNombre}>{e.cliente?.nombre}</div>
                {e.texto && <div className={styles.esperaTexto}>{e.texto}</div>}
              </div>
              {e.cliente?.telefono && (
                <a className={styles.waLink} href={`https://wa.me/${e.cliente.telefono.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer">💬</a>
              )}
              <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => onRemove(e.id)}>🗑</Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
