# Resumen del Proyecto: L&T Manager

---

## 💡 1. Visión y Propósito del Proyecto:
* **¿Qué es?:** SaaS por suscripción mensual para ordenar la gestión interna de pequeños negocios (barberías, centros de estética, gimnasios, comercios).
* **Filosofía:** No reemplaza WhatsApp como canal con el cliente, sino que organiza por detrás turnos, clientes, servicios y cobros.
* **Stack y Arquitectura:** tendra Next.js (App Router), SQLite embebida (`negocio.db`), Prisma ORM y Vanilla CSS a medida (sin librerías pesadas, optimizado). 100% ejecutable en local durate las pruebas de desarrollo.

---

## ⚡ 2. Estado Actual del MVP (Desarrollado y Funcional)
- **Dashboard:** Tablero con métricas en tiempo real, próximos turnos y guía de inicio rápido en 3 pasos.
- **Clientes:** Alta, edición, búsqueda instantánea y contador de turnos tomados.
- **Servicios:** Registro de servicios con precios y duraciones personalizadas.
- **Turnos:** Agenda interactiva con navegador por fechas (Ayer/Hoy/Mañana) y gestión de estados (Pendiente, Completado, Cancelado).
- **Cobros:** Registro de pagos (Efectivo, Tarjeta, Transferencia), vinculación a turno y cálculo del total recaudado.

---

## 🎯 3. Funcionalidades Pendientes (Roadmap a Versión Final)
- **Importación Masiva:** Carga rápida de clientes desde archivos CSV/Excel o pegado de contactos de WhatsApp.
- **Ficha del Cliente:** Historial cronológico individual de atenciones, servicios consumidos, monto total gastado y notas.
- **Módulo de Productos:** Control e inventario de productos físicos para venta directa.
- **PWA & Exportación:** Instalación del SaaS en el celular como App sin tienda (`manifest.json`) y exportación contable a PDF/Excel.

---

## 🔑 4. Autenticación, Onboarding y Modularidad SaaS
- **Login & Verificación:** Autenticación por Email con detección automática del plan activo.
- **Wizard por Rubro:** Al crear cuenta, el usuario ingresa nombre de negocio y rubro (Barbería, Estética, Gimnasio, Comercio), habilitando un preset inicial de funciones.
- **Sidebar Modular:** Ajustes de sesión donde el usuario activa o desmarca qué secciones quiere visibles en su barra lateral.

---

## 💎 5. Estructura Comercial: 3 Planes de Suscripción

1. **🟢 Plan Inicial (Starter):** 1 solo negocio • Hasta 50 turnos/mes • Hasta 100 clientes • 1 usuario • Menú estándar por rubro • Sin exportación.
2. **🔵 Plan Pyme (Profesional):** Hasta 3 negocios/sucursales • Hasta 500 turnos/mes por negocio • Clientes ilimitados • Sidebar 100% personalizable • Hasta 3 empleados/negocio • Links rápidos de WhatsApp (`wa.me`) • Exportación PDF/Excel.
3. **🟣 Plan Empresa (Growth):** Hasta 100 negocios/sucursales • Turnos, clientes y empleados ilimitados • Recordatorios automáticos por API de WhatsApp • Analítica avanzada con gráficos de ventas y exportación contable completa.
