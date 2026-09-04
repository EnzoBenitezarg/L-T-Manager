import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// POST /api/cobros/cuota — registrar pago de cuota/membresía de un cliente (rubro gimnasio)
// Crea un turno COMPLETADO + su pago en una sola operación.
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });

  try {
    const body = await request.json();
    const { clienteId, servicioId, monto, metodo } = body;

    if (!clienteId || !servicioId) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const cliente = await prisma.cliente.findFirst({
      where: { id: Number(clienteId), negocioId: negocio.id },
    });
    if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });

    const servicio = await prisma.servicio.findFirst({
      where: { id: Number(servicioId), negocioId: negocio.id },
    });
    if (!servicio) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 });

    const montoNum = monto != null && monto !== '' ? Number(monto) : Number(servicio.precio);
    const precio = Number.isFinite(montoNum) && montoNum >= 0 ? montoNum : Number(servicio.precio);
    const pagoMetodo = metodo || 'EFECTIVO';

    const resultado = await prisma.$transaction(async (tx) => {
      const turno = await tx.turno.create({
        data: {
          clienteId: Number(clienteId),
          servicioId: Number(servicioId),
          fecha: new Date(),
          estado: 'COMPLETADO',
          negocioId: negocio.id,
        },
      });
      const pago = await tx.pago.create({
        data: {
          turnoId: turno.id,
          negocioId: negocio.id,
          monto: precio,
          metodo: pagoMetodo,
          propina: 0,
          descuento: 0,
        },
      });
      return { turno, pago };
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un pago para este servicio' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al registrar la cuota' }, { status: 500 });
  }
}
