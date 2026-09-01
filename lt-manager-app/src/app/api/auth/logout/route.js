import { NextResponse } from 'next/server';
import { cerrarSesion } from '@/lib/auth';

// POST /api/auth/logout
export async function POST() {
  await cerrarSesion();
  return NextResponse.json({ ok: true });
}
