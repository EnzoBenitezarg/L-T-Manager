'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Markdown from '@/components/ui/Markdown';
import styles from './page.module.css';

const CAPACIDADES = ['Metricas', 'Clientes', 'Servicios', 'Stock', 'Ingresos', 'WhatsApp'];

const MENSAJES_ESPERA = [
  'Analizando tu negocio...',
  'Consultando tus datos...',
  'Pensando...',
  'Buscando en tus registros...',
  'Armando la respuesta...',
];

const STORAGE_HISTORIAL_KEY = 'lt_ia_historial';

const EMPTY_MENSAJES = Object.freeze([]);

// Mapea el tipo de error del backend a un mensaje claro y accionable
const ERRORES_UI = {
  NO_NEGOCIO: { titulo: 'Sin negocio activo', detalle: 'Elegí un negocio desde "Mis negocios" y volvé a intentar.' },
  SIN_CONFIGURAR: { titulo: 'Asistente no configurado', detalle: 'Faltan las credenciales de Cloudflare en el archivo .env.' },
  REQ_INVALIDA: { titulo: 'Solicitud inválida', detalle: 'Hubo un problema con lo que enviaste. Volvé a intentar.' },
  SIN_MENSAJE: { titulo: 'Mensaje vacío', detalle: 'Escribí una pregunta antes de enviar.' },
  ERROR_CONTEXTO: { titulo: 'No pude leer tus datos', detalle: 'Hubo un error al acceder a la información de tu negocio. Intentá de nuevo en unos instantes.' },
  TIMEOUT: { titulo: 'El asistente se demoró', detalle: 'Tardó demasiado en responder. Probá con una pregunta más corta o reintentá.' },
  SIN_RED: { titulo: 'Sin conexión', detalle: 'No se pudo conectar con el servicio de IA. Comprobá tu internet e intentá de nuevo.' },
  CREDENCIALES_INVALIDAS: { titulo: 'Problema de configuración', detalle: 'Las credenciales de Cloudflare no son válidas. Revisá el token y el Account ID en .env.' },
  LÍMITE: { titulo: 'Límite alcanzado', detalle: 'Se usaron todas las solicitudes gratuitas de hoy. Volvé más tarde.' },
  ERROR_MODELO: { titulo: 'No pude procesar la pregunta', detalle: 'La IA falló al responder. Probá reformular tu pregunta.' },
  ERROR_SERVICIO: { titulo: 'Servicio con problemas', detalle: 'La IA está teniendo inconvenientes. Reintentá en unos minutos.' },
  RESPUESTA_CORRUPTA: { titulo: 'Respuesta corrupta', detalle: 'La respuesta llegó incompleta. Volvé a intentar.' },
  SIN_RESPUESTA: { titulo: 'Sin respuesta', detalle: 'La IA no generó contenido. Probá preguntar de otra forma.' },
};

function formatHora() {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function nuevoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return [Math.floor(Math.random() * 1e9), Date.now()].join('|');
}

function ahoraMs() {
  return new Date().getTime();
}

