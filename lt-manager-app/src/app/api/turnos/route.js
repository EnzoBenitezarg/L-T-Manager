import { NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';
import { validarTurno } from '@/lib/turnos';

// GET /api/turnos — listar todos del negocio activo, opcionalmente filtrar por fecha
export async function GET(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get('fecha');
    const desde = searchParams.get('desde');
    const hasta = searchParams.get('hasta');

    const where = { negocioId: negocio.id };
    if (fecha) {
      // new Date('YYYY-MM-DDTHH:mm:ss') interpreta como hora local (Argentina, UTC-3),
      // lo cual genera el rango UTC correcto para filtrar turnos del d��a.
      const inicio = new Date(`${fecha}T00:00:00`);
      const fin = new Date(`${fecha}T23:59:59.999`);
      where.fecha = { gte: inicio, lte: fin };
    } else if (desde || hasta) {
      const filtro = {};
      if (desde) filtro.gte = new Date(`${desde}T00:00:00`);
      if (hasta) filtro.lte = new Date(`${hasta}T23:59:59.999`);
      where.fecha = filtro;
    }

    const turnos = await prisma.turno.findMany({
      where,
      orderBy: { fecha: 'asc' },
      include: { cliente: true, servicio: true, pago: true, profesional: true },
    });
    return NextResponse.json(turnos);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener turnos' }, { status: 500 });
  }
}

// POST /api/turnos — crear nuevo turno
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { clienteId, servicioId, fecha, duracionOverride, profesionalId, repetir } = body;

    if (!clienteId || !servicioId || !fecha) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Aislamiento por tenant: el cliente y el servicio deben pertenecer al negocio activo
    const [cliente, servicio, profesional] = await Promise.all([
      prisma.cliente.findFirst({ where: { id: Number(clienteId), negocioId: negocio.id } }),
      prisma.servicio.findFirst({ where: { id: Number(servicioId), negocioId: negocio.id } }),
      profesionalId
        ? prisma.miembro.findFirst({ where: { id: Number(profesionalId), negocioId: negocio.id, activo: true } })
        : Promise.resolve(null),
    ]);
    if (!cliente) {
      return NextResponse.json({ error: 'El cliente no pertenece a este negocio' }, { status: 400 });
    }
    if (!servicio) {
      return NextResponse.json({ error: 'El servicio no pertenece a este negocio' }, { status: 400 });
    }
    if (profesionalId && !profesional) {
      return NextResponse.json({ error: 'El profesional no pertenece a este negocio o está desactivado' }, { status: 400 });
    }

    const duracion = duracionOverride ? Number(duracionOverride) : servicio.duracion;

    // Serie de turnos recurrentes (validamos todos antes de crear cualquiera)
    // "Sin límite" llega como cantidad 0 => creamos un lote semestral fijo (26 semanas).
    const serieIlimitada = repetir && (String(repetir.cantidad) === '0' || Number(repetir.cantidad) === 0);
    const serieCantidad = repetir && Number(repetir.cantidad) > 1;
    if (repetir && (serieIlimitada || serieCantidad)) {
      const cadaSemanas = Math.max(1, Number(repetir.cadaSemanas) || 1);
      const cantidad = serieIlimitada
        ? 26
        : Math.min(12, Math.max(2, Math.floor(Number(repetir.cantidad)) || 2));
      const inicioSerie = new Date(fecha);
      const fechasSept = [];
      const errores = [];
      for (let i = 0; i < cantidad; i++) {
        const f = new Date(inicioSerie);
        f.setDate(f.getDate() + i * 7 * cadaSemanas);
        const e = await validarTurno({
          negocioId: negocio.id,
          inicio: f,
          duracion,
          profesionalId: profesional?.id,
        });
        if (e.length > 0) {
          errores.push(`${f.toLocaleDateString('es-AR')}: ${e.join(' ')}`);
        }
        fechasSept.push(f);
      }
      if (errores.length > 0) {
        return NextResponse.json(
          { error: `No se pudo agendar toda la serie:\n${errores.slice(0, 3).join('\n')}${errores.length > 3 ? '\n…' : ''}` },
          { status: 409 }
        );
      }
      const serieId = crypto.randomUUID();
      const creados = [];
      for (const f of fechasSept) {
        creados.push(
          await prisma.turno.create({
            data: {
              clienteId: cliente.id,
              servicioId: servicio.id,
              fecha: f,
              estado: 'PENDIENTE',
              duracionOverride: duracionOverride ? Number(duracionOverride) : null,
              profesionalId: profesional?.id ?? null,
              serieId,
              negocioId: negocio.id,
            },
            include: { cliente: true, servicio: true },
          })
        );
      }
      return NextResponse.json({ serieId, creados, count: creados.length }, { status: 201 });
    }

    // Validación backend: horario de atención, bloqueos y choque con otros turnos
    const errores = await validarTurno({
      negocioId: negocio.id,
      inicio: new Date(fecha),
      duracion,
      profesionalId: profesional?.id,
    });
    if (errores.length > 0) {
      return NextResponse.json({ error: errores.join(' ') }, { status: 409 });
    }

    const turno = await prisma.turno.create({
      data: {
        clienteId: cliente.id,
        servicioId: servicio.id,
        fecha: new Date(fecha),
        estado: 'PENDIENTE',
        duracionOverride: duracionOverride ? Number(duracionOverride) : null,
        profesionalId: profesional?.id ?? null,
        negocioId: negocio.id,
      },
      include: { cliente: true, servicio: true },
    });
    return NextResponse.json(turno, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear turno' }, { status: 500 });
  }
}
