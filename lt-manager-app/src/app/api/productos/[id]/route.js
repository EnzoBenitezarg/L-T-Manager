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
    if (nombre == null || String(nombre).trim() === '') {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 });
    }
    const precioNum = Number(precio);
    if (!Number.isFinite(precioNum) || precioNum < 0) {
      return NextResponse.json({ error: 'El precio es inválido' }, { status: 400 });
    }
    const stockNum = Number(stock);
    const stockMinNum = Number(stockMinimo);
    const producto = await prisma.producto.updateMany({
      where: { id: Number(id), negocioId: negocio.id },
      data: {
        nombre: String(nombre).trim(),
        precio: precioNum,
        stock: Number.isFinite(stockNum) ? Math.max(0, Math.floor(stockNum)) : 0,
        stockMinimo: Number.isFinite(stockMinNum) ? Math.max(0, Math.floor(stockMinNum)) : 0,
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
