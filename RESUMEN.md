# L&T Manager — Resumen Completo del Proyecto

## 1. Visión y Propósito

L&T Manager es un SaaS de gestión para negocios chicos como barberías, centros de estética, gimnasios y rubros similares. Hoy estos negocios manejan todo de forma desordenada: clientes, turnos, pagos e historial repartidos entre papel, agendas físicas y WhatsApp.

La propuesta no reemplaza WhatsApp como canal de contacto con el cliente final. Sigue siendo el canal principal. Lo que hace L&T Manager es ordenar por detrás toda la información del negocio (clientes, turnos, servicios, pagos, historial), para que el dueño no tenga que aprender un sistema nuevo desde cero ni cambiar su forma de trabajar de un día para el otro.

Es una plataforma por suscripción mensual. No se vende una sola vez, genera ingresos recurrentes y puede crecer con el tiempo.

## 2. Problema que Resuelve

Los negocios chicos no tienen un sistema unificado: turnos en un cuaderno, clientes en la cabeza del dueño, cobros sin registro, sin historial de servicios.

Las herramientas de gestión que existen suelen ser genéricas, caras o muy complejas para alguien que nunca usó un sistema de gestión.

El dueño no tiene tiempo ni ganas de aprender un software nuevo. Necesita algo que se adapte a cómo ya trabaja, mucho por WhatsApp, y no al revés.

## 3. Stack Tecnológico y Arquitectura

- Next.js con App Router para el frontend y backend.
- SQLite embebida en un solo archivo llamado `negocio.db` que vive dentro de la carpeta del proyecto.
- Prisma ORM para la capa de datos.
- Vanilla CSS a medida, sin librerías pesadas, optimizado para mobile-first.
- 100 por ciento ejecutable en local durante las pruebas de desarrollo, sin depender de servidores externos ni costos de hosting.
- Arquitectura pensada para eventualmente desplegarse como SaaS real multi-negocio, aunque en esta etapa el foco está en que funcione perfecto en local.
- Prioriza tecnologías con las que un equipo de estudiantes con conocimientos de programación web pueda trabajar sin fricción, fáciles de mantener y extender.

La base de datos es un solo archivo que la aplicación lee y escribe directamente, sin instalar ni levantar nada aparte. Es más que suficiente para el volumen de datos de un negocio chico. El día de mañana, si el SaaS crece, se puede migrar a PostgreSQL sin rehacer todo porque Prisma permite ese cambio con mínimo esfuerzo si se programó bien desde el principio.

## 4. Estado Actual del MVP (Desarrollado y Funcional)

- Dashboard: Tablero con métricas en tiempo real, próximos turnos y guía de inicio rápido en 3 pasos.
- Clientes: Alta, edición, búsqueda instantánea y contador de turnos tomados.
- Servicios: Registro de servicios con precios y duraciones personalizadas.
- Turnos: Agenda interactiva con navegador por fechas (Ayer, Hoy, Mañana) y gestión de estados (Pendiente, Completado, Cancelado).
- Cobros: Registro de pagos en Efectivo, Tarjeta o Transferencia, vinculación a turno y cálculo del total recaudado.

## 5. Funcionalidades Pendientes para la Versión Final

### Clientes e Importación

- Importación masiva de clientes desde archivos CSV o Excel, o pegado rápido de texto con nombres y teléfonos copiados de WhatsApp. Debe incluir un parser inteligente que limpie prefijos telefónicos como +54 o 9 para normalizar la agenda.
- Ficha completa del cliente: vista o modal individual con timeline cronológico de turnos pasados, servicios consumidos, fechas de atención, monto total acumulado gastado y notas o preferencias personales.
- Etiquetas y notas en clientes: campo para asignar etiquetas de texto libre al cliente, como "Alérgico a tintura", "Prefiere tijera" o "Paga siempre en efectivo". Aparecen destacadas al lado del nombre en la lista y en la ficha.

### Turnos y Agenda

