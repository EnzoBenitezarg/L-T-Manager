import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

export async function PUT(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, precio, stock, stockMinimo } = body;
    const producto = await prisma.producto.updateMany({
      where: { id: Number(id), negocioId: negocio.id },
      data: {
        nombre: nombre.trim(),
        precio: Number(precio),
        stock: Number(stock) || 0,
        stockMinimo: Number(stockMinimo) || 0,
      },
    });
    if (producto.count === 0) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar producto' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const { id } = await params;
    await prisma.producto.deleteMany({ where: { id: Number(id), negocioId: negocio.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 });
  }
}
