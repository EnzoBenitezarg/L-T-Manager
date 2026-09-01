import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

function normalizarTelefono(raw) {
  let t = (raw || '').replace(/\s+/g, '').replace(/[-._]/g, '');
  t = t.replace(/[^\d+]/g, '');
  if (t.startsWith('+')) t = t.slice(1);
  if (t.startsWith('549') && t.length >= 12) t = t.replace(/^549/, '9');
  if (t.startsWith('54') && t.length >= 12) t = t.replace(/^54/, '');
  if (t.startsWith('011')) t = t.replace(/^011/, '11');
  if (t.startsWith('0')) t = t.slice(1);
  return t || null;
}

function parsearLinea(linea) {
  const limpia = linea.trim().replace(/^[•\-\*\d.)]+\s*/, '');
  if (limpia.split(/\s+/).filter(Boolean).length === 1) return null;

  const primerNumero = limpia.match(/(\+?\d[\d\s\-().]{6,}\d)/);
  let nombre = limpia;
  let telefono = null;
  if (primerNumero) {
    const partes = limpia.split(primerNumero[0]);
    nombre = (partes[0] + (partes[1] || '')).trim();
    telefono = normalizarTelefono(primerNumero[0]);
  }
  if (!nombre) return null;
  return { nombre, telefono };
}

// POST /api/clientes/importar — importar varios clientes desde texto
export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 401 });
  try {
    const body = await request.json();
    const texto = body?.texto || '';

    const lineas = texto
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const parseados = lineas
      .map(parsearLinea)
      .filter((c) => c && c.nombre);

    const nuevos = [];
    const existentes = [];
    const invalidos = [];

    for (const item of parseados) {
      const duplicadoNombre = await prisma.cliente.findFirst({
        where: { nombre: { equals: item.nombre, mode: 'insensitive' }, negocioId: negocio.id },
      });
      const duplicadoTel = item.telefono
        ? await prisma.cliente.findFirst({ where: { telefono: item.telefono, negocioId: negocio.id } })
        : null;

      if (duplicadoNombre || duplicadoTel) {
        existentes.push({ nombre: item.nombre, razon: 'Ya existe en tu agenda' });
        continue;
      }

      if (!item.telefono) {
        invalidos.push({ nombre: item.nombre, razon: 'Sin teléfono reconocible' });
        continue;
      }

      try {
        const c = await prisma.cliente.create({
          data: { nombre: item.nombre, telefono: item.telefono, negocioId: negocio.id },
        });
        nuevos.push(c);
      } catch {
        invalidos.push({ nombre: item.nombre, razon: 'Error al guardar' });
      }
    }

    return NextResponse.json({ nuevos, existentes, invalidos, total: parseados.length });
  } catch (error) {
    return NextResponse.json({ error: 'Error al importar clientes' }, { status: 500 });
  }
}
