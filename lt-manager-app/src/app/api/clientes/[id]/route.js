import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';
import { estadoMembresia } from '@/lib/membresia';

// GET /api/clientes/[id] — detalle con historial
export async function GET(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    const cliente = await prisma.cliente.findFirst({
      where: { id: Number(id), negocioId: negocio.id },
      include: {
        turnos: {
          orderBy: { fecha: 'desc' },
          include: { servicio: true, pago: true },
        },
      },
    });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const totalGastado = cliente.turnos.reduce((acc, t) => {
      if (t.pago) acc += Number(t.pago.monto);
      return acc;
    }, 0);
    const turnosCompletados = cliente.turnos.filter((t) => t.estado === 'COMPLETADO').length;

    const membresia = negocio.rubro === 'GIMNASIO' ? estadoMembresia(cliente.turnos) : null;

    return NextResponse.json({
      ...cliente,
      totalGastado: Math.round(totalGastado * 100) / 100,
      turnosCompletados,
      membresia,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cliente' }, { status: 500 });
  }
}

// PUT /api/clientes/[id] — actualizar cliente
export async function PUT(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, dni, telefono, email, notas, etiquetas } = body;

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const cliente = await prisma.cliente.updateMany({
      where: { id: Number(id), negocioId: negocio.id },
      data: {
        nombre: nombre.trim(),
        dni: dni?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        notas: notas?.trim() || null,
        etiquetas: etiquetas?.trim() || null,
      },
    });
    if (cliente.count === 0) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar cliente' }, { status: 500 });
  }
}

// DELETE /api/clientes/[id] — eliminar cliente
export async function DELETE(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.cliente.deleteMany({ where: { id: Number(id), negocioId: negocio.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar cliente' }, { status: 500 });
  }
}
