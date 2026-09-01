// Seed de datos de demostración para L&T Manager.
// Crea (o refresca) la cuenta demo@ltmanager.com / demo1234 con un negocio
// "Barbería Demo" lleno de datos realistas para probar la app sin armar nada.
// Es idempotente: si la cuenta ya existe, borra SOLO sus datos y los vuelve a crear.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@ltmanager.com';
const DEMO_PASSWORD = 'demo1234';
const NEGOCIO_NOMBRE = 'Barbería Demo';
const NEGOCIO_RUBRO = 'BARBERIA';
const MODULOS = ['dashboard', 'turnos', 'clientes', 'servicios', 'ventas', 'productos', 'gastos', 'reportes', 'mensajes'];

// Profesionales del negocio demo (entran con su propio usuario)
const EMPLEADOS = [
  { email: 'juan@barberiademo.com', nombre: 'Juan Pérez', color: '#3b82c4', porcentajeComision: 10 },
  { email: 'miguel@barberiademo.com', nombre: 'Miguel Díaz', color: '#2a9d6f', porcentajeComision: 15 },
];

const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

const day = (o) => {
  const d = new Date();
  d.setDate(d.getDate() + o);
  return d;
};

const diaFecha = (offsetDias, hora = 10, min = 0) => {
  const d = day(offsetDias);
  d.setHours(hora, min, 0, 0);
  return d;
};

const toLocalDateString = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const idx = (n, l) => ((n % l) + l) % l;

async function limpiarUsuario(usuario) {
  const ids = usuario.negocios.map((n) => n.id);

  // Orden respetando claves foráneas
  const ventas = await prisma.venta.findMany({ where: { negocioId: { in: ids } }, select: { id: true } });
  await prisma.ventaItem.deleteMany({ where: { ventaId: { in: ventas.map((v) => v.id) } } });
  await prisma.venta.deleteMany({ where: { negocioId: { in: ids } } });

  const compras = await prisma.compra.findMany({ where: { negocioId: { in: ids } }, select: { id: true } });
  await prisma.compraItem.deleteMany({ where: { compraId: { in: compras.map((c) => c.id) } } });
  await prisma.compra.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.proveedor.deleteMany({ where: { negocioId: { in: ids } } });

  const presupuestos = await prisma.presupuesto.findMany({ where: { negocioId: { in: ids } }, select: { id: true } });
  await prisma.presupuestoItem.deleteMany({ where: { presupuestoId: { in: presupuestos.map((p) => p.id) } } });
  await prisma.presupuesto.deleteMany({ where: { negocioId: { in: ids } } });

  const deudas = await prisma.deuda.findMany({ where: { negocioId: { in: ids } }, select: { id: true } });
  await prisma.deudaAbono.deleteMany({ where: { deudaId: { in: deudas.map((d) => d.id) } } });
  await prisma.deuda.deleteMany({ where: { negocioId: { in: ids } } });

  await prisma.giftCard.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.promo.deleteMany({ where: { negocioId: { in: ids } } });

  await prisma.miembro.deleteMany({ where: { negocioId: { in: ids } } });

  await prisma.horario.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.caja.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.gasto.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.listaEspera.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.pago.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.turno.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.bloqueo.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.producto.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.combo.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.servicio.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.cliente.deleteMany({ where: { negocioId: { in: ids } } });
  await prisma.negocio.deleteMany({ where: { id: { in: ids } } });

  // Usuarios de los profesionales demo quedan huérfanos → se eliminan
  for (const e of EMPLEADOS) {
    const u = await prisma.usuario.findUnique({ where: { email: e.email }, include: { negocios: true, miembros: true } });
    if (u && u.negocios.length === 0 && u.miembros.length === 0) {
      await prisma.usuario.delete({ where: { id: u.id } });
    }
  }
}

