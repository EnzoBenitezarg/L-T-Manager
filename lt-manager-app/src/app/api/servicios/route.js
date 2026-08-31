import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const servicios = await prisma.servicio.findMany({ orderBy: { nombre: 'asc' } });
    return NextResponse.json(servicios);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener servicios' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { nombre, descripcion, precio, duracion } = body;

    if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
    if (!precio || isNaN(Number(precio))) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 });

    const servicio = await prisma.servicio.create({
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        precio: Number(precio),
        duracion: Number(duracion) || 30,
      },
    });
    return NextResponse.json(servicio, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 });
  }
}
