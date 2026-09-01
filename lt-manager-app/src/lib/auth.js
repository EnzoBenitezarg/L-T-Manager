import { cookies } from 'next/headers';
import crypto from 'crypto';
import prisma from './prisma';
import bcrypt from 'bcryptjs';

// En desarrollo local se permite un secreto por defecto para poder correr sin configurar nada.
// En producción es obligatorio: sin SESSION_SECRET no se pueden firmar sesiones y falla de forma explícita.
const SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === 'production' ? null : 'lT-manager-secret-local-dev-2026');

function obtenerSecret() {
  if (!SECRET) {
    throw new Error(
      'SESSION_SECRET no está definido. Configurá la variable de entorno SESSION_SECRET antes de arrancar en producción.'
    );
  }
  return SECRET;
}

function sign(data) {
  return crypto.createHmac('sha256', obtenerSecret()).update(data).digest('hex');
}

// Guarda la sesión del usuario en una cookie firmada
export async function crearSesion(usuarioId) {
  const cookieStore = await cookies();
  const payload = `${usuarioId}`;
  const token = `${payload}.${sign(payload)}`;
  cookieStore.set('lt_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
}

export async function leerSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get('lt_session')?.value;
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || sign(payload) !== sig) return null;
  return Number(payload);
}

export async function cerrarSesion() {
  const cookieStore = await cookies();
  cookieStore.set('lt_session', '', { httpOnly: true, path: '/', maxAge: 0 });
}

// Obtiene el usuario logueado o null
export async function getUsuario() {
  const id = await leerSesion();
  if (!id) return null;
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: {
      negocios: { orderBy: { creadoEn: 'asc' } },
      miembros: { include: { negocio: true } },
    },
  });
  return usuario;
}

// Todos los negocios que el usuario puede usar (por ser dueño o miembro)
export function negociosDelUsuario(usuario) {
  const ids = new Set();
  const negocios = [];
  for (const n of usuario?.negocios || []) {
    if (ids.has(n.id)) continue;
    ids.add(n.id);
    negocios.push(n);
  }
  for (const m of usuario?.miembros || []) {
    if (!m.negocio || ids.has(m.negocio.id)) continue;
    ids.add(m.negocio.id);
    negocios.push(m.negocio);
  }
  return negocios;
}

// Obtiene el negocio "activo" del usuario (el que se eligió en el menú)
export async function getNegocioActivo() {
  const usuario = await getUsuario();
  if (!usuario) return null;
  const cookieStore = await cookies();
  const negocioId = Number(cookieStore.get('lt_negocio')?.value);
  const negocios = negociosDelUsuario(usuario);
  const negocio = negocios.find((n) => n.id === negocioId);
  // Si no hay negocio activo o no tiene acceso, usa el primero
  return negocio || negocios[0] || null;
}

// Es el registro de miembro del usuario logueado dentro del negocio activo.
// Devuelve null si el usuario no es miembro (pero puede ser dueño vía usuarioId).
export async function getMiembroActivo(negocioId) {
  const id = await leerSesion();
  if (!id || !negocioId) return null;
  return prisma.miembro.findFirst({ where: { usuarioId: id, negocioId } });
}

export async function setNegocioActivo(negocioId) {
  const cookieStore = await cookies();
  cookieStore.set('lt_negocio', String(negocioId), { httpOnly: true, sameSite: 'lax', path: '/' });
}

// Utilidad para hash de contraseñas
export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
