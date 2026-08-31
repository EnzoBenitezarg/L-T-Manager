'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import styles from './clientes.module.css';

function ClienteForm({ inicial, onSave, onCancel, loading }) {
  const [form, setForm] = useState(inicial || { nombre: '', telefono: '', email: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input label="Nombre completo *" name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Ej: Juan García" />
      <Input label="Teléfono" name="telefono" type="tel" value={form.telefono || ''} onChange={handleChange} placeholder="Ej: 11 1234-5678" />
      <Input label="Email" name="email" type="email" value={form.email || ''} onChange={handleChange} placeholder="Ej: juan@email.com" />
      <div className={styles.formActions}>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  );
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);

  const fetchClientes = useCallback(async () => {
    const res = await fetch('/api/clientes');
    const data = await res.json();
    setClientes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const filtered = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (c.telefono && c.telefono.includes(search))
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

  return (
    <div className={styles.page}>
      <PageHeader 
        title="Clientes"
        subtitle={`${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} registrado${clientes.length !== 1 ? 's' : ''}`}
        action={<Button onClick={openNew}>+ Nuevo cliente</Button>}
      />

      <div className={styles.searchBar}>
        <Input
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre o teléfono..."
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
          {filtered.map((c) => (
            <Card key={c.id} className={styles.clienteCard}>
              <div className={styles.clienteAvatar}>
                {c.nombre.charAt(0).toUpperCase()}
              </div>
              <div className={styles.clienteInfo}>
                <div className={styles.clienteName}>{c.nombre}</div>
                {c.telefono && (
                  <a href={`tel:${c.telefono}`} className={styles.clienteDetail}>📞 {c.telefono}</a>
                )}
                {c.email && <div className={styles.clienteDetail}>✉️ {c.email}</div>}
                <div className={styles.clienteTurnos}>
                  {c._count?.turnos || 0} turno{(c._count?.turnos || 0) !== 1 ? 's' : ''}
                </div>
              </div>
              <div className={styles.clienteActions}>
                <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Editar</Button>
                <Button variant="ghost" size="sm" className={styles.deleteBtn} onClick={() => handleDelete(c.id)}>Eliminar</Button>
              </div>
            </Card>
          ))}
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
    </div>
  );
}
