import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';
import { validarTurno } from '@/lib/turnos';

// PATCH /api/turnos/[id] — cambiar estado y/o reprogramar día, hora, cliente, servicio, profesional
export async function PATCH(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado, fecha, clienteId, servicioId, duracionOverride, profesionalId, moverSerie } = body;

    const turno = await prisma.turno.findFirst({
      where: { id: Number(id), negocioId: negocio.id },
      include: { servicio: true },
    });
    if (!turno) return NextResponse.json({ error: 'Turno no encontrado' }, { status: 404 });

    const data = {};
    if (estado) data.estado = estado;

    // Nuevo profesional (si se indica)
    let nProfesionalId = profesionalId !== undefined ? Number(profesionalId) : turno.profesionalId;
    if (profesionalId !== undefined) {
      const miembro = await prisma.miembro.findFirst({
        where: { id: nProfesionalId || -1, negocioId: negocio.id, activo: true },
      });
      if (nProfesionalId && !miembro) {
        return NextResponse.json({ error: 'El profesional no pertenece a este negocio o está desactivado' }, { status: 400 });
      }
      data.profesionalId = nProfesionalId || null;
    }

    // Mover toda una serie de turnos recurrentes
    if (moverSerie && turno.serieId && fecha) {
      const deltaMs = new Date(fecha).getTime() - turno.fecha.getTime();
      const serie = await prisma.turno.findMany({ where: { serieId: turno.serieId, negocioId: negocio.id } });
      const nuevos = [];
      for (const t of serie) {
        const f = new Date(new Date(t.fecha).getTime() + deltaMs);
        const nProf = profesionalId !== undefined ? nProfesionalId : t.profesionalId;
        const duracionE = t.duracionOverride || t.servicio?.duracion || 0;
        const errores = await validarTurno({
          negocioId: negocio.id,
          inicio: f,
          duracion: duracionE,
          profesionalId: nProf,
          ignorarTurnoId: t.id,
        });
        if (errores.length > 0) {
          return NextResponse.json(
            { error: `No se pudo mover toda la serie. ${t.cliente?.nombre || 'Un turno'} el ${f.toLocaleDateString('es-AR')}: ${errores.join(' ')}` },
            { status: 409 }
          );
        }
        nuevos.push({ id: t.id, fecha: f });
      }
      await prisma.$transaction(nuevos.map((n) => prisma.turno.update({ where: { id: n.id }, data: { fecha: n.fecha } })));
      return NextResponse.json({ ok: true, movidos: nuevos.length });
    }

    if (fecha) {
      // Cliente, servicio y duración finales después de la reprogramación
      let nClienteId = clienteId != null ? Number(clienteId) : turno.clienteId;
      let nServicioId = servicioId != null ? Number(servicioId) : turno.servicioId;
      let nDuracion = duracionOverride != null ? Number(duracionOverride) : turno.duracionOverride;
      let servicioFinal = turno.servicio;

      if (nServicioId !== turno.servicioId) {
        servicioFinal = await prisma.servicio.findFirst({
          where: { id: nServicioId, negocioId: negocio.id },
        });
        if (!servicioFinal) {
          return NextResponse.json({ error: 'El servicio no pertenece a este negocio' }, { status: 400 });
        }
        if (duracionOverride == null) nDuracion = null;
      }
      if (nClienteId !== turno.clienteId) {
        const clienteNuevo = await prisma.cliente.findFirst({
          where: { id: nClienteId, negocioId: negocio.id },
        });
        if (!clienteNuevo) {
          return NextResponse.json({ error: 'El cliente no pertenece a este negocio' }, { status: 400 });
        }
      }

      const duracionEfectiva = nDuracion || servicioFinal?.duracion || 0;
      const errores = await validarTurno({
        negocioId: negocio.id,
        inicio: new Date(fecha),
        duracion: duracionEfectiva,
        profesionalId: nProfesionalId,
        ignorarTurnoId: turno.id,
      });
      if (errores.length > 0) {
        return NextResponse.json({ error: errores.join(' ') }, { status: 409 });
      }

      data.fecha = new Date(fecha);
      if (clienteId != null) data.clienteId = nClienteId;
      if (servicioId != null) data.servicioId = nServicioId;
      if (duracionOverride != null) data.duracionOverride = nDuracion;
    }

    const actualizado = await prisma.turno.update({
      where: { id: turno.id },
      data,
      include: { cliente: true, servicio: true, profesional: true },
    });
    return NextResponse.json(actualizado);
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar turno' }, { status: 500 });
  }
}

// DELETE /api/turnos/[id] — cancelar/eliminar turno
export async function DELETE(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.turno.deleteMany({ where: { id: Number(id), negocioId: negocio.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar turno' }, { status: 500 });
  }
}
