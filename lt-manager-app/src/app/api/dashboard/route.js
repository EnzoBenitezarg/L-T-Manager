import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';
import { estadoMembresia } from '@/lib/membresia';
import { esRubroRetail } from '@/lib/navegacion';
import { ultimos30Dias, serieVentas30, statsSerie, topServicios, topProductos } from '@/lib/reportes';
import { toDateString } from '@/lib/fecha';

// Total de ingresos de un set de pagos + ventas
function ingresosDe(pagos, ventas) {
  const pagosTotal = pagos.reduce((s, p) => s + (Number(p.monto) || 0) + (Number(p.propina) || 0), 0);
  const ventasTotal = ventas.reduce(
    (s, v) => s + (v.items || []).reduce((a, it) => a + (Number(it.cantidad) || 0) * (Number(it.precio) || 0), 0),
    0
  );
  return Math.round((pagosTotal + ventasTotal) * 100) / 100;
}

// Variación porcentual entre un período y el anterior (evita dividir por cero)
function variacion(actual, anterior) {
  if (anterior === 0) return actual > 0 ? 100 : 0;
  return Math.round(((actual - anterior) / anterior) * 1000) / 10;
}

export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioMesAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const inicioPeriodo30 = new Date(hoy);
    inicioPeriodo30.setDate(inicioPeriodo30.getDate() - 29);
    inicioPeriodo30.setHours(0, 0, 0, 0);

    const [totalClientes, totalServicios, totalProductos, turnosHoy, turnosPendientes, deudores, stockBajo, ventasHoyData, gastosHoy, pagos, ventas] = await Promise.all([
      prisma.cliente.count({ where: { negocioId: negocio.id } }),
      prisma.servicio.count({ where: { negocioId: negocio.id } }),
      prisma.producto.count({ where: { negocioId: negocio.id } }),
      prisma.turno.count({ where: { negocioId: negocio.id, fecha: { gte: hoy, lte: finHoy } } }),
      prisma.turno.count({ where: { negocioId: negocio.id, estado: 'PENDIENTE', fecha: { gte: hoy, lte: finHoy } } }),
      prisma.turno.findMany({
        where: { negocioId: negocio.id, estado: 'FALTA_PAGAR' },
        orderBy: { fecha: 'asc' },
        include: { cliente: true, servicio: true },
      }),
      prisma.producto.findMany({
        where: { negocioId: negocio.id, stockMinimo: { gt: 0 } },
        orderBy: { nombre: 'asc' },
      }).then((ps) => ps.filter((p) => p.stock <= p.stockMinimo)),
      prisma.venta.findMany({
        where: { negocioId: negocio.id, fecha: { gte: hoy, lte: finHoy } },
        include: { items: true },
      }).then((vs) => ({
        cantidad: vs.length,
        total: vs.reduce((sum, v) => sum + v.items.reduce((s, i) => s + i.precio * i.cantidad, 0), 0),
      })),
      prisma.gasto.aggregate({
        where: { negocioId: negocio.id, fecha: { gte: hoy, lte: finHoy } },
        _sum: { monto: true },
      }).then((g) => g._sum.monto || 0),
      prisma.pago.findMany({
        where: { negocioId: negocio.id, fecha: { gte: inicioPeriodo30 } },
        include: { turno: { include: { servicio: true } } },
        orderBy: { fecha: 'asc' },
      }),
      prisma.venta.findMany({
        where: { negocioId: negocio.id, fecha: { gte: inicioPeriodo30 } },
        include: { items: true },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    // ─── Ingresos: Hoy / Este mes / Mes anterior / últimos 30 días ───
    const hoyPagos = pagos.filter((p) => toDateString(p.fecha) === toDateString(hoy));
    const hoyVentas = ventas.filter((v) => toDateString(v.fecha) === toDateString(hoy));
    const mesPagos = pagos.filter((p) => p.fecha >= inicioMes);
    const mesVentas = ventas.filter((v) => v.fecha >= inicioMes);
    const mesAntPagos = [];
    const mesAntVentas = [];

    // Necesitamos meses anteriores (fuera del rango de 30 días). Consulta por separado.
    const promesAnt = Promise.all([
      prisma.pago.findMany({
        where: { negocioId: negocio.id, fecha: { gte: inicioMesAnterior, lt: inicioMes } },
        include: { turno: { include: { servicio: true } } },
      }),
      prisma.venta.findMany({
        where: { negocioId: negocio.id, fecha: { gte: inicioMesAnterior, lt: inicioMes } },
        include: { items: true },
      }),
    ]).then(([pA, vA]) => { mesAntPagos.push(...pA); mesAntVentas.push(...vA); });

    const series30 = serieVentas30(pagos, ventas, ultimos30Dias());
    const stats = statsSerie(series30);

    const ingresosHoy = ingresosDe(hoyPagos, hoyVentas);
    const ingresosMes = ingresosDe(mesPagos, mesVentas);

    await promesAnt;
    const ingresosMesAnterior = ingresosDe(mesAntPagos, mesAntVentas);

    const esRetail = esRubroRetail(negocio.rubro);

    // Top según rubro: servicios (con turnos) vs productos (retail)
    const top = esRetail ? topProductos(ventas).slice(0, 5) : topServicios(pagos).slice(0, 5);

    // Métricas de membresía (GIMNASIO)
    let membresia = null;
    if (negocio.rubro === 'GIMNASIO') {
      const clientesPlanes = await prisma.cliente.findMany({
        where: { negocioId: negocio.id },
        include: {
          turnos: { include: { servicio: true, pago: true } },
        },
      });
      const estados = clientesPlanes
        .map((c) => estadoMembresia(c.turnos))
        .filter(Boolean);
      membresia = {
        activos: estados.filter((e) => e.estado === 'AL_DIA').length,
        porVencer: estados.filter((e) => e.estado === 'POR_VENCER').length,
        vencidos: estados.filter((e) => e.estado === 'VENCIDO').length,
      };
    }

    const proximosTurnos = await prisma.turno.findMany({
      where: { negocioId: negocio.id, fecha: { gte: new Date() }, estado: 'PENDIENTE' },
      orderBy: { fecha: 'asc' },
      take: 5,
      include: { cliente: true, servicio: true },
    });

    return NextResponse.json({
      rubro: negocio.rubro,
      esRetail,
      totalClientes,
      totalServicios,
      totalProductos,
      turnosHoy,
      turnosPendientes,
      proximosTurnos,
      deudores,
      stockBajo,
      ventasHoy: ventasHoyData,
      gastosHoy,
      membresia,
      // Nuevos KPIs de ingresos
      ingresos: {
        hoy: ingresosHoy,
        mes: ingresosMes,
        mesAnterior: ingresosMesAnterior,
        vsMesAnterior: variacion(ingresosMes, ingresosMesAnterior),
        ultimos30: stats.total,
        promedioDiario: stats.promedio,
        mejorDia: stats.mejor,
      },
      series30: series30.map((d) => ({ label: d.fecha, value: d.total })),
      top,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