async function getOrCreateUsuario(email, nombre, password) {
  let u = await prisma.usuario.findUnique({ where: { email } });
  if (!u) u = await prisma.usuario.create({ data: { nombre, email, password } });
  return u;
}

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const passwordEquipo = await bcrypt.hash(DEMO_PASSWORD, 10);

  let usuario = await prisma.usuario.findUnique({
    where: { email: DEMO_EMAIL },
    include: { negocios: true },
  });
  if (usuario) {
    await limpiarUsuario(usuario);
    usuario = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { nombre: 'Demo L&T', plan: 'EMPRESA' },
    });
  } else {
    usuario = await prisma.usuario.create({
      data: { nombre: 'Demo L&T', email: DEMO_EMAIL, password, plan: 'EMPRESA' },
    });
  }

  const negocio = await prisma.negocio.create({
    data: {
      nombre: NEGOCIO_NOMBRE,
      rubro: NEGOCIO_RUBRO,
      modulos: JSON.stringify(MODULOS),
      usuarioId: usuario.id,
    },
  });
  const nid = negocio.id;

  // ── Equipo ────────────────────────────────────────────────
  await prisma.miembro.create({
    data: { rol: 'DUENIO', color: '#c97b2f', usuarioId: usuario.id, negocioId: nid },
  });
  const profesionales = [];
  for (const e of EMPLEADOS) {
    const u = await getOrCreateUsuario(e.email, e.nombre, passwordEquipo);
    profesionales.push(
      await prisma.miembro.create({
        data: {
          rol: 'EMPLEADO',
          color: e.color,
          porcentajeComision: e.porcentajeComision,
          usuarioId: u.id,
          negocioId: nid,
        },
      })
    );
  }

  // ── Servicios ──────────────────────────────────────────────
  const serviciosDef = [
    ['Corte de cabello', 'Corte a tijera o máquina con lavado incluido', 5000, 30],
    ['Corte + barba', 'Corte completo, barba perfilada y toalla caliente', 9000, 45],
    ['Barba / perfilado', 'Perfilado de contorno, gel y loción', 4000, 20],
    ['Degradado', 'Degradado con máquina y terminación a navaja', 6500, 35],
    ['Tinte', 'Aplicación de tinte y matizado', 12000, 75],
    ['Limpieza facial', 'Limpieza profunda con vapor y máscara', 10000, 40],
    ['Corte infantil', 'Corte para chicos hasta 10 años', 4500, 30],
    ['Peinado / planchado', 'Peinado de eventos con fijador', 8000, 50],
  ];
  const servicios = [];
  for (const s of serviciosDef) {
    servicios.push(
      await prisma.servicio.create({
        data: { nombre: s[0], descripcion: s[1], precio: s[2], duracion: s[3], negocioId: nid },
      })
    );
  }

  // ── Productos (con costo para margen) ──────────────────────
  const productosDef = [
    ['Pomada Kárate', 6000, 9, 3, 3800],
    ['Cera objetiva', 5500, 4, 4, 3500],
    ['Shampoo profesional', 4500, 14, 5, 2800],
    ['Aceite de barba', 5000, 0, 6, 3200],
    ['Tónico capilar', 7000, 10, 4, 4500],
  ];
  const productos = [];
  for (const p of productosDef) {
    productos.push(
      await prisma.producto.create({
        data: { nombre: p[0], precio: p[1], stock: p[2], stockMinimo: p[3], costo: p[4], negocioId: nid },
      })
    );
  }

  // ── Combos ─────────────────────────────────────────────────
  await prisma.combo.create({
    data: { nombre: 'Corte + barba', descripcion: 'El clásico de siempre, precio redondo', precio: 8500, negocioId: nid, servicios: { connect: servicios.slice(0, 2).map((s) => ({ id: s.id })) } },
  });
  await prisma.combo.create({
    data: { nombre: 'Pack estudiantes', descripcion: 'Corte + tinte al 2x en el mismo día', precio: 9000, negocioId: nid, servicios: { connect: [servicios[0], servicios[4]].map((s) => ({ id: s.id })) } },
  });

  // ── Clientes ───────────────────────────────────────────────
  const nombresClientes = [
    'Lucas Gómez', 'Matías Fernández', 'Joaquín Pérez', 'Nahuel Rodríguez', 'Brian Sosa',
    'Franco Álvarez', 'Diego Molina', 'Santiago Cabrera', 'Tomás Vargas', 'Agustín Ríos',
    'Nicolás Suárez', 'Ezequiel Medina', 'Maximiliano Castro', 'Lautaro Morales', 'Julián Ortiz',
    'Bruno Acosta', 'Kevin Giménez', 'Thiago Herrera', 'Áxel Núñez', 'Mateo Benítez',
    'Bautista Romero', 'Iván Carrizo', 'Jonathan Quiroga', 'Enzo Ledesma', 'Gonzalo Páez',
  ];
  const telefonos = [
    '1123456789', '1133452211', '1145678901', '1156789012', '1167890123',
    '1178901234', '1189012345', '1190123456', '1111223344', '1122334455',
    '1133445566', '1144556677', '1155667788', '1166778899', '1177889900',
    '1188990011', '1199001122', '1122334455', '1133445566', '1144556677',
    '1155667788', '1166778899', '1177889900', '1188990011', '1199001122',
  ];
  const clientes = [];
  for (let i = 0; i < nombresClientes.length; i++) {
    const conTelefono = i % 3 !== 2;
    const fechaNac = i % 5 === 0 ? diaFecha(-(30 + i * 37), 0, 0) : null;
    clientes.push(
      await prisma.cliente.create({
        data: {
          nombre: nombresClientes[i],
          dni: i % 4 === 0 ? `40${String(10000000 + i * 137).slice(0, 8)}` : null,
          telefono: conTelefono ? telefonos[i] : null,
          email: null,
          fechaNacimiento: fechaNac,
          notas: i % 6 === 0 ? 'Cliente de larga data' : null,
          etiquetas: i % 4 === 0 ? 'Prefiere turnos a la mañana' : null,
          puntos: i % 7 === 0 ? 120 : 0,
          negocioId: nid,
        },
      })
    );
  }

  // ── Turnos, pagos y un bloqueo ──────────────────────────────
  const HORAS = [[9, 0], [11, 0], [13, 0], [16, 0], [18, 0]];
  const turnosCreados = [];
  const pagos = [];
  const bloquearDomingo = true;

  for (let off = -10; off <= 7; off++) {
    const dia = day(off);
    if (bloquearDomingo && dia.getDay() === 0) continue; // domingos cerrado

    const cant = 2 + idx(off + 10, 3); // 2 a 4 turnos por día
    for (let i = 0; i < cant; i++) {
      const [h, m0] = HORAS[idx(i + Math.abs(off), HORAS.length)];
      const m = m0 + (i * 9) % 30;
      const servicio = servicios[idx(i - off + 7, servicios.length)];
      const cliente = clientes[idx(i * 3 - off + 5, clientes.length)];
      const horaTurno = diaFecha(off, h, m);

      let estado;
      if (off < 0) estado = 'COMPLETADO';
      else if (off === 0) estado = i < 2 ? 'COMPLETADO' : 'PENDIENTE';
      else estado = 'PENDIENTE';

      if (off === -2 && i === 0) estado = 'CANCELADO';
      if (off === -1 && i === cant - 1) estado = 'FALTA_PAGAR';

      // La mitad de los turnos tiene profesional asignado (agenda por columna)
      const profesional = i % 2 === 1 ? profesionales[idx(i + off, profesionales.length)] : null;

      const turno = await prisma.turno.create({
        data: {
          clienteId: cliente.id,
          servicioId: servicio.id,
          fecha: horaTurno,
          estado,
          duracionOverride: i === 1 ? 25 : null,
          profesionalId: profesional ? profesional.id : null,
          serieId: null,
          negocioId: nid,
        },
      });
      turnosCreados.push(turno);

      if (estado === 'COMPLETADO') {
        pagos.push({
          turnoId: turno.id,
          negocioId: nid,
          monto: servicio.precio,
          metodo: METODOS[idx(off + i, METODOS.length)],
          propina: i === 0 ? 500 : 0,
          descuento: 0,
          // comisión del profesional (snapshot: % sobre el monto cobrado)
          comision: profesional ? Number(((servicio.precio * profesional.porcentajeComision) / 100).toFixed(2)) : 0,
          profesionalId: profesional ? profesional.id : null,
          fecha: horaTurno,
        });
      }
    }
  }

  for (const p of pagos) {
    await prisma.pago.create({ data: p });
  }

  await prisma.bloqueo.create({ data: { fecha: day(0), diaSemana: 0, motivo: 'Domingo: descanso', negocioId: nid } });

  // ── Esperas ────────────────────────────────────────────────
  await prisma.listaEspera.create({ data: { clienteId: clientes[7].id, servicioId: servicios[3].id, texto: 'Prefiere sábado a la tarde', negocioId: nid } });
  await prisma.listaEspera.create({ data: { clienteId: clientes[8].id, servicioId: servicios[1].id, texto: 'Avísame si se libera algo', negocioId: nid } });
  await prisma.listaEspera.create({ data: { clienteId: clientes[9].id, servicioId: servicios[4].id, texto: 'Consultar precio antes', negocioId: nid } });

  // ── Ventas de productos ────────────────────────────────────
  const ventasDef = [
    { metodo: 'EFECTIVO', fecha: diaFecha(0, 10, 15), items: [{ producto: productos[0], cantidad: 1 }, { producto: productos[1], cantidad: 2 }] },
    { metodo: 'TRANSFERENCIA', fecha: diaFecha(0, 12, 40), items: [{ producto: productos[4], cantidad: 1 }] },
    { metodo: 'EFECTIVO', fecha: diaFecha(-3, 17, 10), items: [{ producto: productos[2], cantidad: 2 }, { producto: productos[3], cantidad: 1 }] },
    { metodo: 'TARJETA', fecha: diaFecha(-7, 11, 30), items: [{ producto: productos[4], cantidad: 1 }] },
  ];
  for (const v of ventasDef) {
    await prisma.venta.create({
      data: {
        metodo: v.metodo,
        negocioId: nid,
        fecha: v.fecha,
        items: { create: v.items.map((it) => ({ productoId: it.producto.id, nombre: it.producto.nombre, cantidad: it.cantidad, precio: it.producto.precio })) },
      },
    });
  }

  // ── Cuenta corriente: una deuda abierta con un abono ───────
  const turnoDebe = turnosCreados.find((t) => t.estado === 'FALTA_PAGAR');
  let deudaDemo = null;
  if (turnoDebe) {
    const totalDeuda = 9000;
    deudaDemo = await prisma.deuda.create({
      data: {
        concepto: 'Corte + barba (fiado)',
        total: totalDeuda,
        saldo: totalDeuda - 3000,
        estado: 'ABIERTA',
        clienteId: turnoDebe.clienteId,
        turnoId: turnoDebe.id,
        negocioId: nid,
      },
    });
    await prisma.deudaAbono.create({
      data: { deudaId: deudaDemo.id, monto: 3000, metodo: 'EFECTIVO', fecha: diaFecha(-1, 18, 30), negocioId: nid },
    });
  }

  // ── Promo, gift card y puntos ──────────────────────────────
  await prisma.promo.create({
    data: { nombre: 'Lunes de corte', tipo: 'DESCUENTO_PCT', valor: 10, activa: true, negocioId: nid },
  });
  await prisma.promo.create({
    data: { nombre: 'Promo estudiantes', tipo: 'DESCUENTO_FIJO', valor: 500, activa: true, negocioId: nid },
  });
  await prisma.giftCard.create({
    data: { codigo: 'LT-FELIZ23', monto: 5000, saldo: 5000, clienteId: clientes[3].id, negocioId: nid },
  });

  // ── Presupuesto ────────────────────────────────────────────
  const nuevo = await prisma.presupuesto.create({
    data: {
      numero: 1,
      estado: 'ENVIADO',
      vigenciaDias: 7,
      notas: 'Sesión completa para evento',
      clienteId: clientes[6].id,
      negocioId: nid,
      items: {
        create: [
          { descripcion: 'Corte + barba', cantidad: 1, precioUnitario: 9000 },
          { descripcion: 'Peinado / planchado', cantidad: 1, precioUnitario: 8000 },
          { descripcion: 'Tónico capilar', cantidad: 2, precioUnitario: 7000 },
        ],
      },
    },
  });
  void nuevo;

  // ── Compra reciente (stock + proveedor) ────────────────────
  const proveedor = await prisma.proveedor.create({
    data: { nombre: 'Distribuidora Norte', telefono: '115566778899', notas: 'Entrega los martes', negocioId: nid },
  });
  const compra = await prisma.compra.create({
    data: {
      proveedorId: proveedor.id,
      fecha: diaFecha(-2, 10, 0),
      monto: productos[2].costo * 6 + productos[4].costo * 3,
      notas: 'Reposición mensual',
      negocioId: nid,
      items: {
        create: [
          { productoId: productos[2].id, nombre: productos[2].nombre, cantidad: 6, costoUnitario: productos[2].costo },
          { productoId: productos[4].id, nombre: productos[4].nombre, cantidad: 3, costoUnitario: productos[4].costo },
        ],
      },
    },
    include: { items: true },
  });
  for (const it of compra.items) {
    if (it.productoId) {
      const prod = productos.find((p) => p.id === it.productoId);
      if (prod) {
        await prisma.producto.update({ where: { id: prod.id }, data: { stock: prod.stock + it.cantidad } });
      }
    }
  }

  // ── Gastos ─────────────────────────────────────────────────
  const gastosDef = [
    [diaFecha(-9, 9, 0), 'Alquiler del local', 130000, 'Alquiler'],
    [diaFecha(-8, 9, 0), 'Luz (servicio mensual)', 32000, 'Servicios'],
    [diaFecha(-6, 9, 0), 'Internet + wifi', 9500, 'Servicios'],
    [diaFecha(-4, 12, 0), 'Insumos: barbicida, guantes, algodón', 18500, 'Insumos'],
    [diaFecha(-2, 12, 0), 'Repuestos de máquina', 12000, 'Insumos'],
    [diaFecha(-1, 10, 0), 'Café y agua para clientes', 7500, 'Varios'],
    [diaFecha(0, 9, 30), 'Delivery merienda del equipo', 8000, 'Varios'],
  ];
  for (const g of gastosDef) {
    await prisma.gasto.create({ data: { fecha: g[0], concepto: g[1], monto: g[2], categoria: g[3], negocioId: nid } });
  }

  // ── Cajas ──────────────────────────────────────────────────
  await prisma.caja.create({ data: { fecha: diaFecha(0, 12, 0), apertura: 5000, conteoReal: null, negocioId: nid } });
  await prisma.caja.create({ data: { fecha: diaFecha(-1, 12, 0), apertura: 7000, conteoReal: 128000, negocioId: nid } });

  // ── Horarios de atención ───────────────────────────────────
  const horariosDef = [
    { diaSemana: 0, abierto: false },
    { diaSemana: 1, abierto: true, apertura: '09:00', cierre: '20:00' },
    { diaSemana: 2, abierto: true, apertura: '09:00', cierre: '20:00' },
    { diaSemana: 3, abierto: true, apertura: '09:00', cierre: '20:00' },
    { diaSemana: 4, abierto: true, apertura: '09:00', cierre: '20:00' },
    { diaSemana: 5, abierto: true, apertura: '09:00', cierre: '20:00' },
    { diaSemana: 6, abierto: true, apertura: '09:00', cierre: '14:00' },
  ];
  for (const h of horariosDef) {
    await prisma.horario.create({ data: { ...h, negocioId: nid } });
  }

  console.log(`✅ Seed listo:`);
  console.log(`   Cuenta: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`   Negocio: ${NEGOCIO_NOMBRE}`);
  console.log(`   Equipo: dueño + ${profesionales.length} profesionales (juan@/miguel@barberiademo.com)`);
  console.log(`   Clientes: ${clientes.length} · Turnos: ${turnosCreados.length} (${pagos.length} cobrados) · Productos: ${productos.length}`);
  console.log(`   Demo extras: deuda con abono, 2 promos, 1 gift card, 1 presupuesto, 1 compra`);
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });