import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo, getUsuario, getMiembroActivo } from '@/lib/auth';
import { esAdminDeNegocio, ROLES, ROL_ETIQUETA } from '@/lib/permisos';

async function cargarMiembro(negocioId, id) {
  return prisma.miembro.findFirst({
    where: { id: Number(id), negocioId },
    include: { usuario: { select: { nombre: true, email: true } } },
  });
}

// PATCH /api/miembros/[id] — editar rol, comisión, color o estado
export async function PATCH(request, { params }) {
  const [usuario, negocio] = await Promise.all([getUsuario(), getNegocioActivo()]);
  if (!usuario || !negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  const miembroActual = await getMiembroActivo(negocio.id);
  if (!esAdminDeNegocio(usuario, negocio, miembroActual)) {
    return NextResponse.json({ error: 'No tenés permisos para editar el equipo' }, { status: 403 });
  }

  const target = await cargarMiembro(negocio.id, params.id);
  if (!target) return NextResponse.json({ error: 'Ese miembro no existe' }, { status: 404 });

  const body = await request.json();
  const data = {};
  if (body.rol !== undefined) {
    if (!Object.keys(ROLES).includes(body.rol) || body.rol === ROLES.DUENIO) {
      return NextResponse.json({ error: 'Rol no válido' }, { status: 400 });
    }
    data.rol = body.rol;
  }
  if (body.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.color))) data.color = body.color;
  if (body.porcentajeComision !== undefined) {
    data.porcentajeComision = Math.max(0, Math.min(100, Number(body.porcentajeComision) || 0));
  }
  if (body.activo !== undefined) data.activo = Boolean(body.activo);
  if (data.activo === false && target.rol === ROLES.ADMIN && miembroActual?.id === target.id) {
    return NextResponse.json({ error: 'No podés desactivarte a vos mismo' }, { status: 400 });
  }

  const actualizado = await prisma.miembro.update({
    where: { id: target.id },
    data,
    include: { usuario: { select: { nombre: true, email: true } } },
  });
  return NextResponse.json({
    id: actualizado.id,
    rol: actualizado.rol,
    rolEtiqueta: ROL_ETIQUETA[actualizado.rol],
    color: actualizado.color,
    porcentajeComision: actualizado.porcentajeComision,
    activo: actualizado.activo,
    nombre: actualizado.usuario.nombre,
    email: actualizado.usuario.email,
  });
}

// DELETE /api/miembros/[id] — quitar a alguien del negocio (no al dueño)
export async function DELETE(request, { params }) {
  const [usuario, negocio] = await Promise.all([getUsuario(), getNegocioActivo()]);
  if (!usuario || !negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  const miembroActual = await getMiembroActivo(negocio.id);
  if (!esAdminDeNegocio(usuario, negocio, miembroActual)) {
    return NextResponse.json({ error: 'No tenés permisos para quitar del equipo' }, { status: 403 });
  }

  const target = await cargarMiembro(negocio.id, params.id);
  if (!target) return NextResponse.json({ error: 'Ese miembro no existe' }, { status: 404 });
  if (target.rol === ROLES.DUENIO) {
    return NextResponse.json({ error: 'No se puede quitar al dueño del negocio' }, { status: 400 });
  }
  if (usuario.id === target.usuarioId) {
    return NextResponse.json({ error: 'No podés quitarte a vos mismo del equipo' }, { status: 400 });
  }

  await prisma.miembro.delete({ where: { id: target.id } });
  return NextResponse.json({ ok: true });
}