- Bloqueo de horarios: el dueño marca descansos o días no laborables, como "Descanso de 14 a 15" o "No trabajo los domingos". Esos horarios se pintan de gris en la agenda y no permiten agendar turnos.
- Vista semanal de la agenda: además de la vista diaria con Ayer, Hoy y Mañana, una vista tipo grilla de 7 días para planificar la semana completa de un vistazo.
- Duración personalizada por turno: permitir overridear la duración estándar del servicio en un turno particular, para casos donde un corte lleva 20 minutos otras veces y 40 en otras.
- Lista de espera: si no hay horario disponible, el dueño anota al cliente en lista de espera. Cuando se cancela un turno, el sistema sugiere llamar al primero de la lista.

### Servicios y Productos

- Módulo de productos físicos: tabla y registro de productos como cera de peinado, aceites de barba o suplementos. Control de inventario con stock actual y stock mínimo.
- Alerta de stock bajo: cuando el stock de un producto cae por debajo del valor mínimo configurado, aparece una alerta en el dashboard para que el dueño sepa que debe reponer.
- Venta directa de productos: poder agregar productos al momento de cobrar un turno o realizar una venta independiente sin turno asociado.
- Combos o paquetes de servicios: agrupar servicios con precio promocional, por ejemplo Corte más Barba a un valor menor que la suma individual.

### Cobros, Caja y Gastos

- Gastos del negocio: registro de egresos como compra de insumos, alquiler o servicios. Aparecen descontados en el cierre de caja.
- Caja diaria con apertura y cierre: el dueño indica con cuánto dinero arranca el día. Al cerrar, el sistema calcula cuánto debería tener en caja (inicial más cobros menos gastos) y permite comparar con el conteo real.
- Descuentos manuales: al registrar un cobro, permitir ingresar un monto final menor al precio del servicio para casos de "precio amigo".
- Registro de propinas: campo separado para la propina, mostrando cuánto se ganó en servicios y cuánto en propinas por separado.
- Deudores o falta pagar: estado de cobro adicional llamado Falta Pagar. Permite filtrar rápidamente quiénes le deben plata al negocio.

### WhatsApp y Comunicación (Sin API de Pago)

- Generador de mensajes de confirmación: al hacer click en un turno, el sistema genera un mensaje tipo "Hola Juan, te confirmo tu turno para mañana martes 2/9 a las 15:00hs" listo para copiar y pegar en WhatsApp Web.
- Recordatorio del día anterior: botón que genera mensaje de recordatorio para enviar manualmente por WhatsApp.
- Difusión de promociones: selección múltiple de clientes para generar texto listo de promoción, con links `wa.me` para envío manual.
- Botón rápido de recordatorio por WhatsApp: enlaces `wa.me` con mensaje preconfigurado, accesible desde la agenda o la ficha del cliente.

### Autenticación, Onboarding y Modularidad SaaS

- Registro y login por email: autenticación con correo electrónico, usando Magic Link o código de verificación.
- Menú principal después del login: al iniciar sesión, el usuario entra a un menú principal donde puede acceder a su cuenta desde la esquina superior derecha y administrar sus negocios desde una interfaz basada en tarjetas.
- Gestión de múltiples negocios: el menú muestra espacios para los negocios disponibles según el límite permitido por la suscripción. Los espacios utilizados muestran cada negocio y los espacios disponibles muestran un botón `+` para agregar uno nuevo.
- Límite de negocios según suscripción: la cantidad de negocios que el usuario puede crear depende directamente de su plan activo. Por ejemplo, Starter permite 1 negocio, Pyme hasta 3 y Empresa hasta 100.
- Creación de negocio: al tocar el botón `+`, el usuario puede crear un nuevo negocio ingresando sus datos básicos, como nombre, logo, rubro y demás información necesaria.
- Selección de rubro: al crear un negocio, el usuario selecciona el rubro al que pertenece, por ejemplo Barbería, Estética, Gimnasio o Comercio.
- Configuración automática según el rubro: el sistema utiliza el rubro seleccionado para determinar qué funciones, módulos y opciones son más relevantes para ese negocio y configura automáticamente una sidebar inicial acorde.
- Sidebar dinámica por negocio: cada negocio puede tener una barra lateral diferente según sus necesidades. Las opciones visibles se generan a partir del rubro seleccionado y de la configuración personalizada del negocio.
- Personalización de la sidebar: desde la configuración del negocio, el usuario puede marcar o desmarcar las funciones que quiere mostrar en la sidebar. Esto permite ocultar módulos que no utiliza y activar otros disponibles, haciendo que cada negocio tenga una interfaz adaptada a su forma de trabajar.
- Configuración independiente por negocio: cuando un usuario tiene varios negocios, cada uno puede tener su propia configuración, rubro, módulos habilitados y sidebar personalizada sin afectar a los demás negocios.
- Cambio de negocio: el usuario puede seleccionar desde el menú principal qué negocio quiere administrar y entrar a su panel correspondiente.
- Control de plan de pago: identificación en tiempo real del plan activo del usuario (Plan Inicial, Pyme o Empresa) mediante el estado de su cuenta.
- Aislamiento de datos con `tenantId`: multi-tenancy estricto donde cada usuario autenticado accede de forma aislada a los datos de sus propios negocios.
- Wizard de onboarding inicial: al crear cuenta, flujo guiado de tres pasos. Paso 1, creación del primer negocio con nombre y logo. Paso 2, selección del rubro. Paso 3, preset automático de funciones según el rubro elegido.
- Sidebar modular: en ajustes, el usuario activa o desmarca qué secciones quiere visibles en su barra lateral. Esto permite adaptar la plataforma a la forma de trabajo de cada cliente sin sobrecargar la interfaz.

