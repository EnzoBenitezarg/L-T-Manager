// Utilidades de fechas y horas en HORA LOCAL (Argentina, sin UTC).

// Fecha local como 'YYYY-MM-DD'
export function toDateString(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Día de la semana local: 0=Domingo .. 6=Sábado
export function diaSemana(date) {
  return new Date(date).getDay();
}

// "14:30" -> 870 (minutos desde medianoche). Devuelve null si el formato no es válido.
export function aMinutos(hhmm) {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Date -> minutos desde medianoche
export function minutosDelDia(date) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

// Date local -> 'YYYY-MM-DDTHH:MM' (para <input type="datetime-local">)
export function aDatetimeLocal(date) {
  const d = new Date(date);
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${d.getFullYear()}-${mo}-${da}T${h}:${mi}`;
}