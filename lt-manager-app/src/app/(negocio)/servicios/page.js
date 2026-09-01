'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import styles from './servicios.module.css';
import { esRubroRetail } from '@/lib/navegacion';

const RUBRO_META = {
  BARBERIA: { label: 'Duración', unidad: 'min', icon: '✂️' },
  ESTETICA: { label: 'Duración', unidad: 'min', icon: '💅' },
  GIMNASIO: { label: 'Duración', unidad: 'días', icon: '💪', sugerencias: ['Mensual', 'Trimestral', 'Anual'] },
  COMERCIO: { label: 'Duración', unidad: 'días', icon: '🏪' },
  ALMACEN: { label: 'Duración', unidad: 'días', icon: '🛒', sugerencias: ['Delivery', 'Envío', 'Pedido'] },
};

function ServicioForm({ inicial, onSave, onCancel, loading, rubro, conDuracion }) {
  const meta = RUBRO_META[rubro] || RUBRO_META.BARBERIA;
  const [form, setForm] = useState(
    inicial || { nombre: '', descripcion: '', precio: '', duracion: conDuracion ? '30' : '' }
  );
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input label="Nombre *" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej: Corte de cabello" />
      {meta.sugerencias && (
        <div className={styles.sugerencias}>
          {meta.sugerencias.map((s) => (
            <button key={s} type="button" className={styles.sugerencia} onClick={() => setForm({ ...form, nombre: s })}>
              {s}
            </button>
          ))}
        </div>
      )}
      <Input label="Descripción" name="descripcion" value={form.descripcion || ''} onChange={handleChange} placeholder="Descripción opcional" />
      <div className={styles.row}>
        <Input label="Precio ($) *" name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={handleChange} required placeholder="0.00" />
        {conDuracion && (
          <Input label={`${meta.label} (${meta.unidad})`} name="duracion" type="number" min="1" step={meta.unidad === 'min' ? '5' : '1'} value={form.duracion} onChange={handleChange} placeholder={meta.unidad === 'min' ? '30' : '30'} />
        )}
      </div>
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState([]);
  const [rubro, setRubro] = useState('BARBERIA');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const conDuracion = !esRubroRetail(rubro);
  const meta = RUBRO_META[rubro] || RUBRO_META.BARBERIA;

  const fetchData = useCallback(async () => {
    const [sRes, nRes] = await Promise.all([
      fetch('/api/servicios'),
      fetch('/api/negocios/activo'),
    ]);
    setServicios(await sRes.json());
    try {
      const nD = await nRes.json();
      if (nD.negocio?.rubro) setRubro(nD.negocio.rubro);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openNew = () => { setEditing(null); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSave = async (form) => {
    setSaving(true);
    const url = editing ? `/api/servicios/${editing.id}` : '/api/servicios';
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    await fetchData();
    setSaving(false);
    closeModal();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await fetch(`/api/servicios/${id}`, { method: 'DELETE' });
    await fetchData();
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Servicios"
        subtitle={`${servicios.length} servicio${servicios.length !== 1 ? 's' : ''} configurado${servicios.length !== 1 ? 's' : ''}`}
        action={<Button onClick={openNew}>+ Nuevo servicio</Button>}
      />

      {loading ? (
        <div className={styles.empty}>Cargando...</div>
      ) : servicios.length === 0 ? (
        <div className={styles.empty}>No hay servicios. Agregá los servicios que ofrece tu negocio.</div>
      ) : (
        <div className={styles.list}>
          {servicios.map((s) => (
            <Card key={s.id} className={styles.servicioCard}>
              <div className={styles.servicioIcon}>{meta.icon}</div>
              <div className={styles.servicioInfo}>
                <div className={styles.servicioNombre}>{s.nombre}</div>
                {s.descripcion && <div className={styles.servicioDesc}>{s.descripcion}</div>}
                <div className={styles.servicioBadges}>
                  <span className={styles.badge}>${Number(s.precio).toLocaleString('es-AR')}</span>
                  {conDuracion && (
                    <span className={`${styles.badge} ${styles.badgeSecondary}`}>
                      {s.duracion} {meta.unidad}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.servicioActions}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>Editar</Button>
                <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDelete(s.id)}>Eliminar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Editar servicio' : 'Nuevo servicio'} onClose={closeModal}>
          <ServicioForm inicial={editing} onSave={handleSave} onCancel={closeModal} loading={saving} rubro={rubro} conDuracion={conDuracion} />
        </Modal>
      )}
    </div>
  );
}
