import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUsuario, setNegocioActivo, getMiembroActivo, negociosDelUsuario } from '@/lib/auth';
import { esAdminDeNegocio } from '@/lib/permisos';

// ¿El usuario tiene acceso al negocio (como dueño o como miembro del equipo)?
function accede(usuario, negocioId) {
  return negociosDelUsuario(usuario).some((n) => n.id === Number(negocioId));
}

// ¿El usuario es dueño del negocio?
function esDuenio(usuario, negocioId) {
  return usuario.negocios.some((n) => n.id === Number(negocioId));
}

// POST /api/negocios/[id] — seleccionar negocio activo
// (Permitido a dueños y a miembros del equipo del negocio)
export async function POST(request, { params }) {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;
  if (!accede(usuario, id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  await setNegocioActivo(Number(id));
  return NextResponse.json({ ok: true });
}

// PATCH /api/negocios/[id] — actualizar rubro o módulos de la sidebar
// (Solo dueño o encargado/administrador del negocio)
export async function PATCH(request, { params }) {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;

  if (!accede(usuario, id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const negocio = await prisma.negocio.findUnique({ where: { id: Number(id) } });
    if (!negocio) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    const miembro = await getMiembroActivo(negocio.id);
    if (!esAdminDeNegocio(usuario, negocio, miembro)) {
      return NextResponse.json({ error: 'Solo el dueño o un encargado puede editar el negocio' }, { status: 403 });
    }

    const body = await request.json();
    const { nombre, rubro, modulos } = body;
    const data = {};
    if (nombre != null) data.nombre = nombre.trim();
    if (rubro != null) data.rubro = rubro;
    if (modulos != null) data.modulos = JSON.stringify(modulos);

    const negocioActualizado = await prisma.negocio.update({
      where: { id: Number(id) },
      data,
    });
    return NextResponse.json(negocioActualizado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar negocio' }, { status: 500 });
  }
}

// DELETE /api/negocios/[id] — eliminar negocio (solo dueño)
export async function DELETE(request, { params }) {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const { id } = await params;
  if (!esDuenio(usuario, id)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    await prisma.negocio.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar negocio' }, { status: 500 });
  }
}