### Flujo General de Uso

1. El usuario crea una cuenta e inicia sesión.
2. Entra al menú principal y ve su cuenta arriba a la derecha.
3. Visualiza sus negocios en tarjetas/cuadrículas.
4. Si tiene un espacio disponible según su suscripción, aparece una tarjeta con `+` para agregar otro negocio.
5. Al tocar `+`, completa los datos del nuevo negocio y selecciona su rubro.
6. L&T Manager configura automáticamente los módulos y la sidebar recomendada para ese rubro.
7. El usuario entra al negocio y trabaja desde su dashboard.
8. Desde la configuración del negocio puede activar o desactivar módulos de la sidebar para personalizar completamente la interfaz.
9. Si tiene varios negocios, puede cambiar entre ellos desde el menú principal y cada uno conserva su propia configuración.

## 6. Estructura Comercial: Tres Planes de Suscripción

### Plan Inicial (Starter)

Uso ideal para pequeños emprendimientos, profesionales independientes o negocios que están empezando.

- 1 solo negocio.
- Hasta 50 turnos por mes.
- Hasta 100 clientes registrados.
- 1 usuario (el dueño).
- Menú estándar preconfigurado según el rubro elegido.
- Recordatorios por WhatsApp mediante enlaces manuales sencillos.
- Resumen básico en pantalla sin exportación masiva a PDF o Excel.

### Plan Pyme (Profesional)

Uso ideal para negocios consolidados que administran más de un local o tienen mayor volumen.

- Hasta 3 negocios o sucursales.
- Hasta 500 turnos mensuales por negocio.
- Clientes e historial ilimitados.
- Hasta 3 empleados o colaboradores por negocio.
- Sidebar totalmente personalizable.
- Accesos rápidos de WhatsApp con plantillas configurables y links `wa.me`.
- Exportación de listados a PDF y Excel más reportes financieros intermedios.

### Plan Empresa (Growth)

Uso ideal para cadenas de locales, franquicias o empresas con alta demanda.

- Hasta 100 negocios o sucursales.
- Turnos, clientes, empleados e ingresos ilimitados.
- Sidebar totalmente personalizable con perfiles específicos por sucursal.
- Recordatorios automáticos vía API de WhatsApp.
- Empleados y colaboradores ilimitados con roles de permisos avanzados.
- Analítica avanzada, gráficos de ventas, rendimiento por empleado y exportación contable completa.

## 7. Estrategia de Validación y Crecimiento

Fase 1, Validación: hablar con negocios reales de la zona como barberías y centros de estética antes de construir de más, para confirmar que el problema y la solución tienen sentido para ellos.

Fase 2, Lanzamiento del MVP: clientes, turnos y cobros básicos, con onboarding rápido, importación fácil de clientes existentes, y plan gratis o muy barato para reducir el riesgo de probarlo.

Fase 3, Consolidación: una vez que el negocio usa el sistema sin problemas, se suman recordatorios automáticos, reportes e integración más fuerte con WhatsApp.

