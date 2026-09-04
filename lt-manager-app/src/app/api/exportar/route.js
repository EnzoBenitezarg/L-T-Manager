import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

function esc(x) {
  const s = x == null ? '' : String(x);
  return '"' + s.replace(/"/g, '""') + '"';
}

function csvLine(arr) {
  return arr.map(esc).join(',');
}

function toDateStr(d) {
  if (!d) return '';
  const x = new Date(d);
  return x.toLocaleDateString('es-AR');
}

// GET /api/exportar — descarga un CSV con los datos del negocio
export async function GET(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const seccion = searchParams.get('seccion') || 'todo';

    const SECCIONES = new Set(['todo', 'clientes', 'servicios', 'turnos', 'pagos', 'productos', 'combos', 'gastos', 'ventas']);
    if (!SECCIONES.has(seccion)) {
      return NextResponse.json({ error: 'Sección inválida' }, { status: 400 });
    }

    const [clientes, servicios, turnos, pagos, productos, combos, gastos, ventas] = await Promise.all([
      prisma.cliente.findMany({ where: { negocioId: negocio.id }, orderBy: { creadoEn: 'asc' } }),
      prisma.servicio.findMany({ where: { negocioId: negocio.id } }),
      prisma.turno.findMany({ where: { negocioId: negocio.id }, include: { cliente: true, servicio: true } }),
      prisma.pago.findMany({ where: { negocioId: negocio.id }, include: { turno: { include: { cliente: true } } } }),
      prisma.producto.findMany({ where: { negocioId: negocio.id } }),
      prisma.combo.findMany({ where: { negocioId: negocio.id }, include: { servicios: true } }),
      prisma.gasto.findMany({ where: { negocioId: negocio.id } }),
      prisma.venta.findMany({ where: { negocioId: negocio.id }, include: { items: true } }),
    ]);

  const partes = [];

  if (seccion === 'todo' || seccion === 'clientes') {
    partes.push(csvLine(['TIPO', 'Clientes']));
    partes.push(csvLine(['Nombre', 'DNI', 'Teléfono', 'Email', 'Etiquetas', 'Notas', 'Creado']));
    clientes.forEach((c) => partes.push(csvLine([c.nombre, c.dni, c.telefono, c.email, c.etiquetas, c.notas, toDateStr(c.creadoEn)])));
    partes.push('');
  }

  if (seccion === 'todo' || seccion === 'servicios') {
    partes.push(csvLine(['TIPO', 'Servicios']));
    partes.push(csvLine(['Nombre', 'Precio', 'Duración (min)', 'Descripción']));
    servicios.forEach((s) => partes.push(csvLine([s.nombre, s.precio, s.duracion, s.descripcion])));
    partes.push('');
  }

  if (seccion === 'todo' || seccion === 'turnos') {
    partes.push(csvLine(['TIPO', 'Turnos']));
    partes.push(csvLine(['Fecha', 'Hora', 'Cliente', 'Servicio', 'Estado', 'Duración']));
    turnos.forEach((t) => partes.push(csvLine([
      toDateStr(t.fecha),
      new Date(t.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      t.cliente?.nombre,
      t.servicio?.nombre,
      t.estado,
      t.duracionOverride || t.servicio?.duracion || '',
    ])));
    partes.push('');
  }

  if (seccion === 'todo' || seccion === 'pagos') {
    partes.push(csvLine(['TIPO', 'Pagos']));
    partes.push(csvLine(['Fecha', 'Cliente', 'Monto', 'Método', 'Propina', 'Descuento']));
    pagos.forEach((p) => partes.push(csvLine([
      toDateStr(p.fecha),
      p.turno?.cliente?.nombre,
      p.monto,
      p.metodo,
      p.propina,
      p.descuento,
    ])));
    partes.push('');
  }

  if (seccion === 'todo' || seccion === 'productos') {
    partes.push(csvLine(['TIPO', 'Productos']));
    partes.push(csvLine(['Nombre', 'Precio', 'Stock', 'Stock mín']));
    productos.forEach((p) => partes.push(csvLine([p.nombre, p.precio, p.stock, p.stockMinimo])));
    partes.push('');
  }

  if (seccion === 'todo' || seccion === 'combos') {
    partes.push(csvLine(['TIPO', 'Combos']));
    partes.push(csvLine(['Nombre', 'Precio', 'Servicios']));
    combos.forEach((c) => partes.push(csvLine([c.nombre, c.precio, c.servicios.map((s) => s.nombre).join(' + ')])));
    partes.push('');
  }

  if (seccion === 'todo' || seccion === 'gastos') {
    partes.push(csvLine(['TIPO', 'Gastos']));
    partes.push(csvLine(['Fecha', 'Concepto', 'Monto', 'Categoría']));
    gastos.forEach((g) => partes.push(csvLine([toDateStr(g.fecha), g.concepto, g.monto, g.categoria])));
    partes.push('');
  }

  if (seccion === 'todo' || seccion === 'ventas') {
    partes.push(csvLine(['TIPO', 'Ventas de productos']));
    partes.push(csvLine(['Fecha', 'Producto', 'Cantidad', 'Precio unitario', 'Subtotal']));
    ventas.forEach((v) => {
      v.items.forEach((i) => partes.push(csvLine([
        toDateStr(v.fecha),
        i.nombre,
        i.cantidad,
        i.precio,
        i.cantidad * i.precio,
      ])));
    });
    partes.push('');
  }

  const filename = `lt-manager-${negocio.nombre.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${seccion}.csv`;
  const body = '\uFEFF' + partes.join('\n'); // BOM UTF-8 para Excel

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
  } catch (error) {
    return NextResponse.json({ error: 'Error al exportar' }, { status: 500 });
  }
}
