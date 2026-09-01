// Formato de montos en pesos argentinos (es-AR)
export function formatearMonto(n) {
  const num = Number(n) || 0;
  return `$${num.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
}

// Símbolo corto para cada método de pago
export const METODO_ETIQUETA = {
  EFECTIVO: '💵 Efectivo',
  TRANSFERENCIA: '🏦 Transferencia',
  TARJETA: '💳 Tarjeta',
};