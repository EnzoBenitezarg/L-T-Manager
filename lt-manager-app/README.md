# L&T Manager

SaaS de gestión para negocios chicos (barberías, estética, gimnasios y comercios). Ordena clientes, turnos, cobros, gastos, productos y caja **sin** reemplazar WhatsApp como canal de contacto: el dueño sigue trabajando como siempre, y la plataforma ordena todo por detrás.

## Stack

- **Next.js 16** (App Router) — frontend y API routes
- **Prisma ORM + SQLite** — base de datos embebida en `prisma/negocio.db`
- **Vanilla CSS** con design tokens propios, mobile-first
- Ejecutable 100% en local para desarrollo y pruebas

## Requisitos

- Node.js 20 o superior
- npm

## Puesta en marcha

```bash
npm install
npm run db:generate   # genera el cliente Prisma
npm run db:push       # crea/actualiza la base de datos (prisma/negocio.db)
npm run dev           # arranca en http://localhost:3000
```

### Variables de entorno

Crea un archivo `.env.local` en la raíz si querés fijar el secreto de sesión:

```
SESSION_SECRET=una-cadena-larga-y-aleatoria
```

> En **producción** `SESSION_SECRET` es obligatorio. Si no está definido, la app falla al firmar sesiones (a propósito). En desarrollo local se usa un valor por defecto para que puedas correr sin configurar nada.

## Scripts

| Comando              | Descripción                                    |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Servidor de desarrollo                         |
| `npm run build`      | Build de producción                            |
| `npm run start`      | Servidor de producción                         |
| `npm run lint`       | ESLint                                         |
| `npm run db:push`    | Sincroniza el schema con la base de datos      |
| `npm run db:generate`| Genera el cliente Prisma                       |

## Módulos

- **Dashboard** — métricas, próximos turnos, alertas (deudores, stock bajo) y guía de inicio
- **Turnos** — agenda por día/semana, bloqueos, lista de espera y recordatorios por WhatsApp
- **Clientes** — alta rápida, ficha con historial, etiquetas, importación pegando texto de WhatsApp
- **Servicios** — precios y duraciones (o días para planes de gimnasio)
- **Ventas / Cobros** — cobro express, deudores, venta de productos con descuento de stock
- **Productos** — inventario con stock mínimo y alertas
- **Gastos y Caja** — egresos, apertura y conteo real del día
- **Mensajes** — difusión por WhatsApp con enlaces `wa.me`
- **Configuración** — datos del negocio, rubro y sidebar personalizable

## Multi-negocio

Cada cuenta (usuario) puede tener varios negocios según su plan. Cada negocio tiene su propio rubro, módulos y sidebar, con aislamiento total de datos (`negocioId` como tenant en todas las consultas).

## Rutas con Auth (archivo README extendido)

Para más detalle sobre la arquitectura de API, auth y multi-tenant, ver `RESUMEN.md` en la raíz del repositorio.
