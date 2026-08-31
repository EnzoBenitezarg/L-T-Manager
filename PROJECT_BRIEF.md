# L&T Manager — Brief del Proyecto

## 1. Resumen de la idea

**L&T Manager** es un SaaS de gestión para negocios chicos (barberías, centros de estética,
gimnasios, y rubros similares) que hoy manejan todo de forma desordenada: clientes, turnos,
pagos e historial repartidos entre papel, agendas físicas y WhatsApp.

La propuesta **no reemplaza WhatsApp** como canal de contacto con el cliente final — sigue
siendo el canal principal — sino que **ordena por detrás** toda la información del negocio
(clientes, turnos, servicios, pagos, historial), para que el dueño no tenga que aprender un
sistema nuevo desde cero ni cambiar su forma de trabajar de un día para el otro.

Es una plataforma por **suscripción mensual**: no se vende una sola vez, genera ingresos
recurrentes y puede crecer con el tiempo.

## 2. Problema que resuelve

- Los negocios chicos no tienen un sistema unificado: turnos en un cuaderno, clientes en la
  cabeza del dueño, cobros sin registro, sin historial de servicios.
- Las herramientas de gestión que existen suelen ser genéricas, caras, o muy complejas para
  alguien que nunca usó un sistema de gestión.
- El dueño no tiene tiempo ni ganas de "aprender un software nuevo" — necesita algo que se
  adapte a como ya trabaja (mucho por WhatsApp) y no al revés.

## 3. Funcionalidades del MVP (fase inicial, sin sobrecargar)

El MVP debe ser **mínimo pero funcional**, priorizando facilidad de uso sobre cantidad de
funciones:

- Gestión de **clientes** (alta, datos básicos, importación fácil desde una lista existente)
- Gestión de **turnos** (agenda, disponibilidad, alta/baja/modificación)
- Gestión de **servicios/productos** ofrecidos por el negocio
- **Cobros básicos** y registro de pagos
- **Historial** por cliente (turnos y servicios anteriores)
- **Onboarding rápido**: el dueño tiene que poder empezar a usarlo en minutos, sin capacitación
- Un **plan gratis o muy barato** para que el negocio lo pruebe sin riesgo antes de pagar

### Fuera del MVP inicial (fases posteriores)

Estas funciones se suman **después** de validar que el negocio ya usa el sistema sin fricción:

- Recordatorios automáticos de turnos
- Reportes y estadísticas de ventas/ingresos
- Integración más fuerte con WhatsApp (consultas, reservas y recordatorios desde ahí, sin que
  el dueño tenga que estar todo el tiempo dentro del sistema)

## 4. Requisitos técnicos y restricciones (no negociables)

- **Debe poder correrse en local, sin depender de servidores externos**, para poder desarrollarlo
  y probarlo tranquilamente durante el TP sin costos de hosting.
- Debe ser **fácil de usar tanto en celular como en computadora** (mobile-first, pero funcional
  en desktop también).
- **Diseño/CSS propio y cuidado, no genérico** — nada de plantillas visuales por defecto ni
  aspecto de "template gratis". Interfaz simple, amigable, con identidad visual propia.
- Arquitectura pensada para eventualmente poder desplegarse como SaaS real (multi-negocio),
  aunque en esta etapa el foco esté en que funcione perfecto en local.
- Priorizar tecnologías con las que un equipo de estudiantes con conocimientos de programación
  web pueda trabajar sin fricción, que sean fáciles de mantener y extender.

## 5. Estrategia de validación y crecimiento (por fases)

1. **Validación**: hablar con negocios reales de la zona (barberías, estética) antes de construir
   de más, para confirmar que el problema y la solución tienen sentido para ellos.
2. **Lanzamiento del MVP**: clientes, turnos y cobros básicos, con onboarding rápido, importación
   fácil de clientes existentes, y plan gratis o muy barato para reducir el riesgo de probarlo.
3. **Consolidación**: una vez que el negocio usa el sistema sin problemas, se suman recordatorios
   automáticos, reportes e integración más fuerte con WhatsApp.
4. **Crecimiento**: primero dominar un rubro (barberías y estética) en una zona conocida, después
   replicar a otros rubros parecidos (por ejemplo gimnasios) antes de expandir a otras zonas.

## 6. Modelo de negocio

- Suscripción mensual (no venta única), lo que permite ingresos recurrentes y crecimiento
  sostenido a medida que se suman negocios.
- Plan gratuito o muy económico como puerta de entrada, para bajar la barrera de adopción.

## 7. Equipo y roles

Equipo de 4 personas (proyecto también usado como Trabajo Práctico Integrador de
"Creación y Gestión de un Emprendimiento Informático"):

- **Organización y parte comercial**
- **Backend y base de datos**
- **Frontend y diseño**
- **Marketing, ventas y administración**

## 8. Qué se espera de la IA agéntica que lea este documento

1. Proponer un **stack tecnológico concreto** que cumpla los requisitos de la sección 4
   (local-first, multiplataforma, sin dependencias de servidores externos para desarrollo/testing).
2. Armar un **plan de desarrollo por etapas**, alineado a las fases de la sección 5, empezando
   por el MVP de la sección 3.
3. Definir la **estructura del proyecto** (carpetas, módulos, base de datos) de forma clara para
   que el equipo (con roles divididos como en la sección 7) pueda trabajar en paralelo.
4. Diseñar una interfaz **simple, prolija y con identidad visual propia** (no genérica), pensada
   mobile-first pero utilizable en desktop.
5. Dejar el MVP en un estado **completamente funcional y probable en local**, listo para mostrar
   a negocios reales durante la fase de validación.

debe de tener una base de datos embebida, tipo SQLite:

Es un solo archivo (negocio.db) que vive adentro de la carpeta del proyecto.
No corre como servicio ni hay que "abrirla" — la aplicación la lee y escribe directamente, sin instalar ni levantar nada aparte.
Cualquier framework backend moderno la soporta out-of-the-box (Node, Python, PHP, etc.) (no usar python)
Es más que suficiente para el volumen de datos de un negocio chico (clientes, turnos, pagos de una barbería no son "big data").
El día de mañana, si el SaaS crece y lo despliegan en un servidor real con muchos negocios en simultáneo, se puede migrar a algo como PostgreSQL sin rehacer todo — casi todos los ORMs permiten ese cambio con mínimo esfuerzo si se programó bien desde el principio.