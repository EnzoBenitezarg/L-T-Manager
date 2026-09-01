'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import SelectBusqueda from '@/components/ui/SelectBusqueda';
import styles from './ventas.module.css';
import { esRubroRetail } from '@/lib/navegacion';

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

export default function VentasPage() {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [turnosSinCobrar, setTurnosSinCobrar] = useState([]);
  const [rubro, setRubro] = useState('BARBERIA');
  const [modulosActivos, setModulosActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('nuevo'); // nuevo | historial
  const [tipo, setTipo] = useState('turno'); // turno | producto
  const [showModal, setShowModal] = useState(false);
  const [carrito, setCarrito] = useState([]);
  const [cobrandoId, setCobrandoId] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [saving, setSaving] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [formCobro, setFormCobro] = useState({ turnoId: '', monto: '', metodo: 'EFECTIVO', propina: '' });

  // Rubros que trabajan con turnos (cobro de turno/servicio)
  const usaTurnos = !esRubroRetail(rubro);
  const tieneProductos = modulosActivos.includes('productos');

  const showMensaje = (texto) => {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 2500);
  };

  const fetchData = useCallback(async () => {
    const [pRes, vRes, cRes, tRes, nRes] = await Promise.all([
      fetch('/api/productos'),
      fetch('/api/ventas'),
      fetch('/api/cobros'),
      fetch('/api/turnos'),
      fetch('/api/negocios/activo'),
    ]);
    setProductos(await pRes.json());
    setVentas(await vRes.json());
    setPagos(await cRes.json());
    const todos = await tRes.json();
    setTurnosSinCobrar(todos.filter((t) => !t.pago && (t.estado === 'PENDIENTE' || t.estado === 'COMPLETADO')));
    try {
      const nD = await nRes.json();
      if (nD.negocio?.rubro) setRubro(nD.negocio.rubro);
      if (Array.isArray(nD.negocio?.modulos)) setModulosActivos(nD.negocio.modulos);
      if (nD.negocio?.rubro && esRubroRetail(nD.negocio.rubro)) setTipo('producto');
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── COBRO EXPRESS: 1 click, efectivo, monto = precio ──
  const [expressMetodo, setExpressMetodo] = useState('EFECTIVO');
  const cobrarExpress = async (turno, metodo = expressMetodo) => {
    setCobrandoId(turno.id);
    try {
      const res = await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turnoId: turno.id,
          monto: turno.servicio?.precio || 0,
          metodo,
          propina: 0,
          descuento: 0,
        }),
      });
      if (!res.ok) throw new Error('No se pudo cobrar');
      const etiqueta = metodo === 'EFECTIVO' ? '💰' : metodo === 'TARJETA' ? '💳' : '🏦';
      showMensaje(`✅ ${etiqueta} Cobrado $${Number(turno.servicio?.precio || 0).toLocaleString('es-AR')} — ${turno.cliente?.nombre} (${metodo})`);
      await fetchData();
    } catch (e) {
      showMensaje('❌ No se pudo cobrar');
    } finally {
      setCobrandoId(null);
    }
  };

  const marcarDeudaExpress = async (turno) => {
    setCobrandoId(turno.id);
    await fetch('/api/cobros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnoId: turno.id, accion: 'FALTA_PAGAR' }),
    });
    showMensaje(`⏳ Marcado como debe — ${turno.cliente?.nombre}`);
    await fetchData();
    setCobrandoId(null);
  };

  const addProducto = (p) => {
    setCarrito((prev) => {
      const existente = prev.find((i) => i.productoId === p.id);
      if (existente) {
        return prev.map((i) => i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { productoId: p.id, cantidad: 1, precio: p.precio, nombre: p.nombre }];
    });
  };

  const totalVenta = carrito.reduce((acc, i) => acc + i.cantidad * Number(i.precio), 0);

  const handleVentaProducto = async (metodo) => {
    setSaving(true);
    try {
      await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: carrito, metodo }),
      });
      showMensaje(`✅ Venta registrada por $${totalVenta.toLocaleString('es-AR')}`);
      await fetchData();
      setCarrito([]);
      setShowModal(false);
    } catch {
      showMensaje('❌ No se pudo registrar la venta');
    } finally {
      setSaving(false);
    }
  };

  const cambiarTurnoCobro = (id) => {
    const t = turnosSinCobrar.find((x) => x.id === Number(id));
    setTurnoSeleccionado(t);
    setFormCobro({ ...formCobro, turnoId: id, monto: t?.servicio?.precio || '' });
  };

  const handleCobroTurno = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/cobros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formCobro),
      });
      showMensaje(`✅ Cobrado a ${turnoSeleccionado?.cliente?.nombre}`);
      await fetchData();
      setShowModal(false);
      setTurnoSeleccionado(null);
      setFormCobro({ turnoId: '', monto: '', metodo: 'EFECTIVO', propina: '' });
    } catch {
      showMensaje('❌ No se pudo cobrar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeuda = async (turnoId) => {
    setSaving(true);
    await fetch('/api/cobros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turnoId, accion: 'FALTA_PAGAR' }),
    });
    await fetchData();
    setSaving(false);
    setShowModal(false);
    setTurnoSeleccionado(null);
  };

  // Historial combinado: cobros de turnos + ventas de productos
  const historial = [
    ...pagos.map((p) => ({
      id: `c-${p.id}`,
      fecha: p.fecha,
      descripcion: `${p.turno?.cliente?.nombre} — ${p.turno?.servicio?.nombre}`,
      detalle: p.metodo + (p.propina > 0 ? ` · propina $${Number(p.propina).toLocaleString('es-AR')}` : ''),
      monto: Number(p.monto),
      metodo: p.metodo,
      tipo: 'turno',
    })),
    ...ventas.map((v) => ({
      id: `v-${v.id}`,
      fecha: v.fecha,
      descripcion: `Venta de productos: ${v.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(', ')}`,
      detalle: v.metodo,
      monto: v.items.reduce((a, i) => a + i.cantidad * Number(i.precio), 0),
      metodo: v.metodo,
      tipo: 'producto',
    })),
  ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const totalIngresos = historial.reduce((acc, h) => acc + h.monto, 0);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Ventas y Cobros"
        subtitle="Cobrá rápido o vendé productos, mirá todo el ingreso junto"
        action={<Button onClick={() => setShowModal(true)}>+ Nueva venta</Button>}
      />

      <div className={styles.totalBar}>
        <span>Ingresos registrados</span>
        <strong>${totalIngresos.toLocaleString('es-AR')}</strong>
      </div>

      {mensaje && <div className={styles.toast}>{mensaje}</div>}

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'nuevo' ? styles.tabActive : ''}`} onClick={() => setTab('nuevo')}>Registrar</button>
        <button className={`${styles.tab} ${tab === 'historial' ? styles.tabActive : ''}`} onClick={() => setTab('historial')}>Historial</button>
      </div>

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : tab === 'historial' ? (
        historial.length === 0 ? (
          <div className={styles.empty}>Todavía no registraste ninguna venta ni cobro.</div>
        ) : (
          <div className={styles.list}>
            {historial.map((h) => (
              <Card key={h.id} className={styles.ventaCard}>
                <div className={`${styles.hTipo} ${h.tipo === 'producto' ? styles.tipoProducto : styles.tipoTurno}`}>
                  {h.tipo === 'turno' ? '✂️' : '🛍️'}
                </div>
                <div className={styles.info}>
                  <div className={styles.desc}>{h.descripcion}</div>
                  <div className={styles.meta}>
                    {new Date(h.fecha).toLocaleString('es-AR')} • {h.detalle}
                  </div>
                </div>
                <div className={styles.ventaRight}>
                  <div className={styles.monto}>${h.monto.toLocaleString('es-AR')}</div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <div className={styles.registrar}>
          {usaTurnos && (
            <section className={styles.expressSection}>
              <div className={styles.expressTitle}>
                <span>⚡ Cobro express</span>
                <span className={styles.expressCount}>{turnosSinCobrar.length} pendientes</span>
              </div>
              {turnosSinCobrar.length === 0 ? (
                <div className={styles.expressEmpty}>No hay turnos sin cobrar. ¡Todo al día!</div>
              ) : (
                <>
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
                    {turnosSinCobrar.map((t) => (
                      <Card key={t.id} className={styles.expressItem}>
                        <div className={styles.expressInfo}>
                          <div className={styles.expressNombre}>{t.cliente?.nombre}</div>
                          <div className={styles.expressServicio}>
                            {t.servicio?.nombre} · {new Date(t.fecha).toLocaleDateString('es-AR')} {new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className={styles.expressPrecio}>${Number(t.servicio?.precio || 0).toLocaleString('es-AR')}</div>
                        <div className={styles.expressBtns}>
                          <button className={styles.cobrarBtn} onClick={() => cobrarExpress(t, expressMetodo)} disabled={cobrandoId === t.id}>
                            {cobrandoId === t.id ? '...' : `Cobrar (${expressMetodo})`}
                          </button>
                          <button className={styles.debeBtn} onClick={() => marcarDeudaExpress(t)} disabled={cobrandoId === t.id}>
                            Debe
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          {tieneProductos && (
            <section className={styles.expressSection}>
              <div className={styles.expressTitle}><span>🛍️ Venta de productos</span></div>
              <button className={styles.venderBtn} onClick={() => { setTipo('producto'); setShowModal(true); }}>
                + Registrar venta de productos
              </button>
              <p className={styles.expressHint}>Elegí los productos, armá el carrito y cobrá. Se descuenta el stock sola.</p>
            </section>
          )}
        </div>
      )}

      {showModal && (
        <Modal
          title={tipo === 'turno' && usaTurnos ? 'Cobrar turno' : 'Venta de productos'}
          size="lg"
          onClose={() => { setShowModal(false); setCarrito([]); setTurnoSeleccionado(null); }}
        >
          {tipo === 'turno' && usaTurnos ? (
            <form onSubmit={handleCobroTurno} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Turno a cobrar *</label>
                <SelectBusqueda
                  options={turnosSinCobrar.map((t) => ({
                    id: t.id,
                    nombre: `${t.cliente?.nombre} (${t.servicio?.nombre})`,
                    telefono: new Date(t.fecha).toLocaleDateString('es-AR'),
                  }))}
                  valueKey="id"
                  labelKey="nombre"
                  secondary="telefono"
                  placeholder="Seleccionar turno sin cobrar..."
                  searchPlaceholder="🔍 Buscar por cliente o servicio..."
                  onSelect={(v) => cambiarTurnoCobro(v)}
                />
              </div>
              {turnoSeleccionado && (
                <>
                  <div className={styles.row}>
                    <Input label="Monto ($) *" type="number" min="0" step="0.01" value={formCobro.monto} onChange={(e) => setFormCobro({ ...formCobro, monto: e.target.value })} required />
                    <Input label="Propina ($)" type="number" min="0" step="0.01" value={formCobro.propina || ''} onChange={(e) => setFormCobro({ ...formCobro, propina: e.target.value })} />
                  </div>
                </>
              )}
              <div className={styles.formActions}>
                <Button type="button" variant="ghost" onClick={() => { if (formCobro.turnoId) handleDeuda(formCobro.turnoId); }} disabled={!formCobro.turnoId || saving}>
                  Debe plata
                </Button>
                <Button type="submit" disabled={!formCobro.turnoId || saving}>{saving ? 'Guardando...' : 'Cobrar turno'}</Button>
              </div>
            </form>
          ) : (
            <div className={styles.venta}>
              <div className={styles.catalogo}>
                {productos.length === 0 ? (
                  <div className={styles.empty} style={{ padding: '1rem', border: '1px dashed var(--c-border)', borderRadius: 'var(--r-md)' }}>
                    No hay productos. Agregalos desde la sección Productos.
                  </div>
                ) : (
                  productos.map((p) => (
                    <button key={p.id} className={styles.catItem} onClick={() => addProducto(p)} disabled={p.stock === 0}>
                      <div>
                        <div className={styles.catNombre}>{p.nombre}</div>
                        <div className={styles.catStock}>Stock: {p.stock}</div>
                      </div>
                      <div className={styles.catPrecio}>${Number(p.precio).toLocaleString('es-AR')}</div>
                    </button>
                  ))
                )}
              </div>
              <div className={styles.carrito}>
                <div className={styles.carritoTitulo}>Carrito</div>
                {carrito.length === 0 ? (
                  <div className={styles.carritoVacio}>Tocá productos para agregarlos</div>
                ) : (
                  carrito.map((i) => (
                    <div key={i.productoId} className={styles.carritoItem}>
                      <span>{i.cantidad} × {i.nombre}</span>
                      <span>${(i.cantidad * Number(i.precio)).toLocaleString('es-AR')}</span>
                    </div>
                  ))
                )}
                <div className={styles.carritoTotal}>Total: ${totalVenta.toLocaleString('es-AR')}</div>
                <div className={styles.ventaBtns}>
                  {METODOS.map((m) => (
                    <Button key={m} variant="secondary" onClick={() => handleVentaProducto(m)} disabled={carrito.length === 0 || saving}>
                      {m}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
