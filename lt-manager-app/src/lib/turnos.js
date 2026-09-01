import prisma from './prisma';
import { toDateString, aMinutos, minutosDelDia } from './fecha';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function finDelTurno(inicio, duracion) {
  return new Date(new Date(inicio).getTime() + (Number(duracion) || 0) * 60000);
}

// Valida un turno propuesto contra:
//  1) horario de atención del negocio (si configuró alguno),
//  2) bloqueos del día / recurrentes,
//  3) turnos existentes del mismo día (sin superponerse).
// El choque es POR PROFESIONAL: dos profesionales distintos pueden estar
// a la misma hora. Un turno "sin asignar" (profesionalId = null) choca con todos.
// Devuelve un array de errores en español claro (vacío = ok).
export async function validarTurno({ negocioId, inicio, duracion, profesionalId, ignorarTurnoId }) {
  const errores = [];
  const ini = new Date(inicio);
  if (Number.isNaN(ini.getTime())) {
    return ['La fecha y hora no son válidas'];
  }

  const fin = finDelTurno(ini, duracion);
  const fechaStr = toDateString(ini);
  const dia = ini.getDay();
  const iniMin = minutosDelDia(ini);
  const finMin = minutosDelDia(fin);

  // 1) Horario de atención (solo se aplica si el negocio configuró horarios)
  const horarios = await prisma.horario.findMany({ where: { negocioId } });
  if (horarios.length > 0) {
    const horario = horarios.find((h) => h.diaSemana === dia);
    if (!horario || !horario.abierto) {
      errores.push(`El ${DIAS[dia]} no se trabaja, no hay horario de atención ese día.`);
    } else {
      const desde = aMinutos(horario.apertura);
      const hasta = aMinutos(horario.cierre);
      if (iniMin < desde || finMin > hasta) {
        errores.push(`El turno tiene que entrar en el horario de atención (${horario.apertura} a ${horario.cierre}).`);
      }
    }
  }

  // 2) Bloqueos: día recurrente, día completo o rango de horas
  const bloqueos = await prisma.bloqueo.findMany({ where: { negocioId } });
  const bloqueoRecurrente = bloqueos.find((b) => b.diaSemana != null && b.diaSemana === dia);
  const bloqueosDelDia = bloqueos.filter((b) => b.diaSemana == null && toDateString(b.fecha) === fechaStr);
  const bloqueoCompleto = bloqueosDelDia.find((b) => !b.horaInicio);
  if (bloqueoRecurrente || bloqueoCompleto) {
    errores.push('Ese día está bloqueado (no laborable).');
  } else {
    for (const b of bloqueosDelDia) {
      const desde = aMinutos(b.horaInicio);
      const hasta = aMinutos(b.horaFin);
      if (iniMin < hasta && finMin > desde) {
        errores.push(`Se superpone con un bloqueo (${b.horaInicio} a ${b.horaFin}).`);
        break;
      }
    }
  }

  // 3) Choque con otros turnos del mismo día (mismo profesional o sin asignar)
  const t0 = new Date(ini);
  t0.setHours(0, 0, 0, 0);
  const t1 = new Date(ini);
  t1.setHours(23, 59, 59, 999);
  const turnos = await prisma.turno.findMany({
    where: { negocioId, fecha: { gte: t0, lte: t1 } },
    include: { cliente: true, servicio: true },
  });
  const profesionalIdNum = profesionalId ? Number(profesionalId) : null;

  for (const t of turnos) {
    if (ignorarTurnoId && t.id === ignorarTurnoId) continue;
    // Solo choca si es el mismo profesional, o alguno de los dos "sin asignar"
    if (profesionalIdNum && t.profesionalId && profesionalIdNum !== t.profesionalId) continue;
    const tIni = new Date(t.fecha);
    const tFin = finDelTurno(tIni, t.duracionOverride || t.servicio?.duracion || 0);
    if (ini < tFin && fin > tIni) {
      const nombre = t.cliente?.nombre || 'otro turno';
      const hora = tIni.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      errores.push(`Se superpone con ${nombre} (que arranca a las ${hora}).`);
      break;
    }
  }

  return errores;
}