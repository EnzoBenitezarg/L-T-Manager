import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// GET /api/bloqueos — listar, opcionalmente por fecha o recurrentes
export async function GET(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const where = { negocioId: negocio.id };
    if (fecha) {
      const inicio = new Date(fecha);
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(fecha);
      fin.setHours(23, 59, 59, 999);
      where.fecha = { gte: inicio, lte: fin };
    }
    const bloqueos = await prisma.bloqueo.findMany({
      where,
      orderBy: { fecha: 'asc' },
    });
    return NextResponse.json(bloqueos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener bloqueos' }, { status: 500 });
  }
}

// POST /api/bloqueos — crear bloqueo
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { fecha, horaInicio, horaFin, diaSemana, motivo, diaCompleto } = body;

    const data = {
      motivo: motivo?.trim() || null,
      diaSemana: diaSemana != null ? Number(diaSemana) : null,
      horaInicio: diaCompleto ? null : (horaInicio || null),
      horaFin: diaCompleto ? null : (horaFin || null),
      negocioId: negocio.id,
    };

    if (diaSemana != null && diaSemana !== '') {
      data.fecha = new Date(); // valor de relleno para recurrentes
      data.diaSemana = Number(diaSemana);
    } else {
      if (!fecha) return NextResponse.json({ error: 'Falta fecha' }, { status: 400 });
      data.fecha = new Date(fecha + 'T00:00:00');
    }

    const bloqueo = await prisma.bloqueo.create({ data });
    return NextResponse.json(bloqueo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear bloqueo' }, { status: 500 });
  }
}
