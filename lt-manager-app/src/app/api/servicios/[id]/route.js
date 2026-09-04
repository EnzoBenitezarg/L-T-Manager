import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

export async function PUT(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, precio, duracion } = body;

    if (nombre == null || String(nombre).trim() === '') {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }
    const precioNum = Number(precio);
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      return NextResponse.json({ error: 'El precio es inválido' }, { status: 400 });
    }
    const durNum = Number(duracion);
    const servicio = await prisma.servicio.updateMany({
      where: { id: Number(id), negocioId: negocio.id },
      data: {
        nombre: String(nombre).trim(),
        descripcion: descripcion != null ? String(descripcion).trim() || null : undefined,
        precio: precioNum,
        duracion: Number.isFinite(durNum) && durNum > 0 ? Math.floor(durNum) : 30,
      },
    });
    if (servicio.count === 0) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.servicio.deleteMany({ where: { id: Number(id), negocioId: negocio.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 });
  }
}
