import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, crearSesion } from '@/lib/auth';
import { rubroModulos } from '@/lib/navegacion';

// POST /api/auth/registro
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, email, password, negocioNombre, rubro } = body;

    if (!nombre?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const existe = await prisma.usuario.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existe) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese email' }, { status: 400 });
    }

    const hash = await hashPassword(password);
    const usuario = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        password: hash,
        plan: 'STARTER',
        negocios: {
          create: {
            nombre: (negocioNombre || 'Mi negocio').trim(),
            rubro: rubro || 'BARBERIA',
            modulos: JSON.stringify(rubroModulos(rubro || 'BARBERIA')),
          },
        },
      },
    });

    await crearSesion(usuario.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('registro error', error);
    return NextResponse.json({ error: 'Error al crear la cuenta' }, { status: 500 });
  }
}
