'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import styles from './SelectBusqueda.module.css';

// Select con búsqueda (filtra al tipear) y opción de "seleccionar todos".
// Muestra una lista de opciones; al elegir una, llama a onSelect(valor).
export default function SelectBusqueda({
  label,
  options = [],
  valueKey = 'id',
  labelKey = 'nombre',
  secondary = '',
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  required = false,
  onSelect,
  allowClear = true,
  mostrarTodos = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlight, setHighlight] = useState(0);
  const ref = useRef(null);
  const listRef = useRef(null);

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const v = String(o[labelKey] || '').toLowerCase();
      const s = secondary && o[secondary] ? String(o[secondary]).toLowerCase() : '';
      return v.includes(q) || s.includes(q);
    });
  }, [options, search, labelKey, secondary]);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const abrir = () => {
    setSearch('');
    setHighlight(0);
    setOpen(true);
  };

  const cerrar = () => setOpen(false);

  function toggle() {
    if (open) {
      cerrar();
    } else {
      abrir();
    }
  }

  // Scroll al item resaltado
  useEffect(() => {
    const el = listRef.current?.children[highlight];
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  function handleKey(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        abrir();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtradas[highlight]) {
        onSelect(filtradas[highlight][valueKey]);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div className={`${styles.wrapper} ${className}`} ref={ref}>
      {label && <label className={styles.label}>{label}</label>}

      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''} ${required && options.length === 0 ? styles.disabled : ''}`}
        onClick={toggle}
        onKeyDown={handleKey}
        disabled={options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={placeholder && options.length === 0 ? styles.ph : ''}>
          {options.length === 0 ? 'No hay opciones' : placeholder}
        </span>
        <span className={styles.chevron}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={styles.panel}>
          <input
            autoFocus
            className={styles.input}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlight(0);
            }}
            onKeyDown={handleKey}
            placeholder={searchPlaceholder}
          />

          {mostrarTodos && filtradas.length > 0 && (
            <button
              type="button"
              className={styles.todos}
              onClick={() => {
                filtradas.forEach((o) => onSelect(o[valueKey]));
                setOpen(false);
              }}
            >
              + Agregar todos
            </button>
          )}

          <div className={styles.list} ref={listRef} role="listbox">
            {filtradas.length === 0 ? (
              <div className={styles.vacio}>Sin resultados</div>
            ) : (
              filtradas.map((o, i) => (
                <button
                  key={o[valueKey]}
                  type="button"
                  className={`${styles.item} ${i === highlight ? styles.itemActive : ''}`}
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    onSelect(o[valueKey]);
                    setOpen(false);
                  }}
                >
                  <span className={styles.itemLabel}>{o[labelKey]}</span>
                  {secondary && o[secondary] && (
                    <span className={styles.itemSec}>{o[secondary]}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
