import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUsuario, setNegocioActivo, negociosDelUsuario } from '@/lib/auth';
import { rubroModulos } from '@/lib/navegacion';

const LÍMITE_PLAN = { STARTER: 1, PYME: 3, EMPRESA: 100 };

// GET /api/negocios — negocios a los que el usuario tiene acceso (dueño o miembro)
export async function GET() {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const negocios = negociosDelUsuario(usuario);
  // Marca si el usuario es dueño de ese negocio (para ocultar acciones admin)
  const miembroDe = new Map((usuario.miembros || []).map((m) => [m.negocioId, m.rol]));
  return NextResponse.json(
    negocios.map((n) => ({
      ...n,
      rolMiembro: miembroDe.get(n.id) || null,
      esDueño: n.usuarioId === usuario.id,
    }))
  );
}

// POST /api/negocios — crear nuevo negocio (respetando límite del plan)
export async function POST(request) {
  const usuario = await getUsuario();
  if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  try {
    const body = await request.json();
    const { nombre, rubro } = body;

    const limite = LÍMITE_PLAN[usuario.plan] ?? 1;
    const actuales = usuario.negocios.length;
    if (actuales >= limite) {
      return NextResponse.json({
        error: `Tu plan (${usuario.plan}) permite hasta ${limite} negocio${limite !== 1 ? 's' : ''}. Actualizá tu plan para crear más.`,
      }, { status: 403 });
    }

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'Falta el nombre del negocio' }, { status: 400 });
    }

    const r = rubro || 'BARBERIA';
    const negocio = await prisma.negocio.create({
      data: {
        nombre: nombre.trim(),
        rubro: r,
        usuarioId: usuario.id,
        modulos: JSON.stringify(rubroModulos(r)),
      },
    });
    // El dueño también queda registrado como miembro (rol DUENIO)
    await prisma.miembro.create({
      data: { rol: 'DUENIO', usuarioId: usuario.id, negocioId: negocio.id },
    });
    await setNegocioActivo(negocio.id);
    return NextResponse.json(negocio, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear el negocio' }, { status: 500 });
  }
}
