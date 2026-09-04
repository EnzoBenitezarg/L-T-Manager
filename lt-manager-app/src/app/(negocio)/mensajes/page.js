'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import styles from './mensajes.module.css';

const NEGOCIO_ESTIMADO = 'tu barbería';
const LS_TEMPLATES = 'lm_diff_templates';
const LS_HISTORIAL = 'lm_diff_historial';

const PLANTILLAS_BASE = [
  { id: 'promo', nombre: '🎉 Promo', texto: '¡Hola {nombre}! 👋 Esta semana tenemos promo: 🪒 cortes a precio especial. ¿Te reservo? ¡Solo esta semana!' },
  { id: 'recordatorio', nombre: '🔔 Recordatorio', texto: '¡Hola {nombre}! Te recuerdo tu turno 📅 el dia con nuestro equipo. ¡Te esperamos! 🙌' },
  { id: 'cumple', nombre: '🎂 Cumpleaños', texto: '¡Feliz cumpleaños {nombre}! 🎂 Te deseamos lo mejor {negocio} y te regalamos un detalle en tu próxima visita. 🎁' },
  { id: 'puntos', nombre: '⭐ Puntos', texto: '¡Hola {nombre}! Tenés {puntos} puntos acumulados en {negocio}. ¡Canjealos en tu próxima visita! ✨' },
  { id: 'reactivacion', nombre: '💫 Reactivación', texto: '¡Hola {nombre}! Hace tiempo que no te vemos 😊 En {negocio} te preparamos una atención especial para tu vuelta. ¿Te anotás?' },
];

const PREFIJOS = [
  { token: '/promo', nombre: 'Promo', texto: '¡Hola {nombre}! 👋 Esta semana hay promo especial en {negocio}: 🪒 ¡Aprovechá! ¿Te reservo?' },
  { token: '/corte', nombre: 'Corte', texto: '¡Hola {nombre}! 💈 Tenemos cortes disponibles en {negocio}. ¿Te reservo un horario?' },
  { token: '/barba', nombre: 'Barba', texto: '¡Hola {nombre}! 🪒 Pasá por {negocio} y dale forma a tu barba con nosotros. ¿Cuándo venís?' },
  { token: '/duo', nombre: 'Corte+barba', texto: '¡Hola {nombre}! ✨ Combo corte + barba en {negocio} a precio especial. ¿Te anotás esta semana?' },
  { token: '/navi', nombre: 'Navidad', texto: '¡Hola {nombre}! 🎄 ¡Felices fiestas de parte de {negocio}! Te esperamos para que quedes impecable.' },
  { token: '/cumple', nombre: 'Cumpleaños', texto: '¡Feliz cumpleaños {nombre}! 🎂 Te deseamos lo mejor y te esperamos en {negocio} para celebrarlo. 🎁' },
  { token: '/puntos', nombre: 'Puntos', texto: '¡Hola {nombre}! Tenés {puntos} puntos en {negocio}. ¡Pasá a canjearlos! ⭐' },
  { token: '/recordatorio', nombre: 'Recordatorio', texto: '¡Hola {nombre}! 📅 Te confirmamos tu turno en {negocio}. ¡Te esperamos en tu horario habitual! 🙌' },
  { token: '/confirmar', nombre: 'Confirmar', texto: '¡Hola {nombre}! ¿Podés confirmarme tu turno en {negocio}? ¡Gracias! 🙏' },
  { token: '/cita', nombre: 'Agendar', texto: '¡Hola {nombre}! 💈 ¿Querés reservar tu turno en {negocio}? Te dejo nuestros horarios para que elijas.' },
  { token: '/reagra', nombre: 'Reprogramar', texto: '¡Hola {nombre}! 📅 Necesito reprogramar tu turno en {negocio}. ¿Te conviene otro día? ¡Gracias por tu paciencia!' },
  { token: '/saludo', nombre: 'Saludo', texto: '¡Hola {nombre}! 👋 ¡Qué gusto saludarte desde {negocio}! ¿En qué te podemos ayudar hoy?' },
  { token: '/gracias', nombre: 'Gracias', texto: '¡Hola {nombre}! 🙏 ¡Gracias por confiar en {negocio}! Te esperamos pronto 😊' },
  { token: '/nuevo', nombre: 'Bienvenida', texto: '¡Hola {nombre}! 👋 ¡Bienvenido a {negocio}! Pudimos registrar tu teléfono, cualquier cosa nos escribís. 😊' },
  { token: '/suerte', nombre: 'Reactivar', texto: '¡Hola {nombre}! 😊 En {negocio} queremos que vuelvas: esta semana tenés una atención especial esperándote. ¿Te reservo?' },
];

