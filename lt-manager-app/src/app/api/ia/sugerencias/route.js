import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

function inicioDelDia() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDelDia() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function inicioDelMes() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hace30Dias() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inicioDeSemana() {
  const d = new Date();
  const dia = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (dia - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function primeraMitadDelMes() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function segundaMitadDelMes() {
  const d = new Date();
  d.setDate(15);
  d.setHours(0, 0, 0, 0);
  return d;
}

function saludoSegunHora() {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos dias';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function analizarTurnosDelDia(hoy) {
  const completados = hoy.filter((t) => t.estado === 'COMPLETADO').length;
  const pendientes = hoy.filter((t) => t.estado === 'PENDIENTE').length;
  return { total: hoy.length, completados, pendientes };
}

export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) {
    return NextResponse.json({ sugerencias: [] });
  }

  try {
    const [
      deudores,
      stockBajo,
      clientes,
      turnosHoy,
      pagosPrimerQuincena,
      pagosSegundaQuincena,
      servicios,
      ventas,
      pagosMes,
      turnosSemana,
      miembros,
    ] = await Promise.all([
      prisma.turno.findMany({
        where: { negocioId: negocio.id, estado: 'FALTA_PAGAR' },
        select: {
          id: true,
          cliente: { select: { nombre: true } },
          servicio: { select: { nombre: true, precio: true } },
        },
      }),
      prisma.producto.findMany({
        where: { negocioId: negocio.id, stockMinimo: { gt: 0 } },
        select: { nombre: true, stock: true, stockMinimo: true },
      }),
      prisma.cliente.findMany({
        where: { negocioId: negocio.id },
        select: {
          id: true,
          nombre: true,
          telefono: true,
          creadoEn: true,
        },
        orderBy: { creadoEn: 'desc' },
        take: 200,
      }),
      prisma.turno.findMany({
        where: { negocioId: negocio.id, fecha: { gte: inicioDelDia(), lte: finDelDia() } },
        select: { id: true, estado: true, cliente: { select: { nombre: true } }, servicio: { select: { nombre: true } } },
      }),
      prisma.pago.aggregate({
        where: { negocioId: negocio.id, fecha: { gte: primeraMitadDelMes(), lt: segundaMitadDelMes() } },
        _sum: { monto: true },
      }),
      prisma.pago.aggregate({
        where: { negocioId: negocio.id, fecha: { gte: segundaMitadDelMes() } },
        _sum: { monto: true },
      }),
      prisma.servicio.findMany({
        where: { negocioId: negocio.id },
        select: { nombre: true, precio: true, duracion: true },
      }),
      prisma.venta.findMany({
        where: { negocioId: negocio.id },
        include: { items: true },
      }),
      prisma.pago.aggregate({
        where: { negocioId: negocio.id, fecha: { gte: inicioDelMes() } },
        _sum: { monto: true },
        _count: true,
      }),
      prisma.turno.findMany({
        where: { negocioId: negocio.id, fecha: { gte: inicioDeSemana() } },
        select: { id: true, estado: true, fecha: true },
      }),
      prisma.miembro.findMany({
        where: { negocioId: negocio.id },
        select: { id: true, usuario: { select: { nombre: true } }, color: true, porcentajeComision: true },
      }),
    ]);

    const sugerencias = [];

    // 1. Deudores (mayor prioridad)
    if (deudores.length > 0) {
      const totalDeuda = deudores.reduce((acc, d) => acc + (d.servicio?.precio || 0), 0);
      const nombres = deudores.slice(0, 3).map((d) => d.cliente?.nombre).filter(Boolean).join(', ');
      const extra = deudores.length > 3 ? ` y ${deudores.length - 3} mas` : '';
      sugerencias.push({
        id: 'deudores',
        titulo: 'Clientes con deuda',
        descripcion: `${deudores.length} clientes te deben $${totalDeuda.toLocaleString('es-AR')}${nombres ? ': ' + nombres + extra : ''}.`,
        icono: 'Deuda',
        accion: `redactame un mensaje para recordarles la deuda a ${nombres || 'los deudores'}`,
        prioridad: 1,
      });
    }

    // 2. Stock bajo
    const stockBajoFiltrado = stockBajo.filter((p) => p.stock <= p.stockMinimo);
    if (stockBajoFiltrado.length > 0) {
      const nombres = stockBajoFiltrado.slice(0, 3).map((p) => `${p.nombre} (${p.stock} uds)`).join(', ');
      const extra = stockBajoFiltrado.length > 3 ? ` y ${stockBajoFiltrado.length - 3} mas` : '';
      sugerencias.push({
        id: 'stock_bajo',
        titulo: 'Stock bajo',
        descripcion: `${stockBajoFiltrado.length} producto${stockBajoFiltrado.length > 1 ? 's' : ''} neces${stockBajoFiltrado.length > 1 ? 'itan' : 'ita'} reposicion: ${nombres}${extra}.`,
        icono: 'Stock',
        accion: 'que productos necesito reponer?',
        prioridad: 2,
      });
    }

    // 3. Tendencia de ingresos (primera vs segunda quincena)
    const pagosPrimeras = Number(pagosPrimerQuincena._sum.monto || 0);
    const pagosSegundas = Number(pagosSegundaQuincena._sum.monto || 0);
    const diaDelMes = new Date().getDate();
    if (diaDelMes > 15 && pagosPrimeras > 0) {
      const variacion = pagosSegundas > 0
        ? Math.round(((pagosSegundas - pagosPrimeras) / pagosPrimeras) * 100)
        : -100;
      if (Math.abs(variacion) > 10) {
        const tendencia = variacion > 0 ? 'subieron' : 'bajaron';
        sugerencias.push({
          id: 'tendencia',
          titulo: 'Tendencia de ingresos',
          descripcion: `Tus ingresos de la segunda quincena ${tendencia} ${Math.abs(variacion)}% vs la primera (${pagosPrimeras > 0 ? '$' + pagosPrimeras.toLocaleString('es-AR') : 'sin datos'}).`,
          icono: 'Tendencia',
          accion: 'por que crees que variaron mis ingresos este mes?',
          prioridad: 3,
        });
      }
    }

    // 4. Turnos de hoy
    if (turnosHoy.length > 0) {
      const info = analizarTurnosDelDia(turnosHoy);
      const saludo = saludoSegunHora();
      const detalle = info.completados > 0
        ? `${info.completados} de ${info.total} completados`
        : info.pendientes > 0
          ? `${info.pendientes} pendientes`
          : `${info.total} turnos`;
      sugerencias.push({
        id: 'turnos_hoy',
        titulo: `${saludo}, hoy tenes turnos`,
        descripcion: `Tenes ${detalle} para hoy.`,
        icono: 'Turnos',
        accion: 'resumen de mis turnos de hoy',
        prioridad: 4,
      });
    }

    // 5. Servicio top
    if (pagosMes._count > 0) {
      const pagosServicio = await prisma.pago.findMany({
        where: { negocioId: negocio.id, fecha: { gte: inicioDelMes() } },
        select: { monto: true, turno: { select: { servicio: { select: { nombre: true } } } } },
      });
      const mapa = {};
      pagosServicio.forEach((p) => {
        const nombre = p.turno?.servicio?.nombre;
        if (nombre) {
          mapa[nombre] = (mapa[nombre] || 0) + Number(p.monto);
        }
      });
      const top = Object.entries(mapa).sort((a, b) => b[1] - a[1])[0];
      if (top) {
        sugerencias.push({
          id: 'servicio_top',
          titulo: 'Servicio estrella',
          descripcion: `"${top[0]}" es tu servicio mas vendido este mes con $${top[1].toLocaleString('es-AR')} en cobros.`,
          icono: 'Servicio',
          accion: 'que servicios me conviene promocionar?',
          prioridad: 5,
        });
      }
    }

    // 6. Clientes inactivos
    const clientesInactivos = [];
    for (const c of clientes) {
      const turnos = await prisma.turno.count({
        where: {
          negocioId: negocio.id,
          clienteId: c.id,
          fecha: { gte: hace30Dias() },
        },
      });
      if (turnos === 0 && c.telefono) {
        clientesInactivos.push(c);
      }
    }
    if (clientesInactivos.length > 0) {
      const nombres = clientesInactivos.slice(0, 2).map((c) => c.nombre).join(', ');
      const extra = clientesInactivos.length > 2 ? ` y ${clientesInactivos.length - 2} mas` : '';
      sugerencias.push({
        id: 'clientes_inactivos',
        titulo: 'Clientes que no vienen',
        descripcion: `${clientesInactivos.length} clientes no tienen turnos hace mas de 30 dias: ${nombres}${extra}.`,
        icono: 'Clientes',
        accion: 'armame un mensaje para reactivar clientes que no vienen',
        prioridad: 6,
      });
    }

    // 7. Margen bajo en productos
    const productos = await prisma.producto.findMany({
      where: { negocioId: negocio.id },
      select: { nombre: true, precio: true, costo: true },
    });
    const margenesBajos = productos.filter((p) => {
      if (p.costo <= 0) return false;
      const margen = ((p.precio - p.costo) / p.precio) * 100;
      return margen < 20;
    });
    if (margenesBajos.length > 0) {
      const nombres = margenesBajos.slice(0, 2).map((p) => {
        const margen = Math.round(((p.precio - p.costo) / p.precio) * 100);
        return `${p.nombre} (${margen}%)`;
      }).join(', ');
      sugerencias.push({
        id: 'margen_bajo',
        titulo: 'Margen bajo',
        descripcion: `${margenesBajos.length} producto${margenesBajos.length > 1 ? 's' : ''} con margen menor al 20%: ${nombres}. Con la inflacion actual, conviene revisar.`,
        icono: 'Margen',
        accion: 'conviene subir precios por la inflacion?',
        prioridad: 7,
      });
    }

    // 8. Productos sin vender
    const vendidos = new Set();
    ventas.forEach((v) => v.items.forEach((i) => { if (i.productoId) vendidos.add(i.productoId); }));
    const sinVender = productos.filter((p) => !vendidos.has(p.id) && p.stock > 0);
    if (sinVender.length > 0) {
      const nombres = sinVender.slice(0, 3).map((p) => p.nombre).join(', ');
      sugerencias.push({
        id: 'sin_vender',
        titulo: 'Productos sin movimiento',
        descripcion: `${sinVender.length} producto${sinVender.length > 1 ? 's' : ''} nunca se vendieron: ${nombres}${sinVender.length > 3 ? '...' : ''}.`,
        icono: 'Productos',
        accion: 'que hago con los productos que no se venden?',
        prioridad: 8,
      });
    }

    // 9. Turnos cancelados esta semana
    const cancelados = turnosSemana.filter((t) => t.estado === 'CANCELADO');
    if (cancelados.length > 1) {
      sugerencias.push({
        id: 'cancelaciones',
        titulo: 'Turnos cancelados',
        descripcion: `Tuviste ${cancelados.length} cancelaciones esta semana.`,
        icono: 'Cancelaciones',
        accion: 'por que me cancelan tantos turnos?',
        prioridad: 9,
      });
    }

    // 10. Comisiones del equipo
    if (pagosMes._count > 0) {
      const pagosConComision = await prisma.pago.findMany({
        where: { negocioId: negocio.id, fecha: { gte: inicioDelMes() }, comision: { gt: 0 } },
        select: { comision: true, profesionalId: true },
      });
      const comisionesPorProf = {};
      pagosConComision.forEach((p) => {
        if (p.profesionalId) {
          comisionesPorProf[p.profesionalId] = (comisionesPorProf[p.profesionalId] || 0) + Number(p.comision);
        }
      });
      const profConComision = miembros
        .filter((m) => comisionesPorProf[m.id])
        .sort((a, b) => (comisionesPorProf[b.id] || 0) - (comisionesPorProf[a.id] || 0));
      if (profConComision.length > 0) {
        const nombre = profConComision[0].usuario?.nombre;
        const monto = comisionesPorProf[profConComision[0].id];
        sugerencias.push({
          id: 'comisiones',
          titulo: 'Comisiones del equipo',
          descripcion: `${nombre} acumulo $${Math.round(monto).toLocaleString('es-AR')} en comisiones este mes.`,
          icono: 'Equipo',
          accion: 'cuanto le debo a cada profesional?',
          prioridad: 10,
        });
      }
    }

    // Ordenar por prioridad y retornar maximo 6
    sugerencias.sort((a, b) => a.prioridad - b.prioridad);
    return NextResponse.json({ sugerencias: sugerencias.slice(0, 6) });
  } catch (error) {
    console.error('Error al generar sugerencias:', error);
    return NextResponse.json({ sugerencias: [] });
  }
}
