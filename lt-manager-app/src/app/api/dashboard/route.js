import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    const [totalClientes, totalServicios, turnosHoy, turnosPendientes] = await Promise.all([
      prisma.cliente.count(),
      prisma.servicio.count(),
      prisma.turno.count({ where: { fecha: { gte: hoy, lte: finHoy } } }),
      prisma.turno.count({ where: { estado: 'PENDIENTE', fecha: { gte: hoy, lte: finHoy } } }),
    ]);

    const proximosTurnos = await prisma.turno.findMany({
      where: { fecha: { gte: new Date() }, estado: 'PENDIENTE' },
      orderBy: { fecha: 'asc' },
      take: 5,
      include: { cliente: true, servicio: true },
    });

    return NextResponse.json({ totalClientes, totalServicios, turnosHoy, turnosPendientes, proximosTurnos });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
