<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:111827,100:3b82f6&height=180&section=header&text=L%26T%20Manager&fontSize=48&fontColor=ffffff&fontAlignY=38&desc=SaaS%20de%20gesti%C3%B3n%20para%20peque%C3%B1os%20negocios&descAlignY=60&descSize=18" width="100%"/>

### Gestión simple para negocios que quieren trabajar mejor.

[![Status](https://img.shields.io/badge/status-MVP%20funcional-22c55e?style=flat-square)](.)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![SQLite](https://img.shields.io/badge/SQLite-database-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![CSS](https://img.shields.io/badge/Vanilla%20CSS-custom-1572B6?style=flat-square&logo=css3)](https://developer.mozilla.org/en-US/docs/Web/CSS)

</div>

---

## Qué es

**L&T Manager** es un SaaS pensado para pequeños negocios como **barberías, centros de estética, gimnasios y comercios**.

Centraliza la gestión interna de:

`clientes` · `servicios` · `turnos` · `cobros`

Sin intentar reemplazar WhatsApp. **WhatsApp sigue siendo el canal con el cliente; L&T Manager organiza todo lo que ocurre detrás.**

---

## Preview

> Capturas del MVP

<div align="center">

<img src="./docs/dashboard.png" alt="L&T Manager Dashboard" width="85%">

</div>

---

## Funcionalidades

| Módulo | Estado |
| --- | :---: |
| Dashboard con métricas | `Listo` |
| Gestión de clientes | `Listo` |
| Gestión de servicios | `Listo` |
| Agenda de turnos | `Listo` |
| Estados de turnos | `Listo` |
| Registro de cobros | `Listo` |
| Importación masiva | `Próximo` |
| Ficha completa del cliente | `Próximo` |
| Gestión de productos | `Próximo` |
| PWA | `Próximo` |
| Exportación PDF / Excel | `Próximo` |

---

## Stack

<div align="center">

[![Next.js](https://skillicons.dev/icons?i=nextjs)](https://nextjs.org/)
[![TypeScript](https://skillicons.dev/icons?i=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://skillicons.dev/icons?i=prisma)](https://www.prisma.io/)
[![SQLite](https://skillicons.dev/icons?i=sqlite)](https://www.sqlite.org/)
[![CSS](https://skillicons.dev/icons?i=css)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![Git](https://skillicons.dev/icons?i=git)](https://git-scm.com/)

</div>

**Frontend / Backend:** Next.js + App Router  
**Base de datos:** SQLite  
**ORM:** Prisma  
**Estilos:** Vanilla CSS  
**Desarrollo:** 100% ejecutable en local

---

## Arquitectura

```text
L&T Manager
│
├── Dashboard
├── Clientes
├── Servicios
├── Turnos
├── Cobros
│
├── Autenticación
├── Onboarding
├── Planes SaaS
└── Sidebar modular
        │
        ▼
     Prisma
        │
        ▼
   negocio.db
```

---

## SaaS

La plataforma está pensada desde el inicio para funcionar con distintos tipos de negocios y diferentes niveles de suscripción.

| | Starter | Profesional | Growth |
| --- | :---: | :---: | :---: |
| Negocios | 1 | 3 | 100 |
| Turnos / mes | 50 | 500 / negocio | Ilimitados |
| Clientes | 100 | Ilimitados | Ilimitados |
| Empleados | 1 usuario | 3 / negocio | Ilimitados |
| Sidebar personalizable | — | Sí | Sí |
| WhatsApp rápido | — | Sí | Sí |
| PDF / Excel | — | Sí | Sí |
| Recordatorios WhatsApp | — | — | Sí |
| Analítica avanzada | — | — | Sí |

---

## Roadmap

```text
MVP
 │
 ├── Clientes
 ├── Servicios
 ├── Turnos
 ├── Cobros
 └── Dashboard
       │
       ▼
V1
 │
 ├── Importación masiva
 ├── Ficha del cliente
 ├── Productos
 ├── PWA
 └── Exportaciones
       │
       ▼
Growth
 │
 ├── WhatsApp API
 ├── Recordatorios
 ├── Analítica avanzada
 └── Gestión multi-negocio
```

---

## Desarrollo local

```bash
git clone <repository-url>
cd l-t-manager
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

La aplicación se ejecuta localmente en:

```text
http://localhost:3000
```

---

<div align="center">

**L&T Manager**

Una forma más simple de administrar un negocio.

</div>
