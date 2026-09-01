import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// GET /api/espera — listar lista de espera
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const espera = await prisma.listaEspera.findMany({
      where: { negocioId: negocio.id },
      orderBy: { creadoEn: 'asc' },
      include: { cliente: true },
    });
    return NextResponse.json(espera);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener lista de espera' }, { status: 500 });
  }
}

// POST /api/espera — agregar a lista de espera
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { clienteId, servicioId, texto } = body;
    if (!clienteId) return NextResponse.json({ error: 'Falta cliente' }, { status: 400 });

    // Aislamiento por tenant: el cliente debe pertenecer al negocio activo
    const cliente = await prisma.cliente.findFirst({
      where: { id: Number(clienteId), negocioId: negocio.id },
    });
    if (!cliente) {
      return NextResponse.json({ error: 'El cliente no pertenece a este negocio' }, { status: 400 });
    }

    if (servicioId) {
      const servicio = await prisma.servicio.findFirst({
        where: { id: Number(servicioId), negocioId: negocio.id },
      });
      if (!servicio) {
        return NextResponse.json({ error: 'El servicio no pertenece a este negocio' }, { status: 400 });
      }
    }

    const item = await prisma.listaEspera.create({
      data: {
        clienteId: cliente.id,
        servicioId: servicioId ? Number(servicioId) : null,
        texto: texto?.trim() || null,
        negocioId: negocio.id,
      },
      include: { cliente: true },
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al agregar a espera' }, { status: 500 });
  }
}
