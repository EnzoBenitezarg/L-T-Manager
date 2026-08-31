import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/clientes/[id] — detalle con historial
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number(id) },
      include: {
        turnos: {
          orderBy: { fecha: 'desc' },
          include: { servicio: true, pago: true },
        },
      },
    });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

// PUT /api/clientes/[id] — actualizar cliente
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, telefono, email } = body;

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const cliente = await prisma.cliente.update({
      where: { id: Number(id) },
      data: { nombre: nombre.trim(), telefono: telefono?.trim() || null, email: email?.trim() || null },
    });
    return NextResponse.json(cliente);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE /api/clientes/[id] — eliminar cliente
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.cliente.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
