// Cálculo del estado de membresía/cuota de un cliente según su último pago.
// Pensado para rubros con servicios "plan" (GIMNASIO: Mensual/Trimestral/Anual),
// donde la duración del servicio se mide en DÍAS.

// Diferencia en días calendario entre dos fechas (local), sin desplazarse por DST.
function diasEntre(a, b) {
  const utcMidnight = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((utcMidnight(new Date(a)) - utcMidnight(new Date(b))) / 86400000);
}

export function estadoMembresia(turnos) {
  const conPago = (turnos || [])
    .filter((t) => t.pago && t.servicio && Number(t.servicio.duracion) > 0)
    .sort((a, b) => new Date(b.pago.fecha) - new Date(a.pago.fecha));

  const ultimo = conPago[0];
  if (!ultimo) return null;

  const vence = new Date(ultimo.pago.fecha);
  vence.setDate(vence.getDate() + Number(ultimo.servicio.duracion));
  vence.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const dias = diasEntre(vence, hoy);

  let estado = 'VENCIDO';
  if (dias >= 0 && dias <= 3) estado = 'POR_VENCER';
  if (dias > 3) estado = 'AL_DIA';

  return {
    servicio: ultimo.servicio.nombre,
    servicioId: ultimo.servicio.id,
    vence: vence.toISOString(),
    diasParaVencer: dias,
    estado,
    ultimoPago: ultimo.pago.fecha,
    monto: Number(ultimo.pago.monto),
  };
}
