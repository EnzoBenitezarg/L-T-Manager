import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// GET /api/gastos
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const gastos = await prisma.gasto.findMany({ where: { negocioId: negocio.id }, orderBy: { fecha: 'desc' } });
    return NextResponse.json(gastos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener gastos' }, { status: 500 });
  }
}

// POST /api/gastos
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { concepto, monto, categoria } = body;
    if (!concepto?.trim() || monto == null) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }
    const gasto = await prisma.gasto.create({
      data: { concepto: concepto.trim(), monto: Number(monto), categoria: categoria?.trim() || null, negocioId: negocio.id },
    });
    return NextResponse.json(gasto, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear gasto' }, { status: 500 });
  }
}
