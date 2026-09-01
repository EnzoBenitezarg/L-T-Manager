import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

// GET /api/productos
export async function GET() {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const productos = await prisma.producto.findMany({ where: { negocioId: negocio.id }, orderBy: { nombre: 'asc' } });
    return NextResponse.json(productos.map((p) => ({
      ...p,
      stockBajo: p.stock <= p.stockMinimo && p.stockMinimo > 0,
    })));
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST /api/productos
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const { nombre, precio, stock, stockMinimo } = body;
    if (!nombre?.trim() || precio == null) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }
    const producto = await prisma.producto.create({
      data: {
        nombre: nombre.trim(),
        precio: Number(precio),
        stock: Number(stock) || 0,
        stockMinimo: Number(stockMinimo) || 0,
        negocioId: negocio.id,
      },
    });
    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear producto' }, { status: 500 });
  }
}
