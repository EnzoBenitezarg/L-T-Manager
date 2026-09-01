'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import styles from './clientes.module.css';

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

const MEM_ESTADO = {
  AL_DIA: { label: 'Al día', cls: 'memAlDia', icon: '✅' },
  POR_VENCER: { label: 'Por vencer', cls: 'memPorVencer', icon: '⏳' },
  VENCIDO: { label: 'Vencido', cls: 'memVencido', icon: '⚠️' },
};

function ClienteForm({ inicial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(
    inicial || { nombre: '', dni: '', telefono: '', email: '', notas: '', etiquetas: '' }
  );

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input label="Nombre completo *" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej: Juan García" />
      <Input label="DNI" name="dni" value={form.dni || ''} onChange={handleChange} placeholder="Ej: 35123456" />
      <Input label="Teléfono (recomendado)" name="telefono" type="tel" value={form.telefono || ''} onChange={handleChange} placeholder="Ej: 11 1234-5678" />
      <Input label="Email (opcional)" name="email" type="email" value={form.email || ''} onChange={handleChange} placeholder="Ej: juan@email.com" />
      <Input label="Etiquetas" name="etiquetas" value={form.etiquetas || ''} onChange={handleChange} placeholder='Ej: Alérgico a tintura, Prefiere tijera (separadas por coma)' />
      <Input label="Notas / preferencias" name="notas" value={form.notas || ''} onChange={handleChange} placeholder="Notas privadas del cliente" />
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

function FichaCliente({ cliente, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clientes/${cliente.id}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); });
  }, [cliente.id]);

  if (loading || !detail) {
    return <div className={styles.fichaLoading}>Cargando ficha...</div>;
  }

  const etiquetas = (detail.etiquetas || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  const waLink = detail.telefono
    ? `https://wa.me/${detail.telefono.replace(/[^\d]/g, '')}`
    : null;
  const waMsg = detail.telefono
    ? `https://wa.me/${detail.telefono.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Hola ' + detail.nombre + ', te escribo de tu negocio :)')}`
    : null;

  const mem = detail.membresia;

  return (
    <div className={styles.ficha}>
      <div className={styles.fichaHeader}>
        <div className={styles.clienteAvatar}>{detail.nombre.charAt(0).toUpperCase()}</div>
        <div>
          <div className={styles.fichaName}>{detail.nombre}</div>
          {etiquetas.length > 0 && (
            <div className={styles.tagRow}>
              {etiquetas.map((e, i) => (
                <span key={i} className={styles.tag}>{e}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.fichaContact}>
        {detail.dni && <div className={styles.fichaContactItem}>🪪 DNI {detail.dni}</div>}
        {detail.telefono && (
          <a href={`tel:${detail.telefono}`} className={styles.fichaContactItem}>📞 {detail.telefono}</a>
        )}
        {detail.email && <div className={styles.fichaContactItem}>✉️ {detail.email}</div>}
        {waMsg && (
          <a href={waMsg} target="_blank" rel="noopener noreferrer" className={styles.waBtn}>
            💬 WhatsApp
          </a>
        )}
      </div>

      {mem && (
        <div className={`${styles.memCard} ${styles[MEM_ESTADO[mem.estado]?.cls]}`}>
          <div className={styles.memIcon}>{MEM_ESTADO[mem.estado]?.icon}</div>
          <div className={styles.memInfo}>
            <div className={styles.memTitulo}>{MEM_ESTADO[mem.estado]?.label}</div>
            <div className={styles.memDetalle}>
              {mem.servicio} · paga ${Number(mem.monto).toLocaleString('es-AR')}
              {mem.diasParaVencer >= 0
                ? ` · vence en ${mem.diasParaVencer} día${mem.diasParaVencer !== 1 ? 's' : ''}`
                : ` · venció hace ${Math.abs(mem.diasParaVencer)} día${Math.abs(mem.diasParaVencer) !== 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      )}

      <div className={styles.fichaStats}>
        <div className={styles.fichaStat}>
          <div className={styles.fichaStatValue}>{detail.turnos?.length || 0}</div>
          <div className={styles.fichaStatLabel}>Turnos totales</div>
        </div>
        <div className={styles.fichaStat}>
          <div className={styles.fichaStatValue}>{detail.turnosCompletados || 0}</div>
          <div className={styles.fichaStatLabel}>Completados</div>
        </div>
        <div className={styles.fichaStat}>
          <div className={styles.fichaStatValue}>${Number(detail.totalGastado || 0).toLocaleString('es-AR')}</div>
          <div className={styles.fichaStatLabel}>Total gastado</div>
        </div>
      </div>

      {detail.notas && (
        <div className={styles.fichaNotas}>
          <div className={styles.fichaNotasTitle}>Notas</div>
          <div className={styles.fichaNotasBody}>{detail.notas}</div>
        </div>
      )}

      <div className={styles.fichaSection}>
        <div className={styles.fichaSectionTitle}>Historial de turnos</div>
        {detail.turnos?.length === 0 ? (
          <div className={styles.fichaEmpty}>Todavía no tiene turnos.</div>
        ) : (
          <div className={styles.timeline}>
            {detail.turnos.map((t) => (
              <div key={t.id} className={styles.timelineItem}>
                <div className={styles.timelineDate}>
                  {new Date(t.fecha).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  <div className={styles.timelineTime}>
                    {new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineServicio}>{t.servicio?.nombre}</div>
                  <div className={styles.timelineMeta}>
                    {t.estado === 'COMPLETADO' && t.pago
                      ? `Pago: $${Number(t.pago.monto).toLocaleString('es-AR')} (${t.pago.metodo})`
                      : t.estado === 'CANCELADO' ? 'Cancelado' : 'No cobrado'}
                  </div>
                </div>
                {waLink && (
                  <a
                    href={`https://wa.me/${detail.telefono.replace(/[^\d]/g, '')}?text=${encodeURIComponent('Hola ' + detail.nombre + ', te recuerdo tu turno de ' + t.servicio?.nombre + ' el ' + new Date(t.fecha).toLocaleDateString('es-AR') + ' a las ' + new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 'hs.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.timelineWa}
                  >
                    💬
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.formActions}>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [rubro, setRubro] = useState('BARBERIA');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [fichaCliente, setFichaCliente] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // Alta rápida
  const [quickOn, setQuickOn] = useState(true);
  const [quickNombre, setQuickNombre] = useState('');
  const [quickDni, setQuickDni] = useState('');
  const [quickTel, setQuickTel] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickMsg, setQuickMsg] = useState('');

  // Cobro de cuota (gimnasio)
  const [cuotaCliente, setCuotaCliente] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [cuotaForm, setCuotaForm] = useState({ servicioId: '', metodo: 'EFECTIVO', monto: '' });
  const [cuotaSaving, setCuotaSaving] = useState(false);

  const esGim = rubro === 'GIMNASIO';

  const fetchClientes = useCallback(async () => {
    const [cRes, nRes] = await Promise.all([
      fetch('/api/clientes'),
      fetch('/api/negocios/activo'),
    ]);
    setClientes(await cRes.json());
    try {
      const nD = await nRes.json();
      if (nD.negocio?.rubro) setRubro(nD.negocio.rubro);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const filtered = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono && c.telefono.includes(search)) ||
      (c.etiquetas && c.etiquetas.toLowerCase().includes(search.toLowerCase()))
  );

  const openNew = () => { setEditingCliente(null); setShowModal(true); };
  const openEdit = (c) => { setEditingCliente(c); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditingCliente(null); };

  const handleSave = async (form) => {
    setSaving(true);
    const url = editingCliente ? `/api/clientes/${editingCliente.id}` : '/api/clientes';
    const method = editingCliente ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    await fetchClientes();
    setSaving(false);
    closeModal();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
    await fetchClientes();
  };

  // Alta rápida: solo nombre + DNI + teléfono opcional
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickNombre.trim()) return;
    setQuickSaving(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: quickNombre.trim(), dni: quickDni.trim() || null, telefono: quickTel.trim() || null }),
      });
      if (!res.ok) {
        setQuickMsg('❌ Hubo un error. Verificá que el nombre no esté repetido.');
      } else {
        setQuickMsg(`✅ ${quickNombre.trim()} agregado`);
        setQuickNombre('');
        setQuickDni('');
        setQuickTel('');
        setTimeout(() => setQuickMsg(''), 2500);
      }
      await fetchClientes();
    } catch {
      setQuickMsg('❌ Error de conexión');
    } finally {
      setQuickSaving(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    const res = await fetch('/api/clientes/importar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto: importText }),
    });
    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    await fetchClientes();
  };

  // Abrir cobro de cuota
  const abrirCuota = async (cliente) => {
    setCuotaCliente(cliente);
    setCuotaForm({ servicioId: '', metodo: 'EFECTIVO', monto: '' });
    const res = await fetch('/api/servicios');
    setServicios(await res.json());
  };

  const registrarCuota = async (e) => {
    e.preventDefault();
    if (!cuotaForm.servicioId) return;
    setCuotaSaving(true);
    try {
      const res = await fetch('/api/cobros/cuota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clienteId: cuotaCliente.id, servicioId: cuotaForm.servicioId, metodo: cuotaForm.metodo, monto: cuotaForm.monto }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || 'No se pudo registrar la cuota');
      } else {
        setCuotaCliente(null);
        await fetchClientes();
        if (fichaCliente && fichaCliente.id === cuotaCliente.id) setFichaCliente(null);
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setCuotaSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} registrado${clientes.length !== 1 ? 's' : ''}`}
        action={
          <div className={styles.headerActions}>
            <Button variant="secondary" onClick={() => setShowImport(true)}>⬆️ Importar</Button>
            <Button onClick={openNew}>+ Nuevo cliente</Button>
          </div>
        }
      />

      {/* Alta rápida */}
      <div className={styles.quickToggleRow}>
        <span className={styles.quickToggleLabel}>Agregado rápido</span>
        <button
          type="button"
          className={`${styles.quickToggleBtn} ${quickOn ? styles.quickToggleOn : ''}`}
          onClick={() => setQuickOn(!quickOn)}
          title={quickOn ? 'Desactivar agregado rápido' : 'Activar agregado rápido'}
        >
          {quickOn ? '⚡ ON' : '⚡ OFF'}
        </button>
      </div>
      {quickOn && (
        <>
          <form onSubmit={handleQuickAdd} className={styles.quickBar}>
            <Input
              name="quickNombre"
              value={quickNombre}
              onChange={(e) => setQuickNombre(e.target.value)}
              placeholder="Nombre (ej: Pedro)"
              className={styles.quickNombre}
              required
            />
            <Input
              name="quickDni"
              value={quickDni}
              onChange={(e) => setQuickDni(e.target.value)}
              placeholder="DNI"
              className={styles.quickDni}
            />
            <Input
              name="quickTel"
              value={quickTel}
              onChange={(e) => setQuickTel(e.target.value)}
              placeholder="Teléfono"
              className={styles.quickTel}
            />
            <Button type="submit" disabled={quickSaving || !quickNombre.trim()}>
              {quickSaving ? '...' : '+ Agregar'}
            </Button>
          </form>
          {quickMsg && <div className={styles.quickMsg}>{quickMsg}</div>}
        </>
      )}

      <div className={styles.searchBar}>
        <Input
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre, teléfono o etiqueta..."
          className={styles.searchInput}
        />
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {search ? 'No se encontraron resultados.' : 'Todavía no hay clientes. ¡Agregá el primero!'}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((c) => {
            const etiquetas = (c.etiquetas || '').split(',').map((e) => e.trim()).filter(Boolean);
            const mem = c.membresia;
            return (
              <Card key={c.id} className={styles.clienteCard}>
                <div className={styles.clienteTop}>
                  <div className={styles.clienteAvatar}>
                    {c.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.clienteInfo}>
                    <div className={styles.clienteName}>{c.nombre}</div>
                    {esGim && mem && (
                      <span className={`${styles.memBadge} ${styles[MEM_ESTADO[mem.estado]?.cls]}`}>
                        {MEM_ESTADO[mem.estado]?.icon} {MEM_ESTADO[mem.estado]?.label}
                      </span>
                    )}
                    {!esGim && etiquetas.length > 0 && (
                      <div className={styles.tagRow}>
                        {etiquetas.slice(0, 3).map((e, i) => (
                          <span key={i} className={styles.tag}>{e}</span>
                        ))}
                        {etiquetas.length > 3 && <span className={styles.tag}>+{etiquetas.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
                {c.dni && <div className={styles.clienteDetail}>🪪 DNI {c.dni}</div>}
                {c.telefono && (
                  <a href={`tel:${c.telefono}`} className={styles.clienteDetail}>📞 {c.telefono}</a>
                )}
                {c.email && <div className={styles.clienteDetail}>✉️ {c.email}</div>}
                {esGim && mem && (
                  <div className={styles.clienteMem}>
                    {mem.servicio} · vence {mem.diasParaVencer >= 0 ? `en ${mem.diasParaVencer}d` : `hace ${Math.abs(mem.diasParaVencer)}d`}
                  </div>
                )}
                <div className={styles.clienteTurnos}>
                  {c._count?.turnos || 0} turno{(c._count?.turnos || 0) !== 1 ? 's' : ''}
                </div>
                <div className={styles.clienteActions}>
                  <Button variant="ghost" size="sm" onClick={() => setFichaCliente(c)}>Ver ficha</Button>
                  {esGim && (
                    <Button variant="ghost" size="sm" onClick={() => abrirCuota(c)}>Cobrar cuota</Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                  <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>Eliminar</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title={editingCliente ? 'Editar cliente' : 'Nuevo cliente'} onClose={closeModal}>
          <ClienteForm
            inicial={editingCliente}
            onSave={handleSave}
            onCancel={closeModal}
            loading={saving}
          />
        </Modal>
      )}

      {fichaCliente && (
        <Modal title="Ficha del cliente" size="lg" onClose={() => setFichaCliente(null)}>
          <FichaCliente cliente={fichaCliente} onClose={() => setFichaCliente(null)} />
        </Modal>
      )}

      {cuotaCliente && (
        <Modal title={`Cobrar cuota — ${cuotaCliente.nombre}`} onClose={() => setCuotaCliente(null)}>
          <form onSubmit={registrarCuota} className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Plan / servicio *</label>
              <select className={styles.select} value={cuotaForm.servicioId} onChange={(e) => {
                const sId = e.target.value;
                const s = servicios.find((x) => x.id === Number(sId));
                setCuotaForm({ ...cuotaForm, servicioId: sId, monto: s?.precio || '' });
              }} required>
                <option value="">Seleccionar plan...</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} (${Number(s.precio).toLocaleString('es-AR')})
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.row}>
              <Input label="Monto ($)" type="number" min="0" step="0.01" value={cuotaForm.monto} onChange={(e) => setCuotaForm({ ...cuotaForm, monto: e.target.value })} />
              <div className={styles.formGroup}>
                <label className={styles.label}>Método</label>
                <select className={styles.select} value={cuotaForm.metodo} onChange={(e) => setCuotaForm({ ...cuotaForm, metodo: e.target.value })}>
                  {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <p className={styles.cuotaHint}>La cuota marca el fin del periodo según la duración del plan (ej: Mensual = 30 días).</p>
            <div className={styles.formActions}>
              <Button variant="secondary" type="button" onClick={() => setCuotaCliente(null)}>Cancelar</Button>
              <Button type="submit" disabled={cuotaSaving || !cuotaForm.servicioId}>
                {cuotaSaving ? 'Registrando...' : 'Registrar cuota'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {showImport && (
        <Modal title="Importar clientes" size="lg" onClose={() => { setShowImport(false); setImportResult(null); setImportText(''); }}>
          <div className={styles.import}>
            {!importResult ? (
              <>
                <p className={styles.importHint}>
                  Pegá los nombres y teléfonos copiados de WhatsApp, uno por línea. Ejemplo:
                </p>
                <pre className={styles.importExample}>{`Juan García 11 2345 6789
María Pérez +54 9 11 9876 5432
Carla López 351 555 1234`}</pre>
                <textarea
                  className={styles.importTextarea}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Ej: Pedro Gómez 11 1234 5678&#10;Lucía Fernández 351 555 9999"
                  rows={8}
                />
                <div className={styles.formActions}>
                  <Button variant="secondary" onClick={() => setShowImport(false)}>Cancelar</Button>
                  <Button onClick={handleImport} disabled={importing || !importText.trim()}>
                    {importing ? 'Importando...' : 'Importar clientes'}
                  </Button>
                </div>
              </>
            ) : (
              <div className={styles.importResult}>
                <div className={styles.importSummary}>
                  ¡Listo! Se procesaron {importResult.total} líneas.
                </div>
                {importResult.nuevos.length > 0 && (
                  <div className={styles.importBlock}>
                    <div className={styles.importBlockTitle}>✅ {importResult.nuevos.length} importados</div>
                    {importResult.nuevos.map((c) => (
                      <div key={c.id} className={styles.importItem}>{c.nombre}</div>
                    ))}
                  </div>
                )}
                {importResult.existentes.length > 0 && (
                  <div className={styles.importBlock}>
                    <div className={styles.importBlockTitle}>⚠️ {importResult.existentes.length} ya existían</div>
                    {importResult.existentes.map((c, i) => (
                      <div key={i} className={styles.importItem}>{c.nombre} — {c.razon}</div>
                    ))}
                  </div>
                )}
                {importResult.invalidos.length > 0 && (
                  <div className={styles.importBlock}>
                    <div className={styles.importBlockTitle}>❌ {importResult.invalidos.length} sin teléfono</div>
                    {importResult.invalidos.map((c, i) => (
                      <div key={i} className={styles.importItem}>{c.nombre} — {c.razon}</div>
                    ))}
                  </div>
                )}
                <div className={styles.formActions}>
                  <Button onClick={() => { setShowImport(false); setImportResult(null); setImportText(''); }}>
                    Listo
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
