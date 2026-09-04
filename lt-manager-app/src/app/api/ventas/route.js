import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// GET /api/ventas
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const ventas = await prisma.venta.findMany({
      where: { negocioId: negocio.id },
      orderBy: { fecha: 'desc' },
      include: { items: true },
    });
    return NextResponse.json(ventas);
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 });
  }
}

// POST /api/ventas — registrar venta de productos (sin turno asociado)
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { items, metodo } = body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Faltan productos' }, { status: 400 });
    }

    // Descontar stock y validar integridad del inventario y precios (server-side)
    const resultado = await prisma.$transaction(async (tx) => {
      const itemsResueltos = [];
      for (const it of items) {
        const producto = await tx.producto.findFirst({
          where: { id: Number(it.productoId), negocioId: negocio.id },
        });
        if (!producto) throw new Error('Producto no encontrado');

        const cantidad = Math.floor(Number(it.cantidad));
        if (!Number.isFinite(cantidad) || cantidad < 1) {
          throw new Error(`Cantidad inválida para ${producto.nombre}`);
        }
        if (cantidad > producto.stock) {
          throw new Error(`Stock insuficiente para ${producto.nombre} (disponible: ${producto.stock})`);
        }

        await tx.producto.update({
          where: { id: producto.id },
          data: { stock: { decrement: cantidad } },
        });
        itemsResueltos.push({
          productoId: producto.id,
          nombre: producto.nombre,
          cantidad,
          precio: producto.precio,
        });
      }
      return tx.venta.create({
        data: {
          metodo: metodo || 'EFECTIVO',
          negocioId: negocio.id,
          items: { create: itemsResueltos },
        },
        include: { items: true },
      });
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    if (error?.message === 'Producto no encontrado') {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 400 });
    }
    if (error?.message?.startsWith('Stock insuficiente para')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error?.message?.startsWith('Cantidad inválida para')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al registrar venta' }, { status: 500 });
  }
}