const PLACEHOLDERS = [
  { token: '{nombre}', label: 'Nombre', icon: '👤' },
  { token: '{puntos}', label: 'Puntos', icon: '⭐' },
  { token: '{saludo}', label: 'Saludo', icon: '👋' },
  { token: '{cumple}', label: 'Cumple', icon: '🎂' },
  { token: '{fecha}', label: 'Fecha', icon: '📅' },
  { token: '{negocio}', label: 'Negocio', icon: '💈' },
];

const ESTIMADO_SALUDO = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

function normalizarPrefijoLinea(texto) {
  // Expande el último token /xxx si existe en PREFIJOS
  const match = texto.match(/(^|\s)(\/[a-z]+)($|\s)/i);
  if (!match) return texto;
  const prefijo = PREFIJOS.find((p) => p.token.toLowerCase() === match[2].toLowerCase());
  if (!prefijo) return texto;
  return texto.replace(match[0], `${match[1]}${prefijo.texto}${match[3]}`);
}

function compilar(texto, extra) {
  return texto
    .replace(/\{saludo\}/g, ESTIMADO_SALUDO())
    .replace(/\{nombre\}/g, extra?.nombre || 'cliente')
    .replace(/\{puntos\}/g, String(extra?.puntos ?? '—'))
    .replace(/\{fecha\}/g, extra?.fecha || '')
    .replace(/\{negocio\}/g, extra?.negocio || NEGOCIO_ESTIMADO);
}

function textoParaCliente(texto, c, nombreNegocio = '') {
  const negocio = nombreNegocio || NEGOCIO_ESTIMADO;
  const base = compilar(texto, { nombre: c.nombre, puntos: c.puntos, negocio });
  return base.replace(/\{cumple\}/g, c.fechaNacimiento ? '🎂' : '');
}

function limpiarNumeros(tel) {
  return (tel || '').replace(/[^\d]/g, '');
}

