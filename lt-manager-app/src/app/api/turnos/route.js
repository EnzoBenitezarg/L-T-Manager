import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/turnos — listar todos, opcionalmente filtrar por fecha
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');

    const where = {};
    if (fecha) {
      const inicio = new Date(fecha);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fecha);
      fin.setHours(23, 59, 59, 999);
      where.fecha = { gte: inicio, lte: fin };
    }

    const turnos = await prisma.turno.findMany({
      where,
      orderBy: { fecha: 'asc' },
      include: { cliente: true, servicio: true, pago: true },
    });
    return NextResponse.json(turnos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener turnos' }, { status: 500 });
  }
}

// POST /api/turnos — crear nuevo turno
export async function POST(request) {
  try {
    const body = await request.json();
    const { clienteId, servicioId, fecha } = body;

    if (!clienteId || !servicioId || !fecha) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const turno = await prisma.turno.create({
      data: {
        clienteId: Number(clienteId),
        servicioId: Number(servicioId),
        fecha: new Date(fecha),
        estado: 'PENDIENTE',
      },
      include: { cliente: true, servicio: true },
    });
    return NextResponse.json(turno, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear turno' }, { status: 500 });
  }
}
