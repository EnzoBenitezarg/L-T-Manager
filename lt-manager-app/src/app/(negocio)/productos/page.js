'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import styles from './productos.module.css';

function ProductoForm({ inicial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(inicial || { nombre: '', precio: '', stock: '0', stockMinimo: '0' });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className={styles.form}>
      <Input label="Nombre del producto *" name="nombre" value={form.nombre} onChange={handleChange} required />
      <Input label="Precio ($) *" name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={handleChange} required />
      <div className={styles.row}>
        <Input label="Stock actual" name="stock" type="number" min="0" value={form.stock} onChange={handleChange} />
        <Input label="Stock mínimo" name="stockMinimo" type="number" min="0" value={form.stockMinimo} onChange={handleChange} />
      </div>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

function ComboForm({ servicios, onSave, onCancel, loading }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', servicios: [] });
  const toggleServicio = (id) => {
    const ids = form.servicios.includes(id) ? form.servicios.filter((s) => s !== id) : [...form.servicios, id];
    setForm({ ...form, servicios: ids });
  };
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className={styles.form}>
      <Input label="Nombre del combo *" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
      <Input label="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
      <Input label="Precio promocional ($) *" type="number" min="0" step="0.01" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
      <div className={styles.label}>Servicios incluidos</div>
      <div className={styles.checkList}>
        {servicios.map((s) => (
          <label key={s.id} className={styles.checkItem}>
            <input type="checkbox" checked={form.servicios.includes(s.id)} onChange={() => toggleServicio(s.id)} />
            <span>{s.nombre} (${Number(s.precio).toLocaleString('es-AR')})</span>
          </label>
        ))}
      </div>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading || form.servicios.length === 0}>{loading ? 'Guardando...' : 'Guardar combo'}</Button>
      </div>
    </form>
  );
}

export default function ProductosPage() {
  const [productos, setProductos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCombo, setShowCombo] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchData = useCallback(async () => {
    const [pRes, cRes, sRes] = await Promise.all([
      fetch('/api/productos'), fetch('/api/combos'), fetch('/api/servicios'),
    ]);
    setProductos(await pRes.json());
    setCombos(await cRes.json());
    setServicios(await sRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async (form) => {
    setSaving(true);
    const url = editing ? `/api/productos/${editing.id}` : '/api/productos';
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    await fetchData();
    setSaving(false);
    setShowModal(false);
    setEditing(null);
  };

  const handleCombo = async (form) => {
    setSaving(true);
    await fetch('/api/combos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    await fetchData();
    setSaving(false);
    setShowCombo(false);
  };

  const handleDelete = async (tipo, id) => {
    if (!confirm('¿Eliminar?')) return;
    await fetch(`/api/${tipo}/${id}`, { method: 'DELETE' });
    await fetchData();
  };

  const stockBajos = productos.filter((p) => p.stockBajo);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Productos y Combos"
        subtitle={`${productos.length} producto${productos.length !== 1 ? 's' : ''} · ${combos.length} combo${combos.length !== 1 ? 's' : ''}`}
        action={
          <div className={styles.headerActions}>
            <Button variant="secondary" onClick={() => setShowCombo(true)}>🎁 Combo</Button>
            <Button onClick={() => { setEditing(null); setShowModal(true); }}>+ Producto</Button>
          </div>
        }
      />

      {stockBajos.length > 0 && (
        <div className={styles.alerta}>
          ⚠️ {stockBajos.length} producto{stockBajos.length !== 1 ? 's' : ''} con stock bajo: {stockBajos.map((p) => p.nombre).join(', ')}
        </div>
      )}

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : (
        <>
          <div className={styles.sectionTitle}>Productos</div>
          {productos.length === 0 ? (
            <div className={styles.empty}>No hay productos registrados.</div>
          ) : (
            <div className={styles.grid}>
              {productos.map((p) => (
                <Card key={p.id} className={styles.productoCard}>
                  <div className={styles.productoInfo}>
                    <div className={styles.productoNombre}>{p.nombre}</div>
                    <div className={styles.productoPrecio}>${Number(p.precio).toLocaleString('es-AR')}</div>
                    <div className={`${styles.stockBadge} ${p.stockBajo ? styles.stockBajo : ''}`}>
                      Stock: {p.stock}{p.stockMinimo > 0 ? ` / mín ${p.stockMinimo}` : ''}
                      {p.stockBajo && ' ⚠️'}
                    </div>
                  </div>
                  <div className={styles.productoActions}>
                    <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setShowModal(true); }}>Editar</Button>
                    <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDelete('productos', p.id)}>Eliminar</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className={styles.sectionTitle} style={{ marginTop: '1.5rem' }}>Combos</div>
          {combos.length === 0 ? (
            <div className={styles.empty}>No hay combos. Creá uno para agrupar servicios con precio promocional.</div>
          ) : (
            <div className={styles.grid}>
              {combos.map((c) => (
                <Card key={c.id} className={styles.productoCard}>
                  <div className={styles.productoInfo}>
                    <div className={styles.productoNombre}>{c.nombre}</div>
                    <div className={styles.productoPrecio}>${Number(c.precio).toLocaleString('es-AR')}</div>
                    <div className={styles.comboServicios}>{c.servicios.map((s) => s.nombre).join(' + ')}</div>
                  </div>
                  <div className={styles.productoActions}>
                    <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDelete('combos', c.id)}>Eliminar</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <Modal title={editing ? 'Editar producto' : 'Nuevo producto'} onClose={() => setShowModal(false)}>
          <ProductoForm inicial={editing} onSave={handleSave} onCancel={() => setShowModal(false)} loading={saving} />
        </Modal>
      )}

      {showCombo && (
        <Modal title="Nuevo combo" onClose={() => setShowCombo(false)}>
          <ComboForm servicios={servicios} onSave={handleCombo} onCancel={() => setShowCombo(false)} loading={saving} />
        </Modal>
      )}
    </div>
  );
}