Fase 4, Crecimiento: primero dominar un rubro (barberías y estética) en una zona conocida, después replicar a otros rubros parecidos como gimnasios antes de expandir a otras zonas.

## 8. Equipo y Roles

Equipo de 4 personas. El proyecto también se usa como Trabajo Práctico Integrador de Creación y Gestión de un Emprendimiento Informático.

- Organización y parte comercial.
- Backend y base de datos.
- Frontend y diseño.
- Marketing, ventas y administración.

## 9. Requisitos Técnicos No Negociables

- Debe poder correrse en local, sin depender de servidores externos, para poder desarrollarlo y probarlo tranquilamente durante el TP sin costos de hosting.
- Debe ser fácil de usar tanto en celular como en computadora, mobile-first pero funcional en desktop.
- Diseño y CSS propio y cuidado, no genérico. Nada de plantillas visuales por defecto ni aspecto de template gratis. Interfaz simple, amigable, con identidad visual propia.
- Arquitectura pensada para eventualmente poder desplegarse como SaaS real multi-negocio, aunque en esta etapa el foco esté en que funcione perfecto en local.
- La configuración de cada negocio debe mantenerse aislada para que sus módulos, rubro, datos y sidebar no interfieran con otros negocios de la misma cuenta.
- Las restricciones de cantidad de negocios y funciones deben depender del plan de suscripción activo.

## 11. Lo que falta integrar (resumen en palabras simples)

Ya quedó funcionando el plan de mejoras de etapa (equipo con permisos, comisiones por profesional, agenda visual con columnas por profesional, turnos recurrentes que se mueven todos juntos y avisos de conflicto de horario). Falta integrar lo siguiente:

- **Ficha completa del cliente**: una vista que junte todo lo que se sabe de cada cliente — turnos pasados, servicios que eligió, cuánto gastó en total, lo que debe, su cumpleaños y notas o preferencias personales.
- **Cuenta corriente y deudores**: mejor manejo de clientes que pagan por partes. Poder registrar señas y abonos a la plata, ver la deuda activa de cada cliente y un listado rápido de "quiénes deben plata".
- **Recordatorios por WhatsApp organizados**: una página única de Mensajes con plantillas editables (confirmación, recordatorio, bienvenida, promoción) para mandar por WhatsApp sin reescribir el texto cada vez. Hoy los botones rápidos existen en la agenda, pero falta centralizarlos y poder personalizar el texto.
- **Alertas y métricas (reportes)**: sumar indicadores útiles al tablero — clientes nuevos, cancelaciones, ticket promedio, servicios más pedidos y comparación entre períodos para ver si el negocio crece.
- **Presupuestos**: armar una cotización de lo que va a salir un servicio (sin cobrarlo todavía) y después convertirla en turno o en cobro.
- **Recibo para imprimir**: al cobrar, poder descargar o imprimir un comprobante prolijo para entregarle al cliente.
- **Promociones, tarjetas de regalo y puntos**: ofertas por tiempo limitado, gift cards para regalar y acumular puntos de fidelidad. Se aplican directo al momento de cobrar.
- **Compras y proveedores**: registrar compras de insumos (productos) para que el stock se actualice solo, y un botón "reponer" desde la alerta de producto bajo en el tablero.

## 10. Qué se Espera de la IA Agente

- Proponer stack tecnológico concreto que cumpla los requisitos de local-first, multiplataforma y sin dependencias de servidores externos para desarrollo y testing.
- Armar plan de desarrollo por etapas alineado a las fases de validación y crecimiento, empezando por el MVP.
- Definir estructura del proyecto con carpetas, módulos y base de datos de forma clara para que el equipo pueda trabajar en paralelo.
- Diseñar interfaz simple, prolija y con identidad visual propia, pensada mobile-first pero utilizable en desktop.
- Implementar un sistema de cuentas y múltiples negocios preparado para los diferentes planes de suscripción.
- Implementar la selección de rubro y la configuración automática de módulos según el tipo de negocio.
- Implementar una sidebar dinámica y personalizable por negocio, permitiendo activar y desactivar módulos desde la configuración.
- Dejar el MVP en un estado completamente funcional y ejecutable en local, listo para mostrar a negocios reales durante la fase de validación.