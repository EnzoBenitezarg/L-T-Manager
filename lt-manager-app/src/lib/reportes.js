import { toDateString } from './fecha';

// Últimos 30 días (incluido hoy) como array 'YYYY-MM-DD'
export function ultimos30Dias(desde = new Date()) {
  const dias = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(desde);
    d.setDate(d.getDate() - i);
    dias.push(toDateString(d));
  }
  return dias;
}

function totalVenta(v) {
  return (v.items || []).reduce((acc, it) => acc + Number(it.cantidad) * Number(it.precio), 0);
}

// Serie de ingresos por día (cobros de turnos + ventas de productos) para los últimos 30 días
export function serieVentas30(pagos, ventas, dias) {
  const porDia = Object.fromEntries(dias.map((d) => [d, 0]));
  for (const p of pagos || []) {
    const d = toDateString(p.fecha);
    if (d in porDia) porDia[d] += Number(p.monto) + Number(p.propina || 0);
  }
  for (const v of ventas || []) {
    const d = toDateString(v.fecha);
    if (d in porDia) porDia[d] += totalVenta(v);
  }
  return dias.map((d) => ({ fecha: d, total: Math.round(porDia[d] * 100) / 100 }));
}

// Top de servicios por monto cobrado (agrupa los cobros de cada turno por servicio)
export function topServicios(pagos) {
  const mapa = new Map();
  for (const p of pagos || []) {
    const s = p.turno?.servicio;
    if (!s) continue;
    const t = mapa.get(s.id) || { nombre: s.nombre, cantidad: 0, total: 0 };
    t.cantidad += 1;
    t.total += Number(p.monto) || 0;
    mapa.set(s.id, t);
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

// Top de productos vendidos (agrupa los items de todas las ventas)
export function topProductos(ventas) {
  const mapa = new Map();
  for (const v of ventas || []) {
    for (const it of v.items || []) {
      const clave = it.productoId || it.nombre;
      const t = mapa.get(clave) || { nombre: it.nombre, cantidad: 0, total: 0 };
      t.cantidad += Number(it.cantidad) || 0;
      t.total += (Number(it.cantidad) || 0) * (Number(it.precio) || 0);
      mapa.set(clave, t);
    }
  }
  return [...mapa.values()].sort((a, b) => b.total - a.total);
}

// Estadísticas resumidas de una serie diaria
export function statsSerie(serie) {
  const totals = serie.map((d) => d.total);
  const total = totals.reduce((a, b) => a + b, 0);
  const conVentas = totals.filter((t) => t > 0).length;
  const mejor = conVentas ? Math.max(...totals) : 0;
  return { total, conVentas, mejor, promedio: serie.length ? total / serie.length : 0 };
}

// Comisiones acumuladas por profesional (a partir de los pagos guardados)
export function comisionesPorProfesional(pagos, miembros) {
  const mapa = new Map();
  for (const m of miembros || []) {
    mapa.set(m.id, {
      id: m.id,
      nombre: m.usuario?.nombre || m.nombre,
      color: m.color,
      base: 0,
      comision: 0,
      propina: 0,
      cantidad: 0,
    });
  }
  for (const p of pagos || []) {
    if (!p.profesionalId) continue;
    const t = mapa.get(p.profesionalId);
    if (!t) continue;
    t.base += Number(p.monto) || 0;
    t.comision += Number(p.comision) || 0;
    t.propina += Number(p.propina) || 0;
    t.cantidad += 1;
  }
  return [...mapa.values()]
    .filter((m) => m.cantidad > 0)
    .sort((a, b) => b.comision - a.comision);
}