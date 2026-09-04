// Definición de módulos disponibles y sus presets por rubro
export const MODULOS = [
  { key: 'dashboard', label: 'Dashboard', href: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'ia', label: 'Asistente IA', href: '/ia', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { key: 'turnos', label: 'Turnos', href: '/turnos', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'clientes', label: 'Clientes', href: '/clientes', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'servicios', label: 'Servicios', href: '/servicios', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'productos', label: 'Productos', href: '/productos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'cobros', label: 'Cobros', href: '/cobros', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
  { key: 'ventas', label: 'Ventas', href: '/ventas', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.29 2.29c-.63.63-.19 1.71.7 1.71H17M9 20a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z' },
  { key: 'gastos', label: 'Gastos', href: '/gastos', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'reportes', label: 'Reportes', href: '/reportes', icon: 'M7 19V9m5 10V5m5 14v-6' },
  { key: 'mensajes', label: 'Mensajes', href: '/mensajes', icon: 'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { key: 'configuracion', label: 'Configuración', href: '/configuracion', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
];

// Módulos por defecto según el rubro.
// 'ventas' concentra el cobro de turnos y la venta de productos, por eso 'cobros'
// queda fuera de los presets para no duplicar funcionalidad en la barra lateral.
export const PRESETS_RUBRO = {
  BARBERIA: ['dashboard', 'turnos', 'clientes', 'servicios', 'ventas', 'productos', 'gastos', 'reportes', 'mensajes', 'ia'],
  ESTETICA: ['dashboard', 'turnos', 'clientes', 'servicios', 'ventas', 'productos', 'gastos', 'reportes', 'mensajes', 'ia'],
  GIMNASIO: ['dashboard', 'turnos', 'clientes', 'servicios', 'ventas', 'gastos', 'reportes', 'ia'],
  COMERCIO: ['dashboard', 'ventas', 'productos', 'clientes', 'gastos', 'reportes', 'mensajes', 'ia'],
  ALMACEN: ['dashboard', 'ventas', 'productos', 'clientes', 'servicios', 'gastos', 'reportes', 'mensajes', 'ia'],
};

export const RUBROS = [
  { key: 'BARBERIA', label: 'Barbería', emoji: '💈' },
  { key: 'ESTETICA', label: 'Estética', emoji: '💅' },
  { key: 'GIMNASIO', label: 'Gimnasio', emoji: '💪' },
  { key: 'COMERCIO', label: 'Comercio', emoji: '🏪' },
  { key: 'ALMACEN', label: 'Almacén', emoji: '🛒' },
];

// Rubros que NO trabajan con turnos (venta directa de productos)
export const RUBROS_RETAIL = ['ALMACEN', 'COMERCIO'];

export function esRubroRetail(rubro) {
  return RUBROS_RETAIL.includes(rubro);
}

export function rubroModulos(rubro) {
  return PRESETS_RUBRO[rubro] || PRESETS_RUBRO.BARBERIA;
}

// Devuelve los items de navegación del negocio según rubro + módulos personalizados
export function itemsDelNegocio(negocio) {
  const modulos = parseModulos(negocio?.modulos) || rubroModulos(negocio?.rubro);
  const items = MODULOS.filter((m) => modulos.includes(m.key) || MODULOS_FIJOS.includes(m.key));
  return items;
}

// Módulos que NO se pueden desactivar (fijos en la sidebar)
export const MODULOS_FIJOS = ['dashboard', 'clientes', 'configuracion'];

export function parseModulos(json) {
  if (!json) return null;
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : null;
  } catch {
    return null;
  }
}
