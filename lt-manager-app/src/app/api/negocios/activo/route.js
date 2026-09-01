import { NextResponse } from 'next/server';
import { getUsuario, getNegocioActivo } from '@/lib/auth';
import { itemsDelNegocio, MODULOS, RUBROS } from '@/lib/navegacion';

// GET /api/negocios/activo — info del negocio seleccionado + sus módulos
export async function GET() {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const negocio = await getNegocioActivo();
  if (!negocio) return NextResponse.json({ error: 'No hay negocio activo' }, { status: 404 });

  const modulos = negocio.modulos ? JSON.parse(negocio.modulos) : itemsDelNegocio(negocio).map((m) => m.key);
  return NextResponse.json({
    negocio: { ...negocio, modulos },
    usuario: { nombre: usuario.nombre, email: usuario.email, plan: usuario.plan },
    rubros: RUBROS,
    todosLosModulos: MODULOS,
  });
}
