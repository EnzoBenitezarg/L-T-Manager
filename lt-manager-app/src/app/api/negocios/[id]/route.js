import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUsuario, setNegocioActivo } from '@/lib/auth';

function pertenece(usuario, negocioId) {
  return usuario.negocios.some((n) => n.id === Number(negocioId));
}

// POST /api/negocios/[id] — seleccionar negocio activo
export async function POST(request, { params }) {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;
  if (!pertenece(usuario, id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  await setNegocioActivo(Number(id));
  return NextResponse.json({ ok: true });
}

// PATCH /api/negocios/[id] — actualizar rubro o módulos de la sidebar
export async function PATCH(request, { params }) {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;
  if (!pertenece(usuario, id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const body = await request.json();
    const { nombre, rubro, modulos } = body;
    const data = {};
    if (nombre != null) data.nombre = nombre.trim();
    if (rubro != null) data.rubro = rubro;
    if (modulos != null) data.modulos = JSON.stringify(modulos);

    const negocio = await prisma.negocio.update({
      where: { id: Number(id) },
      data,
    });
    return NextResponse.json(negocio);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar negocio' }, { status: 500 });
  }
}

// DELETE /api/negocios/[id] — eliminar negocio
export async function DELETE(request, { params }) {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;
  if (!pertenece(usuario, id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    await prisma.negocio.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar negocio' }, { status: 500 });
  }
}
