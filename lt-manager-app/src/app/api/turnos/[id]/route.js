import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH /api/turnos/[id] — cambiar estado del turno
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado } = body;

    const turno = await prisma.turno.update({
      where: { id: Number(id) },
      data: { estado },
      include: { cliente: true, servicio: true },
    });
    return NextResponse.json(turno);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar turno' }, { status: 500 });
  }
}

// DELETE /api/turnos/[id] — cancelar/eliminar turno
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.turno.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar turno' }, { status: 500 });
  }
}
