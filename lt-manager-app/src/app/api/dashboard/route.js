import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';
import { estadoMembresia } from '@/lib/membresia';
import { esRubroRetail } from '@/lib/navegacion';

export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    const [totalClientes, totalServicios, totalProductos, turnosHoy, turnosPendientes, deudores, stockBajo, ventasHoyData, gastosHoy] = await Promise.all([
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
    ]);

    const proximosTurnos = await prisma.turno.findMany({
      where: { negocioId: negocio.id, fecha: { gte: new Date() }, estado: 'PENDIENTE' },
      orderBy: { fecha: 'asc' },
      take: 5,
      include: { cliente: true, servicio: true },
    });

    // Métricas de membresía (GIMNASIO)
    let membresia = null;
    if (negocio.rubro === 'GIMNASIO') {
      const clientesConPlanes = await prisma.cliente.findMany({
        where: { negocioId: negocio.id },
        include: {
          turnos: { include: { servicio: true, pago: true } },
        },
      });
      const estados = clientesConPlanes
        .map((c) => estadoMembresia(c.turnos))
        .filter(Boolean);
      membresia = {
        activos: estados.filter((e) => e.estado === 'AL_DIA').length,
        porVencer: estados.filter((e) => e.estado === 'POR_VENCER').length,
        vencidos: estados.filter((e) => e.estado === 'VENCIDO').length,
      };
    }

    return NextResponse.json({
      rubro: negocio.rubro,
      esRetail: esRubroRetail(negocio.rubro),
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
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
