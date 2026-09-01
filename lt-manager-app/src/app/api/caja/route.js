import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// Fecha local (no UTC) como 'YYYY-MM-DD'
function toLocalDateString(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// GET /api/caja — caja del día (o la indicada) + historial + resumen por método de pago
export async function GET(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const fechaParam = searchParams.get('fecha') || toLocalDateString(new Date());

    const todas = await prisma.caja.findMany({
      where: { negocioId: negocio.id },
      orderBy: { fecha: 'desc' },
    });

    const caja = todas.find((c) => toLocalDateString(c.fecha) === fechaParam) || null;
    const historial = todas.slice(0, 30);

    // ── Resumen del día: ingresos por método (turnos + ventas de productos), propinas y gastos ──
    const [pagos, ventas, gastos] = await Promise.all([
      prisma.pago.findMany({
        where: { negocioId: negocio.id },
        select: { fecha: true, monto: true, propina: true, metodo: true },
      }),
      prisma.venta.findMany({
        where: { negocioId: negocio.id },
        include: { items: true },
      }),
      prisma.gasto.findMany({
        where: { negocioId: negocio.id },
        select: { fecha: true, monto: true },
      }),
    ]);

    const ingresosPorMetodo = { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0 };
    let propinas = 0;
    for (const p of pagos) {
      if (toLocalDateString(p.fecha) !== fechaParam) continue;
      const metodo = p.metodo || 'EFECTIVO';
      ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + Number(p.monto);
      propinas += Number(p.propina) || 0;
    }
    for (const v of ventas) {
      if (toLocalDateString(v.fecha) !== fechaParam) continue;
      const metodo = v.metodo || 'EFECTIVO';
      const total = v.items.reduce((acc, it) => acc + Number(it.cantidad) * Number(it.precio), 0);
      ingresosPorMetodo[metodo] = (ingresosPorMetodo[metodo] || 0) + total;
    }

    let gastosHoy = 0;
    for (const g of gastos) {
      if (toLocalDateString(g.fecha) === fechaParam) gastosHoy += Number(g.monto);
    }

    const apertura = Number(caja?.apertura) || 0;
    const totalIngresos = Object.values(ingresosPorMetodo).reduce((a, b) => a + b, 0) + propinas;
    const esperado = apertura + totalIngresos - gastosHoy;
    const conteoReal = caja?.conteoReal != null ? Number(caja.conteoReal) : null;

    const resumen = {
      apertura,
      ingresosPorMetodo,
      propinas,
      totalIngresos,
      gastosHoy,
      esperado,
      conteoReal,
      diferencia: conteoReal != null ? conteoReal - esperado : null,
    };

    return NextResponse.json({ caja, historial, resumen });
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener caja' }, { status: 500 });
  }
}

// POST /api/caja — guardar apertura y/o conteo real del día
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { fecha, apertura, conteoReal } = body;
    const dia = fecha || toLocalDateString(new Date());

    const data = {};
    if (apertura != null) data.apertura = Number(apertura);
    if (conteoReal != null) data.conteoReal = Number(conteoReal);

    const todas = await prisma.caja.findMany({ where: { negocioId: negocio.id } });
    const existente = todas.find((c) => toLocalDateString(c.fecha) === dia);

    let caja;
    if (existente) {
      caja = await prisma.caja.update({ where: { id: existente.id }, data });
    } else {
      caja = await prisma.caja.create({
        data: {
          fecha: new Date(dia + 'T12:00:00'),
          apertura: apertura != null ? Number(apertura) : 0,
          conteoReal: conteoReal != null ? Number(conteoReal) : null,
          negocioId: negocio.id,
        },
      });
    }
    return NextResponse.json(caja, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al guardar caja' }, { status: 500 });
  }
}
