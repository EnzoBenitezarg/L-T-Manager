import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/clientes — listar todos
export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { creadoEn: 'desc' },
      include: {
        _count: { select: { turnos: true } },
      },
    });
    return NextResponse.json(clientes);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST /api/clientes — crear nuevo cliente
export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, telefono, email } = body;

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const cliente = await prisma.cliente.create({
      data: { nombre: nombre.trim(), telefono: telefono?.trim() || null, email: email?.trim() || null },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
