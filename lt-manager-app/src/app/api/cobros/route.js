import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/cobros — listar pagos
export async function GET() {
  try {
    const pagos = await prisma.pago.findMany({
      orderBy: { fecha: 'desc' },
      include: {
        turno: {
          include: { cliente: true, servicio: true },
        },
      },
    });
    return NextResponse.json(pagos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener cobros' }, { status: 500 });
  }
}

// POST /api/cobros — registrar nuevo pago
export async function POST(request) {
  try {
    const body = await request.json();
    const { turnoId, monto, metodo } = body;

    if (!turnoId || !monto || !metodo) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Registrar pago y actualizar turno a completado si no lo estaba
    const [pago, turno] = await prisma.$transaction([
      prisma.pago.create({
        data: {
          turnoId: Number(turnoId),
          monto: Number(monto),
          metodo: metodo,
        },
        include: { turno: { include: { cliente: true, servicio: true } } },
      }),
      prisma.turno.update({
        where: { id: Number(turnoId) },
        data: { estado: 'COMPLETADO' },
      }),
    ]);

    return NextResponse.json(pago, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un pago para este turno' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al registrar cobro' }, { status: 500 });
  }
}
