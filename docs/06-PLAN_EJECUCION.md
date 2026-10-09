# Plan de ejecución — Duelo de Inteligencias

Del **2026-09-25** (hoy) al **2026-10-08** (cierre interno, un día antes de la presentación oficial
del 2026-10-09). Basado en el reparto confirmado en `03-FRENTES_CHECKLIST.md` y en las decisiones
registradas en `05-DECISIONES.md`.

> **Estado real al 2026-10-09** (este plan se conserva tal cual se escribió el día 1, como registro
> histórico — ver `03-FRENTES_CHECKLIST.md` para el checklist actualizado con el estado real de cada
> tarea). Resumen: Frentes 1, 2 y 3 quedaron prácticamente completos, incluyendo trabajo que no estaba
> en este plan original (modal de resultado, auditoría UI/UX completa, exportación en Excel,
> Stockfish). Lo que **no** se completó según lo planeado: el "modo torneo" de la Semana 2 nunca se
> construyó, por lo que Frente 4 no pudo correr el barrido completo de combinaciones ni escribir el
> análisis de resultados — ese sigue siendo el pendiente más importante antes de la presentación. El
> warm-up de Neon (RNF-04) tampoco se implementó. La herramienta de gestión de tareas nunca se eligió.

## Bloqueos a resolver antes de arrancar a programar

| Bloqueo | Frente(s) que bloquea | Estado en `05-DECISIONES.md` | Qué falta |
| --- | --- | --- | --- |
| Next.js (API routes) vs. Express serverless | Frente 2 y Frente 3 | Propuesta | Que el equipo apruebe la recomendación técnica antes de definir el proyecto en Vercel |
| Validación real de los 3 modelos de IA | Frente 2 (y por extensión Frente 4, que depende de la integración) | Propuesta | Prueba real de 10 movimientos legales por modelo (Gemini, Mistral, `gpt-oss` vía Groq) |
| Funcionalidad adicional definitiva | Frente 4 | Propuesta | Decisión de una sola funcionalidad, con dueño claro |
| Herramienta de gestión de tareas | Ninguno bloquea código, pero conviene resolverlo ya | Propuesta | Elegir Jira o Azure Boards (o descartar y usar un checklist compartido) |

El reparto de frentes ya no bloquea nada — quedó `Confirmada` el 2026-09-25.

## Semana 1 · 25 sep – 1 oct: Cimientos

**Todos (día 1–2, 25–26 sep):**
- Aprobar en equipo la recomendación Next.js vs. Express (ver `01-ARQUITECTURA.md` y `05-DECISIONES.md`).
- Crear proyecto en Vercel y proyecto en Neon; generar `DATABASE_URL`.
- Configurar variables de entorno en Vercel y `.env.local`/`.env.example` (sin secretos reales en el repo).
- Crear cuentas y API keys de Google AI Studio, Mistral AI y Groq — guardarlas solo como variables de entorno.
- Elegir herramienta de gestión de tareas y crear el tablero inicial con este plan.

**Jean Marco — Frente 3 (Backend, persistencia y motor de torneo):**
- Definir el schema Prisma completo: `Participant`, `Game`, `Move`, `AiAttempt`, `Commentary`,
  `AppSetting` (`Statistic` como vista/cálculo, no tabla — ver `01-ARQUITECTURA.md`).
- Primera migración contra Neon.
- Endpoints mínimos `/api/games` y `/api/games/:id/moves` (con datos mock si el motor de reglas aún
  no está listo), para no bloquear a Frente 1.

**Jean Marco — Frente 2 (Orquestador de LLMs):**
- Definir el contrato de adaptador común (entrada/salida, errores estandarizados — ver
  `01-ARQUITECTURA.md`).
- Ejecutar la prueba real de 10 movimientos legales para Gemini 2.5 Flash, Mistral
  `mistral-small-latest` y OpenAI `gpt-oss-120b`/`gpt-oss-20b` vía Groq.
- Cerrar `04-MODELOS_PENDIENTE.md` (checklist) y actualizar la fila de modelos en `05-DECISIONES.md`
  a `Confirmada` una vez pase la prueba.

**Gabriel Contreras y Julián Amado — Frente 1 (Tablero y experiencia visual):**
- Montar tablero con `react-chessboard` (o equivalente) con drag and drop básico.
- Panel de selección de rivales (humano + 3 modelos) por bando, contra los endpoints mock de Frente 3.
- Maquetar la vista única de configuración (RNF-01) y validar que funcione desde 1280×720 (RNF-02).

**Jorge Zamora — Frente 4 (Funcionalidad adicional, análisis y presentación):**
- Cerrar con el equipo la funcionalidad adicional definitiva (comentarista IA u otra) — una sola,
  con dueño claro.
- Empezar el esqueleto de las slides (contexto, arquitectura, objetivos) y el guion de exposición,
  dejando huecos para los resultados que aún no existen.

## Semana 2 · 2 oct – 8 oct: Integración, barrido y cierre

**Jean Marco — Frente 2 + Frente 3:**
- Integrar el motor de reglas (`chess.js`) a los endpoints reales; aplicar enroque, promoción, al
  paso, jaque, jaque mate, tablas (RF-12).
- Implementar reintentos (máx. 2), timeout interno (~8s, por debajo del límite de Vercel) y manejo
  de incidencia técnica sin corromper la partida (RF-15, RF-16, RNF-07).
- Calcular estadísticas (RF-23, RN-10, RN-11) y exportación JSON/CSV/PGN (RF-25).
- Construir el endpoint de "modo torneo" para correr automáticamente todas las combinaciones.
- Añadir el "warm-up" de Neon al cargar la pantalla de configuración (mitiga el cold start frente a
  RNF-04).

**Gabriel Contreras y Julián Amado — Frente 1:**
- Conectar el tablero a los endpoints reales (ya no mock).
- Resaltado de movimientos legales y de la última jugada; bloqueo de interacción fuera de turno
  (RF-09).
- Control de velocidad normal/rápida/máxima para IA-IA (RF-19/20) y pausar/reanudar (RF-28).
- Pantalla de resultado (RF-34) y notificaciones claras de error (RF-11, RF-31).
- Accesibilidad básica: foco de teclado, contraste, etiquetas (RNF-03).

**Jorge Zamora — Frente 4:**
- En cuanto Frente 2+3 estén integrados end-to-end (objetivo interno: 4–5 oct), correr el barrido
  completo de combinaciones modelo × modelo × nivel × nivel con datos reales.
- Escribir el análisis de resultados y conclusiones (10% de la nota — uno de los rubros que más pesa).
- Terminar el material visual y el guion cronometrado (30 min, tope 35 — pasarse resta un tercio de
  la nota).
- Preparar un plan alternativo por si falla Internet o algún modelo durante la demo (RNF-18).

**Todos (7–8 oct):**
- QA manual del flujo completo: todas las combinaciones humano/IA, niveles, incidencias simuladas
  (RNF-17).
- Grabar/capturar una partida estable de respaldo antes de la presentación (RNF-18).
- Ensayo completo de la exposición con los 4 integrantes preparados para responder preguntas sobre
  cualquier frente — el docente elige a quién pregunta y esto pesa 30% de la nota, el rubro más alto.

## Notas de seguimiento

- Si para el 1 de octubre algún modelo de IA no pasó la prueba de 10 movimientos, aplicar el plan de
  sustitución de `04-MODELOS_PENDIENTE.md` de inmediato — no esperar a la semana 2.
- Cualquier cambio de alcance (funcionalidad adicional, stack) debe registrarse el mismo día en
  `05-DECISIONES.md` para que los 4 integrantes tengan la misma versión de la verdad.
