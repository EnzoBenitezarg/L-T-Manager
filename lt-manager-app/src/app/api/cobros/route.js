import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// GET /api/cobros — listar pagos
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const pagos = await prisma.pago.findMany({
      where: { negocioId: negocio.id },
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
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { turnoId, monto, metodo, propina, descuento } = body;

    if (!turnoId || !monto || !metodo) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    const turno = await prisma.turno.findFirst({
      where: { id: Number(turnoId), negocioId: negocio.id },
      include: { profesional: true },
    });
    if (!turno) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });

    // Comisión del profesional que hizo el turno (snapshot del % al cobrar)
    const montoNum = Number(monto);
    const pct = turno.profesional?.porcentajeComision || 0;
    const comision = pct > 0 ? Number(((montoNum * pct) / 100).toFixed(2)) : 0;

    // Registrar pago y actualizar turno a completado si no lo estaba
    const [pago] = await prisma.$transaction([
      prisma.pago.create({
        data: {
          turnoId: Number(turnoId),
          negocioId: negocio.id,
          monto: montoNum,
          metodo: metodo,
          propina: Number(propina) || 0,
          descuento: Number(descuento) || 0,
          comision,
          profesionalId: turno.profesionalId,
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

// PATCH /api/cobros — acciones alternativas (marcar como deuda / quitar deuda)
// body: { turnoId, accion: 'FALTA_PAGAR' | 'CANCELAR_DEUDA' }
export async function PATCH(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { turnoId, accion } = body;
    if (!turnoId) return NextResponse.json({ error: 'Falta turno' }, { status: 400 });

    const estado = accion === 'FALTA_PAGAR' ? 'FALTA_PAGAR' : 'PENDIENTE';
    const turno = await prisma.turno.updateMany({
      where: { id: Number(turnoId), negocioId: negocio.id },
      data: { estado },
    });
    if (turno.count === 0) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar cobro' }, { status: 500 });
  }
}