export default function MensajesPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [etiquetaActiva, setEtiquetaActiva] = useState('');
  const [segmentoActivo, setSegmentoActivo] = useState('todos');
  const [seleccion, setSeleccion] = useState(new Set());
  const [plantillas, setPlantillas] = useState(PLANTILLAS_BASE);
  const [plantillaActiva, setPlantillaActiva] = useState('promo');
  const [mensaje, setMensaje] = useState('');
  const [modoAyuda, setModoAyuda] = useState(false);
  const [historial, setHistorial] = useState(null);
  const [envioIdx, setEnvioIdx] = useState(-1);
  const [envioLinks, setEnvioLinks] = useState([]);
  const [negocioNombre, setNegocioNombre] = useState('');
  const [incluirFirma, setIncluirFirma] = useState(false);
  const textareaRef = useRef(null);

  const fetchClientes = useCallback(async () => {
    const res = await fetch('/api/clientes');
    setClientes(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  useEffect(() => {
    fetch('/api/negocios/activo')
      .then((r) => r.json())
      .then((d) => setNegocioNombre(d?.negocio?.nombre || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const guardadas = JSON.parse(localStorage.getItem(LS_TEMPLATES) || '[]');
      if (Array.isArray(guardadas) && guardadas.length) {
        setPlantillas(guardadas);
        const inicial = guardadas.find((p) => p.id === 'promo') || guardadas[0];
        setPlantillaActiva(inicial.id);
        setMensaje(inicial.texto);
      } else {
        setMensaje(PLANTILLAS_BASE[0].texto);
      }
    } catch {
      setMensaje(PLANTILLAS_BASE[0].texto);
    }
    try {
      const h = JSON.parse(localStorage.getItem(LS_HISTORIAL) || 'null');
      setHistorial(h);
    } catch { /* noop */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_TEMPLATES, JSON.stringify(plantillas)); } catch { /* noop */ }
  }, [plantillas]);

  // Etiquetas disponibles
  const etiquetas = [...new Set(clientes.map((c) => c.etiquetas).filter(Boolean))];

  // Segmentos
  const seg = (c) => {
    if (segmentoActivo === 'cumple') {
      if (!c.fechaNacimiento) return false;
      const ahora = new Date();
      const f = new Date(c.fechaNacimiento);
      return f.getMonth() === ahora.getMonth();
    }
    if (segmentoActivo === 'puntos') return (c.puntos || 0) > 0;
    return true;
  };

  const conTelefono = clientes.filter((c) => c.telefono);
  const baseFiltrados = conTelefono.filter(seg).filter((c) =>
    !etiquetaActiva || (c.etiquetas || '').includes(etiquetaActiva)
  ).filter((c) =>
    !busqueda || c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || limpiarNumeros(c.telefono).includes(limpiarNumeros(busqueda))
  );

  const filtrados = baseFiltrados;
  const seleccionados = clientes.filter((c) => seleccion.has(c.id));

  const toggle = (id) => {
    const next = new Set(seleccion);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSeleccion(next);
  };

  const toggleTodos = () => {
    if (seleccion.size === filtrados.length) setSeleccion(new Set());
    else setSeleccion(new Set(filtrados.map((c) => c.id)));
  };

  const elegirPlantilla = (id) => {
    const p = plantillas.find((x) => x.id === id) || plantillas[0];
    setPlantillaActiva(p.id);
    setMensaje(p.texto);
  };

  const guardarPlantillaActual = () => {
    const id = plantillaActiva || `custom_${Date.now()}`;
    let nueva;
    if (plantillas.some((p) => p.id === id)) {
      nueva = plantillas.map((p) => (p.id === id ? { ...p, texto: mensaje } : p));
    } else {
      nueva = [...plantillas, { id, nombre: '✏️ Personalizada', texto: mensaje }];
    }
    setPlantillas(nueva);
    setPlantillaActiva(id);
  };

  const insertarPlaceholder = (token) => {
    const el = textareaRef.current;
    const inicio = el?.selectionStart ?? mensaje.length;
    const fin = el?.selectionEnd ?? mensaje.length;
    const nuevo = mensaje.slice(0, inicio) + token + mensaje.slice(fin);
    setMensaje(nuevo);
    requestAnimationFrame(() => {
      if (el) el.focus();
    });
  };

  const alCambiarMensaje = (e) => {
    const val = e.target.value;
    if ((val.endsWith(' ') || val.endsWith('\n')) && val.match(/(^|\s)\/[a-z]+$/i)) {
      const expandido = normalizarPrefijoLinea(val);
      if (expandido !== val) { setMensaje(expandido); return; }
    }
    setMensaje(val);
  };

  // Envios individuales (con envío por "Siguiente")
  const generarLinks = () =>
    seleccionados
      .filter((c) => c.telefono)
      .map((c) => {
        let msg = textoParaCliente(mensaje, c, negocioNombre);
        if (incluirFirma) msg = `${msg}\n\n— ${negocioNombre || NEGOCIO_ESTIMADO} —`;
        return {
          id: c.id,
          nombre: c.nombre,
          numero: limpiarNumeros(c.telefono),
          link: `https://wa.me/${limpiarNumeros(c.telefono)}?text=${encodeURIComponent(msg)}`,
        };
      });

  const empezarEnvio = () => {
    const links = generarLinks();
    if (!links.length) return;
    setEnvioLinks(links);
    setEnvioIdx(0);
    window.open(links[0].link, '_blank', 'noopener');
    registrarHistorial(links.length);
  };

  const siguienteEnvio = () => {
    const siguiente = envioIdx + 1;
    if (siguiente >= envioLinks.length) { setEnvioIdx(-1); setEnvioLinks([]); return; }
    setEnvioIdx(siguiente);
    window.open(envioLinks[siguiente].link, '_blank', 'noopener');
  };

  const cerrarEnvio = () => { setEnvioIdx(-1); setEnvioLinks([]); };

  const registrarHistorial = (n) => {
    const rec = { fecha: new Date().toLocaleString('es-AR'), n, mensaje, lista: seleccionados.length };
    setHistorial(rec);
    try { localStorage.setItem(LS_HISTORIAL, JSON.stringify(rec)); } catch { /* noop */ }
  };

  const repetirHistorial = () => {
    if (historial?.mensaje) setMensaje(historial.mensaje);
  };

  const copiarLinks = () => {
    const texto = generarLinks().map((l) => `${l.nombre}: ${l.link}`).join('\n');
    navigator.clipboard?.writeText(texto);
  };

  const exportarLinks = () => {
    if (!seleccionados.length) return;
    const filas = generarLinks().map((l) => `${l.nombre}\t${l.numero}\t${l.link}`).join('\n');
    const blob = new Blob(['\uFEFF' + filas], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'difusion-whatsapp.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const abrirIndividual = (c) => {
    const msg = textoParaCliente(mensaje, c, negocioNombre);
    window.open(`https://wa.me/${limpiarNumeros(c.telefono)}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  };

  const totalLinks = seleccionados.filter((c) => c.telefono).length;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Difusión por WhatsApp"
        subtitle="Plantillas, prefijos y envío rápido, todo gratis y sin apps"
      />

      {historial && (
        <div className={styles.historial}>
          <div>
            <strong>Última difusión:</strong> {historial.n} mensajes · {historial.fecha}
          </div>
          <button type="button" className={styles.miniBtn} onClick={repetirHistorial}>Repetir</button>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.left}>
          {/* Plantillas */}
          <Card className={styles.section}>
            <div className={styles.sectionTitle}>
              <span>📄 Plantilla</span>
              <button type="button" className={styles.miniBtn} onClick={() => setModoAyuda((v) => !v)}>
                {modoAyuda ? 'Ocultar ayuda' : 'Ayuda prefijos'}
              </button>
            </div>

            {modoAyuda && (
              <div className={styles.ayuda}>
                <p className={styles.ayudaIntro}>
                  Escribí un prefijo y un espacio para que se expanda a una frase lista para editar:
                </p>
                <div className={styles.prefijosGrid}>
                  {PREFIJOS.map((p) => (
                    <div className={styles.prefijoItem} key={p.token}>
                      <code className={styles.prefijoTok}>{p.token}</code>
                      <span className={styles.prefijoNom}>{p.nombre}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.chips}>
              {plantillas.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`${styles.chip} ${p.id === plantillaActiva ? styles.chipOn : ''}`}
                  onClick={() => elegirPlantilla(p.id)}
                >
                  {p.nombre}
                </button>
              ))}
              <button type="button" className={styles.chipAdd} onClick={guardarPlantillaActual} title="Guardar mensaje actual como plantilla">
                ＋ Guardar
              </button>
            </div>

            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={mensaje}
              onChange={alCambiarMensaje}
              placeholder={'¡Hola {nombre}! 👋 Tenemos promo especial en {negocio}. ¿Te reservo?'}
              rows={5}
            />

            <div className={styles.vars}>
              {PLACEHOLDERS.map((ph) => (
                <button type="button" key={ph.token} className={styles.varBtn} onClick={() => insertarPlaceholder(ph.token)} title={ph.label}>
                  {ph.icon} {ph.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Clientes: filtros + lista */}
          <Card className={styles.section}>
            <Input
              name="busqueda"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar por nombre o teléfono..."
              className={styles.searchInput}
            />
            <div className={styles.filtros}>
              <select
                className={styles.select}
                value={segmentoActivo}
                onChange={(e) => setSegmentoActivo(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="cumple">Cumple este mes 🎂</option>
                <option value="puntos">Con puntos ⭐</option>
              </select>
              <select
                className={styles.select}
                value={etiquetaActiva}
                onChange={(e) => setEtiquetaActiva(e.target.value)}
              >
                <option value="">Todas las etiquetas</option>
                {etiquetas.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            {cargando ? (
              <div className={styles.empty}>Cargando...</div>
            ) : (
              <div className={styles.clienteList}>
                <div className={styles.listHeader}>
                  <label className={styles.selectAll}>
                    <input type="checkbox" checked={filtrados.length > 0 && seleccion.size === filtrados.length} onChange={toggleTodos} />
                    <span>Todo el filtro</span>
                  </label>
                  <span className={styles.count}>{seleccion.size} · {filtrados.length}</span>
                </div>
                {filtrados.map((c) => (
                  <div key={c.id} className={styles.clienteRow}>
                    <label className={styles.clienteItem}>
                      <input type="checkbox" checked={seleccion.has(c.id)} onChange={() => toggle(c.id)} />
                      <span className={styles.clienteName}>{c.nombre}</span>
                      {c.etiquetas && <span className={styles.clienteTag}>{c.etiquetas}</span>}
                    </label>
                    <button type="button" className={styles.sendOne} title="Abrir chat con este cliente" onClick={() => abrirIndividual(c)}>💬</button>
                  </div>
                ))}
                {filtrados.length === 0 && <div className={styles.empty}>No hay clientes con teléfono que cumplan el filtro.</div>}
              </div>
            )}
          </Card>
        </div>

        <div className={styles.right}>
          <Card className={styles.compose}>
            <label className={styles.label}>Vista previa</label>
            <div className={styles.previews}>
              {seleccionados.slice(0, 2).map((c) => (
                <div key={c.id} className={styles.preview}>
                  <div className={styles.previewTitle}>{c.nombre}</div>
                  <div className={styles.previewText}>
                    {mensaje ? textoParaCliente(mensaje, c, negocioNombre) : '—'}
                  </div>
                </div>
              ))}
              {seleccionados.length === 0 && (
                <div className={styles.empty}>Seleccioná clientes para ver el mensaje personalizado.</div>
              )}
            </div>
          </Card>

          <label className={styles.firma}>
            <input type="checkbox" checked={incluirFirma} onChange={(e) => setIncluirFirma(e.target.checked)} />
            <span>Agregar firma del negocio al final</span>
          </label>
        </div>
      </div>

      {/* Barra de acciones fija abajo */}
      <div className={styles.actionsBar}>
        <span className={styles.totalCount}>{totalLinks} listos para difundir</span>
        <div className={styles.actions}>
          <Button variant="ghost" onClick={exportarLinks} disabled={!totalLinks}>💾 Archivo</Button>
          <Button variant="secondary" onClick={copiarLinks} disabled={!totalLinks}>📋 Copiar</Button>
          <Button variant="primary" onClick={empezarEnvio} disabled={!totalLinks}>
            🚀 Empezar envío
          </Button>
        </div>
      </div>

      {/* Flujo "Siguiente" */}
      {envioIdx >= 0 && (
        <div className={styles.envioOverlay}>
          <div className={styles.envioPanel}>
            <div className={styles.envioTitle}>Envío de difusión</div>
            <div className={styles.envioProgreso}>
              Cliente {envioIdx + 1} de {envioLinks.length} — presioná «Enviar» en WhatsApp y volvé acá
            </div>
            <div className={styles.envioBar}>
              <div className={styles.envioFill} style={{ width: `${((envioIdx + 1) / envioLinks.length) * 100}%` }} />
            </div>
            <div className={styles.envioBtns}>
              <Button variant="secondary" onClick={cerrarEnvio}>Detener</Button>
              <Button variant="primary" onClick={siguienteEnvio} disabled={envioIdx + 1 >= envioLinks.length}>
                {envioIdx + 1 >= envioLinks.length ? '¡Listo!' : 'Siguiente →'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