function formatFechaRelativa(ts) {
  const ref = ts || ahoraMs();
  const diff = ahoraMs() - ref;
  const enMin = Math.floor(diff / 60000);
  if (enMin < 60) return `hace ${Math.max(enMin, 1)} min`;
  const enHs = Math.floor(enMin / 60);
  if (enHs < 24) return `hace ${enHs} h`;
  return new Date(ref).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function getIconoSugerencia(tipo) {
  const iconos = {
    'Deuda': '!',
    'Stock': '#',
    'Tendencia': '~',
    'Turnos': ':',
    'Servicio': '*',
    'Clientes': '@',
    'Margen': '%',
    'Productos': '^',
    'Cancelaciones': 'x',
    'Equipo': '&',
  };
  return iconos[tipo] || '?';
}

function extraerMensajeWhatsApp(texto) {
  const match = texto.match(/\[MENSAJE WHATSAPP\]\s*([\s\S]*?)\s*\[\/MENSAJE WHATSAPP\]/);
  return match ? match[1].trim() : null;
}

function limpiarTextoParaMostrar(texto) {
  return texto.replace(/\[MENSAJE WHATSAPP\][\s\S]*?\[\/MENSAJE WHATSAPP\]/, '').trim();
}

export default function AsistenteIA() {
  const [conversaciones, setConversaciones] = useState([]);
  const [idActiva, setIdActiva] = useState(null);
  const [input, setInput] = useState('');
  const [cargando, setCargando] = useState(false);
  const [textoEspera, setTextoEspera] = useState(MENSAJES_ESPERA[0]);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [sugerencias, setSugerencias] = useState([]);

  const conversacionActiva = useMemo(
    () => conversaciones.find((c) => c.id === idActiva) || null,
    [conversaciones, idActiva]
  );
  const mensajes = useMemo(
    () => (conversacionActiva ? conversacionActiva.mensajes : EMPTY_MENSAJES),
    [conversacionActiva]
  );

  function persistir(lista) {
    try {
      localStorage.setItem(STORAGE_HISTORIAL_KEY, JSON.stringify(lista));
    } catch {
      // se ignora si no se puede guardar
    }
  }

  // Cargar historial al montar
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_HISTORIAL_KEY);
      if (guardado) {
        const parsed = JSON.parse(guardado);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversaciones(parsed);
          setIdActiva(parsed[0].id);
          return;
        }
      }
    } catch {
      // localStorage no disponible
    }
    const id = nuevoId();
    const nueva = { id, titulo: 'Nueva consulta', creado: ahoraMs(), mensajes: [] };
    setConversaciones([nueva]);
    setIdActiva(id);
  }, []);

  // Cargar sugerencias dinamicas al montar
  useEffect(() => {
    fetch('/api/ia/sugerencias')
      .then((r) => r.json())
      .then((data) => {
        if (data?.sugerencias?.length) {
          setSugerencias(data.sugerencias);
        }
      })
      .catch(() => {});
  }, []);

  function nuevaConsulta() {
    const id = nuevoId();
    const nueva = { id, titulo: 'Nueva consulta', creado: ahoraMs(), mensajes: [] };
    const lista = [nueva, ...conversaciones].slice(0, 30);
    setConversaciones(lista);
    setIdActiva(id);
    persistir(lista);
    setFiltro(null);
    setInput('');
    setHistorialAbierto(false);
    inputRef.current?.focus();
  }

  function eliminarConversacion(id) {
    const lista = conversaciones.filter((c) => c.id !== id);
    let nuevoId = idActiva;
    if (id === idActiva) {
      nuevoId = lista[0]?.id || null;
      setIdActiva(nuevoId);
      if (!nuevoId) {
        const nId = nuevoId();
        const nueva = { id: nId, titulo: 'Nueva consulta', creado: ahoraMs(), mensajes: [] };
        lista.unshift(nueva);
        setIdActiva(nId);
      }
    }
    setConversaciones(lista);
    persistir(lista);
  }

  function seleccionar(id) {
    setIdActiva(id);
    setFiltro(null);
    setHistorialAbierto(false);
  }

  // Auto-scroll suave al final
  useEffect(() => {
    const chat = chatRef.current;
    if (!chat) return;
    chat.scrollTo({ top: chat.scrollHeight, behavior: mensajes.length > 0 ? 'smooth' : 'auto' });
  }, [mensajes, cargando, textoEspera]);

  // Auto-crecer el textarea mientras se escribe
  function handleInput(e) {
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    setInput(el.value);
  }

  // Ciclar textos de espera mientras carga
  useEffect(() => {
    if (!cargando) return;
    let i = 0;
    setTextoEspera(MENSAJES_ESPERA[0]);
    const timer = setInterval(() => {
      i = (i + 1) % MENSAJES_ESPERA.length;
      setTextoEspera(MENSAJES_ESPERA[i]);
    }, 1400);
    return () => clearInterval(timer);
  }, [cargando]);

  // Deriva un título a partir del primer mensaje del usuario
  function derivarTitulo(mensajesLista) {
    const primero = mensajesLista.find((m) => m.role === 'user');
    if (!primero) return 'Nueva consulta';
    const t = primero.content.trim();
    return t.length > 42 ? t.slice(0, 42) + '…' : t;
  }

  function actualizarConversacion(id, nuevaListaMensajes) {
    setConversaciones((prev) => {
      const lista = prev.map((c) =>
        c.id === id ? { ...c, mensajes: nuevaListaMensajes, titulo: derivarTitulo(nuevaListaMensajes), creado: ahoraMs() } : c
      );
      persistir(lista);
      return lista;
    });
  }

  async function enviar(mensaje) {
    const texto = (mensaje || input).trim();
    if (!texto || cargando) return;

    const idActual = idActiva ?? nuevoId();
    const hora = formatHora();
    const listaMensajesBase = [...mensajes, { id: nuevoId(), role: 'user', content: texto, hora }];
    const existeConv = conversaciones.some((c) => c.id === idActual);

    if (!existeConv) {
      const nueva = { id: idActual, titulo: 'Nueva consulta', creado: ahoraMs(), mensajes: listaMensajesBase };
      const listaNueva = [nueva, ...conversaciones].slice(0, 30);
      setConversaciones(listaNueva);
      setIdActiva(idActual);
      persistir(listaNueva);
    } else {
      actualizarConversacion(idActual, listaMensajesBase);
    }

    setInput('');
    setCargando(true);

    try {
      // Enviar historial reciente para contexto de conversacion
      const historialReciente = mensajes.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: texto, historial: historialReciente }),
      });
      const data = await res.json();

      if (res.ok && data.respuesta) {
        const final = [...listaMensajesBase, { id: nuevoId(), role: 'assistant', content: data.respuesta, hora: formatHora() }];
        actualizarConversacion(idActual, final);
      } else {
        const tipo = data?.tipo || 'ERROR_SERVICIO';
        const info = ERRORES_UI[tipo] || ERRORES_UI.ERROR_SERVICIO;
        const final = [...listaMensajesBase, { id: nuevoId(), role: 'assistant', content: `**${info.titulo}**\n\n${info.detalle}`, hora: formatHora(), esError: true }];
        actualizarConversacion(idActual, final);
      }
    } catch {
      const final = [...listaMensajesBase, { id: nuevoId(), role: 'assistant', content: `**Sin conexión**\n\nNo se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.`, hora: formatHora(), esError: true }];
      actualizarConversacion(idActual, final);
    } finally {
      setCargando(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  async function copiar(mensaje) {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiadoId(mensaje);
      setTimeout(() => setCopiadoId(null), 1500);
    } catch {
      // si falla el portapapeles, se ignora silenciosamente
    }
  }

  const vacio = useMemo(() => mensajes.length === 0 && !cargando, [mensajes, cargando]);

  const conversacionesFiltradas = useMemo(() => {
    const ordenadas = [...conversaciones].sort((a, b) => (b.creado || 0) - (a.creado || 0));
    return {
      hoy: ordenadas.filter((c) => {
        const d = new Date(c.creado).toDateString();
        return d === new Date().toDateString();
      }),
      previas: ordenadas.filter((c) => new Date(c.creado).toDateString() !== new Date().toDateString()),
    };
  }, [conversaciones]);

  return (
    <div className={styles.page}>
      {/* ─── Historial ─────────── */}
      <aside className={`${styles.sideCol} ${historialAbierto ? styles.sideColOpen : ''}`}>
        <div className={styles.sideColHeader}>
          <button className={styles.btnNewQuery} onClick={nuevaConsulta}>
            <span className={styles.btnNewText}>
              <span className={styles.btnNewIcon}>+</span>
              <span>Nueva consulta</span>
            </span>
            <span className={styles.shortcut}>⌘N</span>
          </button>
          <button className={styles.sideCloseBtn} onClick={() => setHistorialAbierto(false)} aria-label="Cerrar historial">✕</button>
        </div>

        <div className={`${styles.card} ${styles.historyCard}`}>
          <span className={styles.cardLabel}>Historial</span>
          <div className={styles.historyList}>
            {conversacionesFiltradas.hoy.length > 0 && (
              <div className={styles.historySection}>
                <div className={styles.historySectionHeader}>
                  <span className={styles.historySectionLabel}>Hoy</span>
                  <span className={styles.historySectionCount}>{conversacionesFiltradas.hoy.length}</span>
                </div>
                {conversacionesFiltradas.hoy.map((c) => (
                  <HistoryItem key={c.id} conv={c} activa={c.id === idActiva} onSelect={seleccionar} onDelete={eliminarConversacion} />
                ))}
              </div>
            )}
            {conversacionesFiltradas.previas.length > 0 && (
              <div className={styles.historySection}>
                <div className={styles.historySectionHeader}>
                  <span className={styles.historySectionLabel}>Anteriores</span>
                </div>
                {conversacionesFiltradas.previas.slice(0, 8).map((c) => (
                  <HistoryItem key={c.id} conv={c} activa={c.id === idActiva} onSelect={seleccionar} onDelete={eliminarConversacion} />
                ))}
              </div>
            )}
            {conversaciones.length === 0 && <p className={styles.historyEmpty}>No hay conversaciones todavía.</p>}
          </div>
        </div>
      </aside>

      {historialAbierto && <div className={styles.backdrop} onClick={() => setHistorialAbierto(false)} />}

      {/* ─── Workspace del chat ─────────── */}
      <section className={styles.workspace}>
        <div className={styles.workspaceHeader}>
          <div className={styles.workspaceHeaderLeft}>
            <button className={styles.menuBtn} onClick={() => setHistorialAbierto(true)} aria-label="Ver historial">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className={styles.menuIcon}>
                <path d="M3 6h18M9 12h12M3 18h18" />
              </svg>
            </button>
            <div className={styles.workspaceAvatar}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="" className={styles.workspaceAvatarImg} />
            </div>
            <div className={styles.workspaceHeaderInfo}>
              <div className={styles.workspaceHeaderTitles}>
                <h2 className={styles.workspaceTitle}>Asistente IA De L&T</h2>
              </div>
              <p className={styles.workspaceSub}>Analizando los datos de tu negocio</p>
            </div>
          </div>
          <div className={styles.workspaceActions}>
            {mensajes.length > 0 && (
              <button className={styles.iconBtn} onClick={nuevaConsulta} title="Limpiar conversación" aria-label="Limpiar conversación">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={styles.iconBtnSvg}>
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className={styles.chat} ref={chatRef}>
          {vacio && (
            <div className={styles.welcome}>
              <div className={styles.welcomeBanner}>
                <span className={styles.welcomeEmoji}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.jpg" alt="" className={styles.welcomeLogo} />
                </span>
                <div className={styles.welcomeBannerText}>
                  <span className={styles.welcomeTitle}>Asistente IA De L&T</span>
                </div>
                <p className={styles.welcomeText}>
                  Soy tu asistente inteligente. Puedo responder preguntas sobre tus clientes, servicios, productos e ingresos en tiempo real.
                </p>
              </div>

              <div className={styles.capabilities}>
                {CAPACIDADES.map((c) => (
                  <span key={c} className={styles.capability}>{c}</span>
                ))}
              </div>

              {sugerencias.length > 0 && (
                <div className={styles.sugerenciasContainer}>
                  <div className={styles.sugerenciasLabel}>Insights de tu negocio:</div>
                  {sugerencias.map((s) => (
                    <button
                      key={s.id}
                      className={styles.sugerenciaCard}
                      onClick={() => enviar(s.accion)}
                      title={s.descripcion}
                    >
                      <div className={styles.sugerenciaIcono}>{getIconoSugerencia(s.icono)}</div>
                      <div className={styles.sugerenciaInfo}>
                        <div className={styles.sugerenciaTitulo}>{s.titulo}</div>
                        <div className={styles.sugerenciaDesc}>{s.descripcion}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

            </div>
          )}

          {mensajes.map((m, i) => {
            const esUltimo = i === mensajes.length - 1;
            const mostrarAvatarAsistente = esUltimo || (mensajes[i + 1]?.role !== 'assistant');
            const mostrarAvatarUsuario = esUltimo || (mensajes[i + 1]?.role !== 'user');
            const mensajeWhatsApp = m.role === 'assistant' ? extraerMensajeWhatsApp(m.content) : null;
            const contenidoParaMostrar = m.role === 'assistant' ? limpiarTextoParaMostrar(m.content) : m.content;
            return (
              <div key={m.id ?? i} className={`${styles.mensaje} ${m.role === 'user' ? styles.userMsg : styles.assistantMsg} ${m.esError ? styles.errorMsg : ''}`}>
                {m.role === 'assistant' && mostrarAvatarAsistente && <span className={styles.avatar}>{m.esError ? '!' : '*'}</span>}
                <div className={styles.mensajeCol}>
                  <div className={styles.burbuja}>
                    {m.role === 'assistant' ? <Markdown content={contenidoParaMostrar} /> : m.content}
                  </div>
                  {mensajeWhatsApp && (
                    <div className={styles.whatsappPreview}>
                      <div className={styles.whatsappLabel}>Mensaje para WhatsApp:</div>
                      <div className={styles.whatsappTexto}>{mensajeWhatsApp}</div>
                      <button
                        className={styles.whatsappCopyBtn}
                        onClick={() => copiar(mensajeWhatsApp)}
                        title="Copiar mensaje para WhatsApp"
                      >
                        {copiadoId === mensajeWhatsApp ? 'Copiado!' : 'Copiar para WhatsApp'}
                      </button>
                    </div>
                  )}
                  <div className={styles.metaRow}>
                    <span className={styles.hora}>{m.hora}</span>
                    {m.role === 'assistant' && !m.esError && (
                      <button
                        className={styles.copyBtn}
                        onClick={() => copiar(m.content)}
                        title="Copiar respuesta"
                        aria-label="Copiar respuesta"
                      >
                        {copiadoId === m.content ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                </div>
                {m.role === 'user' && mostrarAvatarUsuario && <span className={styles.avatar}>o</span>}
              </div>
            );
          })}

          {cargando && (
            <div className={`${styles.mensaje} ${styles.assistantMsg}`}>
              <span className={styles.avatar}>✨</span>
              <div className={styles.mensajeCol}>
                <div className={`${styles.burbuja} ${styles.typingContent}`}>
                  <div className={styles.typing}>
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                    <span className={styles.dot} />
                  </div>
                  <span className={styles.typingLabel}>{textoEspera}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.composer}>
          {sugerencias.length > 0 && (
            <div className={styles.composerChips}>
              <span className={styles.chipsLabel}>Sugeridos:</span>
              {sugerencias.slice(0, 4).map((s) => (
                <button key={s.id} className={styles.chip} onClick={() => enviar(s.accion)} title={s.descripcion}>
                  {s.titulo}
                </button>
              ))}
            </div>
          )}
          <div className={styles.inputBox}>
            <textarea
              ref={inputRef}
              className={styles.input}
              placeholder="Preguntale algo sobre tu negocio..."
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={cargando}
            />
            <div className={styles.inputFooter}>
              <span className={styles.inputHint}>Presioná Enter para enviar</span>
              <button className={styles.sendBtn} onClick={() => enviar()} disabled={!input.trim() || cargando}>
                <span>Consultar</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={styles.sendIcon}>
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HistoryItem({ conv, activa, onSelect, onDelete }) {
  return (
    <div className={`${styles.historyItem} ${activa ? styles.historyItemActive : ''}`} onClick={() => onSelect(conv.id)} role="button" tabIndex={0}>
      <span className={styles.historyItemIcon}>💬</span>
      <div className={styles.historyItemInfo}>
        <span className={styles.historyItemTitle}>{conv.titulo}</span>
        <span className={styles.historyItemMeta}>
          {formatFechaRelativa(conv.creado || ahoraMs())} · {conv.mensajes?.length || 0} msgs
        </span>
      </div>
      <button
        className={styles.historyDelete}
        onClick={(e) => { e.stopPropagation(); onDelete(conv.id); }}
        title="Eliminar conversación"
        aria-label="Eliminar conversación"
      >✕</button>
    </div>
  );
}
