import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, crearSesion } from '@/lib/auth';

// POST /api/auth/login
export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email?.trim() || !password) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!usuario || !(await verifyPassword(password, usuario.password))) {
      return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
    }

    await crearSesion(usuario.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 });
  }
}
