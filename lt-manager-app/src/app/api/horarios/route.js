import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';
import { aMinutos } from '@/lib/fecha';

// GET /api/horarios — horarios de atención del negocio activo
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const horarios = await prisma.horario.findMany({
      where: { negocioId: negocio.id },
      orderBy: { diaSemana: 'asc' },
    });
    return NextResponse.json(horarios);
  } catch {
    return NextResponse.json({ error: 'Error al obtener horarios' }, { status: 500 });
  }
}

// PUT /api/horarios — guarda los 7 días de la semana (upsert).
// body: [{ diaSemana, abierto, apertura, cierre }]  |  [] para borrar todos (abierto 24 h)
export async function PUT(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Formato inválido' }, { status: 400 });
    }

    // Borrar todos = sin límites (abierto todo el día)
    if (body.length === 0) {
      await prisma.horario.deleteMany({ where: { negocioId: negocio.id } });
      return NextResponse.json([]);
    }

    const diasValidos = new Set([0, 1, 2, 3, 4, 5, 6]);
    for (const h of body) {
      if (!diasValidos.has(Number(h.diaSemana))) {
        return NextResponse.json({ error: 'Día de la semana inválido' }, { status: 400 });
      }
      if (h.abierto) {
        const desde = aMinutos(h.apertura);
        const hasta = aMinutos(h.cierre);
        if (desde == null || hasta == null || hasta <= desde) {
          return NextResponse.json(
            { error: 'La hora de cierre tiene que ser después de la apertura' },
            { status: 400 }
          );
        }
      }
    }

    await prisma.$transaction(
      body.map((h) => {
        const dia = Number(h.diaSemana);
        const abierto = !!h.abierto;
        return prisma.horario.upsert({
          where: { negocioId_diaSemana: { negocioId: negocio.id, diaSemana: dia } },
          update: {
            abierto,
            apertura: abierto ? h.apertura : null,
            cierre: abierto ? h.cierre : null,
          },
          create: {
            negocioId: negocio.id,
            diaSemana: dia,
            abierto,
            apertura: abierto ? h.apertura : null,
            cierre: abierto ? h.cierre : null,
          },
        });
      })
    );

    const horarios = await prisma.horario.findMany({
      where: { negocioId: negocio.id },
      orderBy: { diaSemana: 'asc' },
    });
    return NextResponse.json(horarios);
  } catch {
    return NextResponse.json({ error: 'Error al guardar horarios' }, { status: 500 });
  }
}