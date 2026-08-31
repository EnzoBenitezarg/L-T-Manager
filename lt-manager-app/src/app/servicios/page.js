'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import styles from './servicios.module.css';

function ServicioForm({ inicial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(inicial || { nombre: '', descripcion: '', precio: '', duracion: '30' });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input label="Nombre del servicio *" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej: Corte de cabello" />
      <Input label="Descripción" name="descripcion" value={form.descripcion || ''} onChange={handleChange} placeholder="Descripción opcional" />
      <div className={styles.row}>
        <Input label="Precio ($) *" name="precio" type="number" min="0" step="0.01" value={form.precio} onChange={handleChange} required placeholder="0.00" />
        <Input label="Duración (min)" name="duracion" type="number" min="5" step="5" value={form.duracion} onChange={handleChange} placeholder="30" />
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchServicios = useCallback(async () => {
    const res = await fetch('/api/servicios');
    setServicios(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchServicios(); }, [fetchServicios]);

  const openNew = () => { setEditing(null); setShowModal(true); };
  const openEdit = (s) => { setEditing(s); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); };

  const handleSave = async (form) => {
    setSaving(true);
    const url = editing ? `/api/servicios/${editing.id}` : '/api/servicios';
    const method = editing ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    await fetchServicios();
    setSaving(false);
    closeModal();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await fetch(`/api/servicios/${id}`, { method: 'DELETE' });
    await fetchServicios();
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
              <div className={styles.servicioIcon}>✂️</div>
              <div className={styles.servicioInfo}>
                <div className={styles.servicioNombre}>{s.nombre}</div>
                {s.descripcion && <div className={styles.servicioDesc}>{s.descripcion}</div>}
                <div className={styles.servicioBadges}>
                  <span className={styles.badge}>${Number(s.precio).toLocaleString('es-AR')}</span>
                  <span className={`${styles.badge} ${styles.badgeSecondary}`}>{s.duracion} min</span>
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
          <ServicioForm inicial={editing} onSave={handleSave} onCancel={closeModal} loading={saving} />
        </Modal>
      )}
    </div>
  );
}
