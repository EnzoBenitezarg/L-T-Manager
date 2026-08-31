import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, precio, duracion } = body;

    const servicio = await prisma.servicio.update({
      where: { id: Number(id) },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precio: Number(precio),
        duracion: Number(duracion) || 30,
      },
    });
    return NextResponse.json(servicio);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.servicio.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 });
  }
}
