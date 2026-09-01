// Permisos por rol dentro de un negocio (multi-tenant local).
//
// roles: DUENIO  -> dueño de la cuenta (acceso total)
//        ADMIN   -> puede administrar configuración, equipo y reportes
//        EMPLEADO-> opera el día a día (agenda, clientes, cobros, ventas)
export const ROLES = {
  DUENIO: 'DUENIO',
  ADMIN: 'ADMIN',
  EMPLEADO: 'EMPLEADO',
};

export const ROL_ETIQUETA = {
  DUENIO: 'Dueño',
  ADMIN: 'Encargado',
  EMPLEADO: 'Empleado',
};

// Módulos que un EMPLEADO NO ve (finanzas / administración del negocio)
export const MODULOS_PRIVADOS = ['configuracion', 'gastos', 'reportes', 'compras', 'fidelizacion'];

export function esAdmin(miembro) {
  return !!miembro && [ROLES.DUENIO, ROLES.ADMIN].includes(miembro.rol);
}

// ¿Un usuario es administrador de este negocio?
// Cierto si es el dueño de la cuenta (usuarioId) o un miembro con rol admin/dueño.
export function esAdminDeNegocio(usuario, negocio, miembro) {
  if (usuario && negocio && negocio.usuarioId === usuario.id) return true;
  return esAdmin(miembro);
}

// ¿El miembro puede acceder a ese módulo de la sidebar?
export function puedeModulo(miembro, key) {
  if (!miembro) return true; // dueño sin registro de miembro = acceso total
  if (esAdmin(miembro)) return true;
  return !MODULOS_PRIVADOS.includes(key);
}

// Filtra los items del negocio según el rol del miembro activo
export function itemsDelNegocioFiltrados(items, miembro) {
  if (!miembro || esAdmin(miembro)) return items;
  return items.filter((i) => !MODULOS_PRIVADOS.includes(i.key));
}