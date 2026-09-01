import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo, getUsuario, getMiembroActivo, hashPassword } from '@/lib/auth';
import { esAdmin, esAdminDeNegocio, ROLES, ROL_ETIQUETA } from '@/lib/permisos';

// GET /api/miembros — equipo (profesionales) del negocio activo
export async function GET() {
  const [usuario, negocio] = await Promise.all([getUsuario(), getNegocioActivo()]);
  if (!usuario || !negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const miembros = await prisma.miembro.findMany({
      where: { negocioId: negocio.id },
      orderBy: { activo: 'desc' },
      include: { usuario: { select: { nombre: true, email: true } } },
    });
    return NextResponse.json(
      miembros.map((m) => ({
        id: m.id,
        rol: m.rol,
        rolEtiqueta: ROL_ETIQUETA[m.rol] || m.rol,
        color: m.color,
        porcentajeComision: m.porcentajeComision,
        activo: m.activo,
        nombre: m.usuario.nombre,
        email: m.usuario.email,
      }))
    );
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener el equipo' }, { status: 500 });
  }
}

// POST /api/miembros — agregar un empleado/profesional al negocio activo
export async function POST(request) {
  const [usuario, negocio] = await Promise.all([getUsuario(), getNegocioActivo()]);
  if (!usuario || !negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  const miembro = await getMiembroActivo(negocio.id);
  if (!esAdminDeNegocio(usuario, negocio, miembro)) {
    return NextResponse.json({ error: 'Solo el dueño o un encargado puede administrar el equipo' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const nombre = String(body.nombre || '').trim();
    const rol = Object.keys(ROLES).includes(body.rol) ? body.rol : ROLES.EMPLEADO;
    const color = /^#[0-9a-fA-F]{6}$/.test(String(body.color || '')) ? body.color : '#c97b2f';
    const porcentajeComision = Math.max(0, Math.min(100, Number(body.porcentajeComision) || 0));

    if (rol === ROLES.DUENIO) {
      return NextResponse.json({ error: 'El rol de dueño no se puede asignar' }, { status: 400 });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Ingresá un email válido para el empleado' }, { status: 400 });
    }

    let usuarioEmpleado = await prisma.usuario.findUnique({ where: { email } });
    if (!usuarioEmpleado) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
      }
      usuarioEmpleado = await prisma.usuario.create({
        data: { nombre: nombre || email.split('@')[0], email, password: await hashPassword(password) },
      });
    }

    const yaEsMiembro = await prisma.miembro.findFirst({
      where: { usuarioId: usuarioEmpleado.id, negocioId: negocio.id },
    });
    if (yaEsMiembro) {
      return NextResponse.json({ error: 'Ese email ya es parte del equipo de este negocio' }, { status: 409 });
    }

    const creado = await prisma.miembro.create({
      data: {
        rol,
        color,
        porcentajeComision,
        usuarioId: usuarioEmpleado.id,
        negocioId: negocio.id,
      },
      include: { usuario: { select: { nombre: true, email: true } } },
    });
    return NextResponse.json(
      {
        id: creado.id,
        rol: creado.rol,
        rolEtiqueta: ROL_ETIQUETA[creado.rol],
        color: creado.color,
        porcentajeComision: creado.porcentajeComision,
        activo: creado.activo,
        nombre: creado.usuario.nombre,
        email: creado.usuario.email,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Error al agregar al equipo' }, { status: 500 });
  }
}