import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';
import { serieVentas30, topServicios, topProductos, ultimos30Dias, statsSerie, comisionesPorProfesional } from '@/lib/reportes';

// GET /api/reportes — datos agregados para la sección Reportes
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const [pagos, ventas, miembros] = await Promise.all([
      prisma.pago.findMany({
        where: { negocioId: negocio.id },
        include: { turno: { include: { servicio: true } } },
        orderBy: { fecha: 'desc' },
      }),
      prisma.venta.findMany({
        where: { negocioId: negocio.id },
        include: { items: true },
        orderBy: { fecha: 'desc' },
      }),
      prisma.miembro.findMany({
        where: { negocioId: negocio.id },
        include: { usuario: { select: { nombre: true } } },
      }),
    ]);

    const series30 = serieVentas30(pagos, ventas, ultimos30Dias());

    return NextResponse.json({
      series30: series30.map((d) => ({ label: d.fecha, value: d.total })),
      stats: statsSerie(series30),
      topServicios: topServicios(pagos),
      topProductos: topProductos(ventas),
      comisiones: comisionesPorProfesional(pagos, miembros),
    });
  } catch {
    return NextResponse.json({ error: 'Error al obtener reportes' }, { status: 500 });
  }
}