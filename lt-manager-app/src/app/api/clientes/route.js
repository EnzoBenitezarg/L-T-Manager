import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';
import { estadoMembresia } from '@/lib/membresia';

// GET /api/clientes — listar todos del negocio activo
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const esGim = negocio.rubro === 'GIMNASIO';
    const clientes = await prisma.cliente.findMany({
      where: { negocioId: negocio.id },
      orderBy: { creadoEn: 'desc' },
      include: {
        _count: { select: { turnos: true } },
        ...(esGim
          ? {
              turnos: {
                orderBy: { fecha: 'desc' },
                select: { pago: { select: { fecha: true, monto: true } }, servicio: { select: { nombre: true, duracion: true, id: true } } },
              },
            }
          : {}),
      },
    });

    const resultado = esGim
      ? clientes.map((c) => {
          const { turnos, ...resto } = c;
          return { ...resto, membresia: estadoMembresia(turnos) };
        })
      : clientes;

    return NextResponse.json(resultado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST /api/clientes — crear nuevo cliente
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { nombre, dni, telefono, email, notas, etiquetas } = body;

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre: nombre.trim(),
        dni: dni?.trim() || null,
        telefono: telefono?.trim() || null,
        email: email?.trim() || null,
        notas: notas?.trim() || null,
        etiquetas: etiquetas?.trim() || null,
        negocioId: negocio.id,
      },
    });
    return NextResponse.json(cliente, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 });
  }
}
