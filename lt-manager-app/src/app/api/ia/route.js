import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getNegocioActivo } from '@/lib/auth';

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const MODELO_TIMEOUT_MS = 45000;

async function obtenerContextoDelNegocio(negocioId) {
  const [
    clientes,
    servicios,
    productos,
    turnosHoy,
    pagosMes,
    gastosMes,
    deudores,
    stockBajo,
    turnosSemana,
    ventas,
    ventasMes,
  ] = await Promise.all([
    prisma.cliente.findMany({
      where: { negocioId },
      select: { id: true, nombre: true, telefono: true, email: true },
      orderBy: { creadoEn: 'desc' },
      take: 100,
    }),
    prisma.servicio.findMany({
      where: { negocioId },
      select: { nombre: true, precio: true, duracion: true },
    }),
    prisma.producto.findMany({
      where: { negocioId },
      select: { nombre: true, precio: true, stock: true, stockMinimo: true },
    }),
    prisma.turno.count({
      where: { negocioId, fecha: { gte: inicioDelDia(), lte: finDelDia() } },
    }),
    prisma.pago.aggregate({
      where: { negocioId, fecha: { gte: inicioDelMes() } },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.gasto.aggregate({
      where: { negocioId, fecha: { gte: inicioDelMes() } },
      _sum: { monto: true },
    }),
    prisma.turno.findMany({
      where: { negocioId, estado: 'FALTA_PAGAR' },
      select: { id: true, cliente: { select: { nombre: true } } },
    }),
    prisma.producto.findMany({
      where: { negocioId, stockMinimo: { gt: 0 } },
      select: { stock: true, stockMinimo: true },
    }),
    prisma.turno.count({
      where: { negocioId, fecha: { gte: inicioDeSemana() } },
    }),
    prisma.venta.findMany({
      where: { negocioId },
      include: { items: true },
    }),
    prisma.venta.findMany({
      where: { negocioId, fecha: { gte: inicioDelMes() } },
      include: { items: true },
    }),
  ]);

  const deudoresCount = deudores.length;
  const stockBajoCount = stockBajo.filter((p) => p.stock <= p.stockMinimo).length;

  // Ventas de productos: totales y por producto
  const totalVentasMes = ventasMes.reduce((acc, v) => acc + v.items.reduce((a, i) => a + i.cantidad * Number(i.precio), 0), 0);
  const ventasPorProducto = {};
  ventas.forEach((v) => {
    v.items.forEach((i) => {
      ventasPorProducto[i.nombre] = (ventasPorProducto[i.nombre] || 0) + i.cantidad * Number(i.precio);
    });
  });
  const vendidos = new Set(Object.keys(ventasPorProducto));
  const productosNoVendidos = productos.filter((p) => !vendidos.has(p.nombre)).map((p) => p.nombre);
  const resumenVentasProducto = Object.entries(ventasPorProducto)
    .map(([n, monto]) => `${n}: $${monto}`)
    .join(', ');

  // Lo que cada cliente gastó en turnos (cobros) y cuántos turnos tiene
  const pagosCliente = await prisma.pago.findMany({
    where: { negocioId },
    select: { monto: true, turno: { select: { clienteId: true } } },
  });
  const turnosCliente = await prisma.turno.groupBy({
    by: ['clienteId'],
    where: { negocioId },
    _count: { id: true },
  });
  const montoPorCliente = {};
  pagosCliente.forEach((p) => {
    if (p.turno?.clienteId) montoPorCliente[p.turno.clienteId] = (montoPorCliente[p.turno.clienteId] || 0) + Number(p.monto);
  });
  const turnosPorClienteMap = {};
  turnosCliente.forEach((t) => {
    if (t.clienteId) turnosPorClienteMap[t.clienteId] = t._count.id;
  });

  const resumenClientes = clientes
    .slice(0, 40)
    .map((c) => `${c.nombre}${c.telefono ? ' (tel: ' + c.telefono + ')' : ''} — ${turnosPorClienteMap[c.id] || 0} turnos, gastó $${montoPorCliente[c.id] || 0}`)
    .join(' | ');

  return `Resumen del negocio:
- ${clientes.length} clientes registrados: ${resumenClientes || 'Ninguno'}
- Servicios: ${servicios.map((s) => `${s.nombre} ($${s.precio}, ${s.duracion} min)`).join(', ') || 'Ninguno'}
- Productos: ${productos.map((p) => `${p.nombre} (stock: ${p.stock}, $${p.precio})`).join(', ') || 'Ninguno'}
- Turnos hoy: ${turnosHoy}
- Turnos esta semana: ${turnosSemana}
- Ingresos por cobros de turnos del mes: $${pagosMes._sum.monto || 0} (${pagosMes._count} cobros)
- Ingresos por venta de productos del mes: $${totalVentasMes}
- Gastos del mes: $${gastosMes._sum.monto || 0}
- Deudores (falta pagar): ${deudoresCount}${deudores.length ? ` (${deudores.map((d) => d.cliente?.nombre).filter(Boolean).join(', ')})` : ''}
- Productos con stock bajo: ${stockBajoCount}
- Ventas de productos por artículo (históricas): ${resumenVentasProducto || 'Ninguna'}
- Productos que aún no se vendieron: ${productosNoVendidos.join(', ') || 'Ninguno'}`;
}

function inicioDelDia() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function finDelDia() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function inicioDelMes() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inicioDeSemana() {
  const d = new Date();
  const dia = d.getDay() === 0 ? 7 : d.getDay();
  d.setDate(d.getDate() - (dia - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function jsonError(mensaje, tipo, status) {
  return NextResponse.json({ error: mensaje, tipo, status }, { status });
}

export async function POST(request) {
  const negocio = await getNegocioActivo();
  if (!negocio) {
    return jsonError(
      'No hay un negocio activo seleccionado. Elegí un negocio desde "Mis negocios" para poder usar el asistente.',
      'NO_NEGOCIO',
      401
    );
  }

  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID) {
    return jsonError(
      'El asistente no está configurado. Faltan las credenciales de Cloudflare (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID) en el archivo .env.',
      'SIN_CONFIGURAR',
      500
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError('La solicitud enviada no es válida. Volvé a intentar.', 'REQ_INVALIDA', 400);
  }

  const mensaje = body?.mensaje?.trim();
  if (!mensaje) {
    return jsonError('Escribí una pregunta antes de enviar.', 'SIN_MENSAJE', 400);
  }

  // Historial de conversacion (ultimos N mensajes para contexto)
  const historial = Array.isArray(body?.historial) ? body.historial.slice(-6) : [];

  let contexto;
  try {
    contexto = await obtenerContextoDelNegocio(negocio.id);
  } catch (error) {
    console.error('Error al obtener contexto:', error);
    return jsonError(
      'No se pudieron leer los datos de tu negocio. Probá de nuevo en unos instantes.',
      'ERROR_CONTEXTO',
      500
    );
  }

  const guiaApp = `GUÍA DE LA PLATAFORMA (para ayudar al usuario a usar la web):
SECCIONES Y CÓMO SE USA CADA UNA:
- Dashboard (/): vista general. Muestra estadísticas (ingresos, turnos, cobros), un gráfico, el top de clientes, los turnos del día, los deudores y el stock bajo de un vistazo.
- Turnos (/turnos): para agendar y administrar turnos. El selector arriba cambia entre vista de DÍA, SEMANA y MES (calendario). El botón "+ Nuevo turno" agenda un nuevo turno (cliente, servicio, día y hora y profesional). Desde acá también se pueden mover turnos entre horas o días.
- Clientes (/clientes): alta, edición y lista de clientes (nombre, teléfono, email, notas, etiquetas). Desde acá se ve la ficha de cada cliente.
- Servicios (/servicios): para crear los servicios que ofrece el negocio, con su precio y duración en minutos. Son la base para los turnos.
- Productos (/productos): alta de productos con precio, costo y stock (y un stock mínimo de alerta). Se usan en las ventas.
- Cobros (/cobros): registro y seguimiento de cobros de turnos y deudas ("Debe plata"). Acá se marcan clientes morosos y se registran abonos.
- Ventas (/ventas): concentra el cobro de turnos y la venta de productos. Dentro hay "Cobro express" (cobra un turno pendiente con un click, eligiendo método de pago) y "Venta express de productos" (elegís producto y cantidad, se cobra solo y descuenta stock). También hay una pestaña "Historial" con todos los ingresos.
- Gastos (/gastos): registro de los gastos del negocio (concepto, monto, categoría, fecha).
- Reportes (/reportes): métricas y resúmenes (ingresos, gastos, márgenes, top de servicios y productos).
- Mensajes (/mensajes): enviar mensajes a los clientes (recordatorios, promociones).
- Configuración (/configuracion): datos del negocio (nombre y rubro), horarios de atención (que validan los turnos nuevos), el equipo de profesionales (cada uno con su usuario, color y % de comisión), qué secciones se muestran en la barra lateral, y la exportación de datos a CSV (respaldo o para Excel).
- Asistente IA (/ia): acá estamos. Chat donde el usuario te consulta los datos y el funcionamiento de la app.

CONSEJOS SOBRE CÓMO HACER ACCIONES EN LA WEB (si el usuario te pregunta cómo hacer algo, guiálo con estos pasos):
- Para cambiar el rubro, el horario, sumar profesionales o activar/desactivar secciones → Configuración.
- Para agregar un cliente → sección Clientes, botón de nuevo cliente.
- Para cobrar un turno rápido → Ventas, bloque "Cobro express", botón "Cobrar".
- Para registrar una venta de productos sin vueltas → Ventas, "Venta express de productos".
- Para exportar datos (respaldo/Excel) → Configuración, pestaña "Datos".
- Si no ve una sección en la barra lateral, puede estar desactivada → Configuración, "Secciones".`;

  const sistema = `Sos ${negocio.nombre}, el asistente de IA oficial de la plataforma, y estás hablando con el dueño/encargado del negocio (tipo ${negocio.rubro}). Tenés una personalidad cálida, cercana y resolutiva: hablás en español neutro, claro y profesional, sin regionalismos ni modismos argentinos (nada de "che", "viste", "vos tenés", "mirá", etc.). Sos práctico, directo y conciso, pero también podés ser amable y empático cuando corresponde. Usás "tú" para dirigirte al usuario.

TUS SUPERCONTENIDOS (lo que sabés):
1) LOS DATOS REALES DEL NEGOCIO (contexto de abajo): clientes con sus nombres, cuánto gastó cada uno, servicios y precios, productos y stock, turnos de hoy y de la semana, ingresos del mes (cobros de turnos + venta de productos), gastos, deudores, y qué productos se vendieron o no.
2) CÓMO FUNCIONA LA PÁGINA WEB POR COMPLETO (guía de abajo): si el usuario no sabe hacer algo en la app, le explicás paso a paso cómo hacerlo en la sección correcta.
3) CAPACIDAD DE MENSAJES WHATSAPP: si el usuario te pide que redactes un mensaje, generás un borrador listo para copiar y pegar en WhatsApp.

DATOS REALES DEL NEGOCIO:
${contexto}

${guiaApp}

CAPACIDAD DE MENSAJES WHATSAPP:
Si el usuario te pide que redactes un mensaje (palabras clave: "redactame", "escribe", "mensaje para", "armame un mensaje", "manda un mensaje", "recordatorio", "promo para"), generá un borrador listo para copiar y pegar en WhatsApp.

REGLAS PARA MENSAJES WHATSAPP:
- Usá los datos reales del negocio (nombre del cliente, servicios, precios, etc.)
- Formato: texto plano sin markdown (WhatsApp no soporta markdown)
- Tono cálido y personal (cercano, natural, sin regionalismos)
- Incluí el nombre del cliente si lo tenés en el contexto
- Longitud ideal: 2-4 oraciones (ni muy corto ni muy largo)
- Si es recordatorio: mencioná día y hora del turno si los tenés
- Si es promo: mencioná el servicio y un beneficio concreto
- Si es reactivación: mencioná que se extraña al cliente
- Si es deudor: mencioná el monto adeudado y ofrecé facilidades de pago
- Si es cumpleaños: mencioná el nombre y un detalle/guion
- Nunca inventes datos que no estén en el contexto
- Si el usuario no especifica tipo, preguntale para qué ocasión es
- Cuando generes un mensaje de WhatsApp, envolvélo así:
  [MENSAJE WHATSAPP]
  (acá el mensaje listo para copiar)
  [/MENSAJE WHATSAPP]
  Y después podés agregar un breve comentario sobre el mensaje.

CONTEXTO ECONÓMICO ARGENTINO (Agosto 2026):
- Inflación acumulada del año: ~35-40%
- Inflación mensual: ~3-4%
- Tipo de cambio oficial: ~1400-1500 ARS/USD
- Salario mínimo: ~650.000 ARS
- Poder adquisitivo en contracción: los consumidores son sensibles a los precios
- Tendencia: los negocios de servicios están subiendo precios gradualmente
- Regla general: si un servicio no se ajustó en los últimos 3 meses, está "atrasado"
- Promedio de precio de corte en barbería: $8.000-15.000 ARS
- Promedio de combo corte+barba: $12.000-22.000 ARS
- Promedio de coloración en estética: $15.000-30.000 ARS
- Productos de consumo (pomada, aceite): $3.000-8.000 ARS

ANÁLISIS DE PRECIOS Y SERVICIOS:
Si el usuario pregunta sobre precios, subir precios, márgenes, o rentabilidad:
1. Analizá los precios actuales vs el contexto económico argentino
2. Compará servicios por margen y demanda
3. Identificá servicios "atrasados" (no ajustados en 3+ meses)
4. Sugerí ajustes concretos con montos en pesos
5. Analizá qué servicios generan más ingreso por hora (precio / duración)
6. Identificá combos o servicios que podrían crearse basado en la demanda
7. Nunca sugieras bajar precios (en Argentina los precios solo suben)
8. Considerá el poder adquisitivo local: no sugieras precios que alejen clientes
9. Si el usuario tiene productos con margen bajo, explicale por qué conviene subir el precio

REGLAS DE RESPUESTA:
- Respondé SIEMPRE en español neutro, con personalidad propia pero profesional (nada de regionalismos). Usá "tú" ("¿querés...?", "te conviene...").
- USO OBLIGATORIO DE MARKDOWN: Cada respuesta DEBE tener al menos 1 negrita **...** resaltando lo más importante (un monto clave, una conclusión, un dato relevante). Si la respuesta tiene varios puntos importantes, usá más negritas. Aprovechá todo el markdown: **negritas** para datos/claves, listas con "- " cuando hay varios items, encabezados "## " para secciones, tablas si hay comparaciones.
- Si te preguntan por los datos del negocio, usá SOLO los datos reales del contexto. No inventes cifras, nombres ni montos que no figuren.
- Si te preguntan cómo hacer algo en la web (agendar un turno, cobrar, exportar, cambiar el rubro, etc.), guiá al usuario paso a paso usando la guía de la plataforma.
- Si no tenés el dato o la respuesta, decilo con honestidad y ofrecé cómo averiguarlo.
- Sé conciso cuando la pregunta lo amerite, pero desarrollá cuando pidas un análisis.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODELO_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: sistema },
            ...historial.map((m) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content,
            })),
            { role: 'user', content: mensaje },
          ],
          max_tokens: 1200,
          temperature: 0.7,
          stream: false,
        }),
        signal: controller.signal,
      }
    );
  } catch (error) {
    clearTimeout(timeout);
    if (error?.name === 'AbortError') {
      return jsonError(
        'El asistente tardó demasiado en responder. Probá con una pregunta más corta o volvé a intentar.',
        'TIMEOUT',
        504
      );
    }
    console.error('Error de red con Cloudflare:', error);
    return jsonError(
      'No se pudo conectar con el servicio de IA. Comprobá tu conexión a internet e intentá de nuevo.',
      'SIN_RED',
      503
    );
  }

  clearTimeout(timeout);

  if (!res.ok) {
    let detalle = null;
    try {
      const errData = await res.json();
      detalle = errData?.errors?.[0]?.message || null;
    } catch {
      detalle = null;
    }
    const log = `Cloudflare AI HTTP ${res.status}: ${detalle || res.statusText}`;
    console.error(log);

    // Mapear errores HTTP comunes de Cloudflare a mensajes claros
    if (res.status === 401 || res.status === 403) {
      return jsonError(
        'Las credenciales de Cloudflare son inválidas o no tienen permisos para usar la IA. Revisá el token y el Account ID en el archivo .env.',
        'CREDENCIALES_INVALIDAS',
        502
      );
    }
    if (res.status === 429) {
      return jsonError(
        'Se alcanzó el límite de solicitudes gratuitas por hoy. Volvé a intentar más tarde.',
        'LÍMITE',
        429
      );
    }
    if (res.status >= 400 && res.status < 500) {
      return jsonError(
        'El asistente no pudo procesar tu pregunta (error de la IA). Probá reformularla.',
        'ERROR_MODELO',
        502
      );
    }
    return jsonError(
      'El servicio de IA está teniendo problemas. Intentá de nuevo en unos minutos.',
      'ERROR_SERVICIO',
      502
    );
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return jsonError('La respuesta del asistente llegó corrupta. Volvé a intentar.', 'RESPUESTA_CORRUPTA', 502);
  }

  if (!data?.success) {
    const msg = data?.errors?.[0]?.message || 'Error desconocido de la IA';
    console.error('Cloudflare AI success=false:', JSON.stringify(data?.errors));
    if (msg && /limit|quota|rate/i.test(msg)) {
      return jsonError(
        'Se alcanzó el límite de solicitudes gratuitas. Probá de nuevo más tarde.',
        'LÍMITE',
        429
      );
    }
    return jsonError('La IA respondió con un error inesperado. Volvé a intentar.', 'ERROR_MODELO', 502);
  }

  const respuesta = data?.result?.response || data?.result?.text || '';
  if (!respuesta?.trim()) {
    return jsonError('El asistente no generó una respuesta. Probá preguntar de otra forma.', 'SIN_RESPUESTA', 502);
  }

  return NextResponse.json({ respuesta });
}
