'use client';

import styles from './AgendaTimeline.module.css';

function calcFin(inicio, duracion) {
  const d = new Date(inicio);
  d.setMinutes(d.getMinutes() + (duracion || 0));
  return d;
}

const ESTADO_COLOR = {
  PENDIENTE: 'var(--c-yellow)',
  COMPLETADO: 'var(--c-green)',
  CANCELADO: 'var(--c-red)',
  FALTA_PAGAR: 'var(--c-red)',
};

// Agenda visual por día: grilla de horas + una columna por profesional.
// Bloques posicionados por hora de inicio y duración. Toca un turno para ver acciones.
export default function AgendaTimeline({ turnos, miembros, onTurnoClick }) {
  const activos = (miembros || []).filter((m) => m.activo);

  // Rango de horas a mostrar (según los turnos del día, mínimo 9→20)
  let inicioMin = 9 * 60;
  let finMin = 20 * 60;
  if (turnos && turnos.length > 0) {
    const mins = turnos.map((t) => {
      const ini = new Date(t.fecha);
      const fin = calcFin(ini, t.duracionOverride || t.servicio?.duracion || 0);
      return { a: ini.getHours() * 60 + ini.getMinutes(), b: fin.getHours() * 60 + fin.getMinutes() };
    });
    const aMin = Math.max(0, Math.floor(Math.min(...mins.map((m) => m.a)) / 60) * 60 - 60);
    const bMax = Math.min(23 * 60 + 59, Math.ceil(Math.max(...mins.map((m) => m.b)) / 60) * 60 + 30);
    inicioMin = Math.min(inicioMin, aMin);
    finMin = Math.max(finMin, bMax);
    if (finMin - inicioMin > 14 * 60) {
      inicioMin = Math.max(0, inicioMin);
    }
  }
  const totalMin = Math.max(60, finMin - inicioMin);

  // Columnas: profesionales activos + "Sin asignar"
  let columnas = [];
  const sinAsignar = (turnos || []).filter((t) => !t.profesionalId);
  if (sinAsignar.length > 0) {
    columnas.push({ key: 'sin', nombre: activos.length > 0 ? 'Sin asignar' : 'Agenda', color: 'var(--c-text-3)', turnos: sinAsignar });
  }
  for (const m of activos) {
    columnas.push({ key: m.id, nombre: m.usuario?.nombre || m.nombre, color: m.color, turnos: (turnos || []).filter((t) => t.profesionalId === m.id) });
  }
  if (columnas.length === 0) {
    columnas.push({ key: 'todas', nombre: 'Agenda', color: 'var(--c-text-3)', turnos: turnos || [] });
  }

  const horas = [];
  for (let h = Math.floor(inicioMin / 60); h < Math.ceil(finMin / 60); h++) {
    horas.push(h);
  }

  return (
    <div className={styles.timeline} style={{ ['--cols']: columnas.length, ['--alto']: totalMin }}>
      <div className={styles.header}>
        <div className={styles.gutter} />
        {columnas.map((c) => (
          <div key={c.key} className={styles.colHeader}>
            <span className={styles.colDot} style={{ background: c.color }} />
            <span className={styles.colName}>{c.nombre}</span>
            <span className={styles.colCount}>{c.turnos.length}</span>
          </div>
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.gutter}>
          {horas.map((h) => (
            <div key={h} className={styles.hourLabel} style={{ top: `${((h * 60 - inicioMin) / totalMin) * 100}%` }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          {horas.map((h) => (
            <div
              key={h}
              className={styles.gridLine}
              style={{ top: `${((h * 60 - inicioMin) / totalMin) * 100}%` }}
            />
          ))}

          {columnas.map((c) => (
            <div key={c.key} className={styles.columna}>
              {c.turnos.map((t) => {
                const ini = new Date(t.fecha);
                const fin = calcFin(ini, t.duracionOverride || t.servicio?.duracion || 0);
                const est = ESTADO_COLOR[t.estado] || 'var(--c-yellow)';
                return (
                  <button
                    key={t.id}
                    className={`${styles.bloque} ${t.estado === 'CANCELADO' ? styles.cancelado : ''}`}
                    style={{
                      top: `${((ini.getHours() * 60 + ini.getMinutes() - inicioMin) / totalMin) * 100}%`,
                      height: `${Math.max((fin - ini) / totalMin * 100, 4)}%`,
                      borderLeftColor: est,
                      color: c.color,
                    }}
                    onClick={() => onTurnoClick?.(t)}
                  >
                    <span className={styles.bloqueHora}>
                      {ini.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={styles.bloqueNombre}>{t.cliente?.nombre}</span>
                    <span className={styles.bloqueServicio}>{t.servicio?.nombre}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}