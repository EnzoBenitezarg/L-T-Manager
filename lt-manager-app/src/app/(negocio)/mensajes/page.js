'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import styles from './mensajes.module.css';

export default function MensajesPage() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [mensaje, setMensaje] = useState('');

  const fetchClientes = useCallback(async () => {
    const res = await fetch('/api/clientes');
    setClientes(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const withTelefono = clientes.filter((c) => c.telefono);
  const filtered = withTelefono.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono.includes(search)
  );

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c) => c.id)));
  };

  const seleccionados = clientes.filter((c) => selected.has(c.id));

  const waLinks = seleccionados
    .filter((c) => c.telefono)
    .map((c) => ({
      nombre: c.nombre,
      numero: c.telefono.replace(/[^\d]/g, ''),
      link: `https://wa.me/${c.telefono.replace(/[^\d]/g, '')}?text=${encodeURIComponent(mensaje.replace(/\{nombre\}/g, c.nombre))}`,
    }));

  const copiarTodo = () => {
    const texto = waLinks.map((l) => `${l.nombre}: ${l.link}`).join('\n');
    navigator.clipboard?.writeText(texto);
  };

  // Abre cada enlace wa.me en una pestaña nueva (lo más parecido a enviar en lote)
  const abrirTodos = () => {
    if (waLinks.length === 0) return;
    if (!confirm(`¿Abrir ${waLinks.length} pestañas de WhatsApp? El navegador puede pedir permiso para varias ventanas.`)) return;
    waLinks.forEach((l, i) => {
      setTimeout(() => {
        window.open(l.link, '_blank', 'noopener');
      }, i * 300);
    });
  };

  const exportarLinks = () => {
    if (waLinks.length === 0) return;
    const filas = waLinks.map((l) => `${l.nombre}\t${l.numero}\t${l.link}`).join('\n');
    const blob = new Blob(['\uFEFF' + filas], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'difusion-whatsapp.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.page}>
      <PageHeader
        title="Difusión por WhatsApp"
        subtitle="Seleccioná clientes y generá el texto de promoción con sus enlaces wa.me para enviar manualmente"
      />

      <div className={styles.layout}>
        <div className={styles.left}>
          <div className={styles.searchBar}>
            <Input
              name="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Buscar cliente..."
              className={styles.searchInput}
            />
          </div>

          {loading ? (
            <div className={styles.empty}>Cargando clientes...</div>
          ) : (
            <div className={styles.clienteList}>
              <div className={styles.listHeader}>
                <label className={styles.selectAll}>
                  <input type="checkbox" checked={filtered.length > 0 && selected.size === filtered.length} onChange={toggleAll} />
                  <span>Seleccionar todos</span>
                </label>
                <span className={styles.count}>{selected.size} seleccionados</span>
              </div>
              {filtered.map((c) => (
                <label key={c.id} className={styles.clienteItem}>
                  <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                  <div className={styles.clienteInfo}>
                    <span className={styles.clienteName}>{c.nombre}</span>
                    <span className={styles.clienteTel}>📞 {c.telefono}</span>
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <div className={styles.empty}>No hay clientes con teléfono registrado.</div>
              )}
            </div>
          )}
        </div>

        <div className={styles.right}>
          <Card className={styles.compose}>
            <label className={styles.label}>Mensaje de promoción</label>
            <p className={styles.hint}>Usá {'{nombre}'} para personalizar con el nombre del cliente.</p>
            <textarea
              className={styles.textarea}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              placeholder={'¡Hola {nombre}! 👋 😀 Esta semana tenemos promo de corte + barba a $X. ¿Te anotás?'}
              rows={6}
            />
            <div className={styles.preview}>
              <div className={styles.previewTitle}>Vista previa (para {seleccionados[0]?.nombre || 'cliente'})</div>
              <div className={styles.previewText}>
                {mensaje ? mensaje.replace(/\{nombre\}/g, seleccionados[0]?.nombre || 'cliente') : '—'}
              </div>
            </div>
            <div className={styles.actions}>
              <Button variant="primary" onClick={abrirTodos} disabled={waLinks.length === 0}>
                🚀 Abrir todos
              </Button>
              <Button variant="secondary" onClick={copiarTodo} disabled={waLinks.length === 0}>
                📋 Copiar todos los links
              </Button>
              <Button variant="ghost" onClick={exportarLinks} disabled={waLinks.length === 0}>
                💾 Guardar en archivo
              </Button>
            </div>
            <p className={styles.hint}>
              Estos enlaces abren un chat de WhatsApp por cliente con el mensaje pre-armado. Como WhatsApp no permite envío
              masivo automático, la opción <strong>Abrir todos</strong> va abriendo cada chat para que presiones enviar.
            </p>
          </Card>
        </div>
      </div>

      {waLinks.length > 0 && (
        <div className={styles.linksSection}>
          <div className={styles.linksTitle}>Enlaces generados ({waLinks.length})</div>
          <div className={styles.linksGrid}>
            {waLinks.map((l, i) => (
              <a key={i} href={l.link} target="_blank" rel="noopener noreferrer" className={styles.linkCard}>
                <div className={styles.linkName}>{l.nombre}</div>
                <div className={styles.linkGo}>Enviar por WhatsApp →</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
