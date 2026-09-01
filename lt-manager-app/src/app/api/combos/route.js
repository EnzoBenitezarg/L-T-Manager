import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// GET /api/combos
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const combos = await prisma.combo.findMany({
      where: { negocioId: negocio.id },
      include: { servicios: true },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(combos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener combos' }, { status: 500 });
  }
}

// POST /api/combos
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { nombre, descripcion, precio, servicios } = body;
    if (!nombre?.trim() || precio == null) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Aislamiento por tenant: todos los servicios del combo deben pertenecer al negocio activo
    const serviciosIds = (servicios || []).map((id) => Number(id));
    if (serviciosIds.length > 0) {
      const count = await prisma.servicio.count({
        where: { id: { in: serviciosIds }, negocioId: negocio.id },
      });
      if (count !== serviciosIds.length) {
        return NextResponse.json({ error: 'Alguno de los servicios no pertenece a este negocio' }, { status: 400 });
      }
    }

    const combo = await prisma.combo.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precio: Number(precio),
        negocioId: negocio.id,
        servicios: { connect: serviciosIds.map((id) => ({ id })) },
      },
      include: { servicios: true },
    });
    return NextResponse.json(combo, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear combo' }, { status: 500 });
  }
}
