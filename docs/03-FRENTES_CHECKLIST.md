# Frentes de trabajo — Duelo de Inteligencias

> **Actualizado 2026-10-09**, al cierre del desarrollo. Los 3 modelos finales son Google Gemini,
> Anthropic Claude Haiku y OpenAI GPT-5 Nano (no Mistral ni DeepSeek, descartados en el camino — ver
> `05-DECISIONES.md`). El reparto por frentes fue la unidad de construcción, pero para la
> presentación **todos deben poder explicar los 4 frentes completos**, no solo el propio.

Reparto pensado para avanzar en paralelo sin bloquearse. Cada frente es una responsabilidad de
**construcción**, pero el conocimiento del proyecto completo es **compartido**: el docente pregunta
a cualquier integrante al azar (30% de la nota), así que todos deben poder explicar los 4 frentes,
no solo el propio.

**Responsables (confirmado en reunión de equipo, 2026-09-25 — ver `05-DECISIONES.md`):**

- Frente 1: Gabriel Contreras y Julián Amado
- Frente 2 y Frente 3: Jean Marco
- Frente 4: Jorge Zamora

---

## Frente 1 · Tablero y experiencia visual
*Frontend puro — lo que el usuario ve e interactúa.*

- [x] Tablero con drag and drop funcional (RF-08)
- [x] Resaltado de movimientos legales, de la última jugada y del rey en jaque (RF-06, RF-07)
- [x] Orientación coherente del tablero para el jugador humano (RF-06)
- [x] Bloqueo de interacción fuera de turno o con partida terminada (RF-09)
- [x] Panel de selección de rivales: humano + 3 modelos, por bando (RF-01, RF-02, RF-03)
- [x] Selector de nivel de dificultad por IA (RF-05)
- [x] Control de velocidad (normal/rápida/máxima) para partidas IA-IA (RF-19, RF-20)
- [x] Botón/atajo para pausar y reanudar partida IA-IA (RF-28)
- [x] Notificación clara ante movimiento inválido (RF-11)
- [x] Pantalla de resultado: ganador, causa, duración, movimientos totales (RF-34) — tarjeta
      persistente + modal inmediato al terminar la partida (2026-10-09)
- [x] Botón para iniciar nueva partida sin recargar la app (RF-27), con confirmación para no perder
      una partida activa por error
- [x] Cumple usabilidad mínima: una sola vista de configuración, ≥1280×720, foco de teclado,
      contraste (RNF-01, RNF-02, RNF-03) — auditoría visual completa el 2026-10-09 (iconos SVG en vez
      de emojis, contraste de coordenadas del tablero, botones ≥44px, jerarquía de información)
- [x] Persistencia de la partida activa en `localStorage` — sobrevive a un refresh de página
- [x] Vista de estadísticas de jugadores con filtro por participante (RF-23, RF-24)
- [x] Exportación de partida desde la UI: Excel con colores, PGN, CSV, JSON (RF-25)
- [x] Revisor de partida terminada con navegación jugada por jugada (RF-18) + evaluación con
      Stockfish 19 en el navegador

## Frente 2 · Orquestador de LLMs
*La parte más técnica y con más riesgo — conexión con los modelos.*

- [x] Adaptador con interfaz común para los 3 proveedores (RNF-10) — ver contrato en `01-ARQUITECTURA.md`
- [x] Integración funcional con el modelo de Google (`gemini-3.8-flash`)
- [x] Integración funcional con el modelo de Anthropic (`claude-haiku-4-5-20251001`, reemplaza a
      Mistral AI, ver `04-MODELOS_PENDIENTE.md`)
- [x] Integración funcional con el tercer modelo: OpenAI `gpt-5-nano` directo (reemplaza a DeepSeek y,
      después, a `gpt-oss-120b` vía Groq — ver `05-DECISIONES.md` para el historial completo)
- [x] Envío de FEN, color, historial resumido y nivel en cada solicitud (RF-13) — la lista de
      movimientos legales se envía en formato origen-destino, no solo SAN (fix 2026-10-09)
- [x] Parseo y validación estricta de la respuesta antes de aceptarla (RF-14)
- [x] Lógica de reintento (máx. 2) ante jugada inválida, sin perder la posición (RF-15), con mensaje
      de retroalimentación explícito en el reintento para no repetir la misma jugada rechazada
- [x] Manejo de timeout/cuota agotada/servicio caído sin corromper la partida (RF-16, RNF-07) —
      reintento automático (hasta 2, con pausa corta) ante fallas transitorias antes de declarar
      incidencia (fix 2026-10-09)
- [x] Códigos de error estandarizados: AUTH, RATE_LIMIT, TIMEOUT, UNAVAILABLE, INVALID_FORMAT,
      ILLEGAL_MOVE
- [x] Diseño de prompting diferenciado por nivel (principiante/avanzado/maestro) — temperatura y
      presupuesto de tokens distintos por nivel, ver `backend/lib/adapters/prompt.ts`
- [x] Nunca enviar nombres de integrantes ni datos personales en los prompts (RNF-15)
- [x] Registro de latencia, reintentos y respuestas inválidas por modelo (RF-32) — tabla `AiAttempt`,
      incluida también en la exportación de cada partida

## Frente 3 · Backend, persistencia y motor de torneo
*Reglas del juego, datos y automatización de partidas.*

- [x] Motor de validación con `chess.js`: jaque, mate, ahogado, enroque, al paso, promoción (RF-10, RF-12)
- [x] La posición oficial vive solo en el backend (RNF-06)
- [x] Modelo de datos implementado: `Participant`, `Game`, `Move`, `AiAttempt`, `Commentary`,
      `AppSetting` (`Statistic` como cálculo derivado, no tabla física — ver `01-ARQUITECTURA.md`)
- [x] Persistencia en Neon (Postgres serverless), sobrevive a reinicios de la app (RF-22) — decisión
      2026-09-25 reemplazó la propuesta original de SQLite local
- [x] Cálculo de estadísticas: jugadas, ganadas, perdidas, empatadas, % victorias, promedio de
      movimientos por victoria (RF-23, RN-10, RN-11)
- [x] Filtro de estadísticas por modelo y nivel (RF-24)
- [x] Exportación en JSON/CSV/PGN **y Excel con formato visual** (RF-25 y más allá — hojas de
      resumen, movimientos e intentos de IA coloreados por resultado)
- [x] **"Modo torneo" (alcance reducido)**: `backend/scripts/tournament.ts` corre cada modelo IA
      contra cada otro, una vez por color, en un nivel fijo, vía la API real — no el barrido
      combinatorio completo (3×3×3), que se descartó por tiempo (ver `05-DECISIONES.md`). Ejecutado
      2 rondas (12 partidas) el 2026-10-09. Resultados completos, métricas y observaciones en
      `08-RESULTADOS_TORNEO.md`
- [x] Endpoints definidos y probados (ver tabla actualizada en `01-ARQUITECTURA.md`)
- [x] Manejo seguro de claves: `.env`, `.gitignore`, `.env.example` (RNF-08, RNF-09)
- [x] Incidencias técnicas registradas aparte, no cuentan como derrota deportiva (RN-08, RN-09)
- [x] Pruebas automatizadas de reglas críticas y adaptadores (RNF-17) — Vitest, 28 casos: motor de
      reglas (jaque, mate, ahogado, enroque, promoción, al paso, rechazo de ilegales) y validación de
      la respuesta de la IA antes de aceptarla. `npm test` en `backend/`

## Frente 4 · Funcionalidad adicional, análisis y presentación
*El diferenciador creativo y el cierre del proyecto.*

- [x] Funcionalidad adicional aprobada por el equipo e implementada: **Comentarista IA** con
      narración por voz (Web Speech API) y texto generado por un LLM real (Groq, `gpt-oss-120b`) para
      los movimientos notables de la partida (capturas, jaques, jaque mate, enroques, promociones) —
      RF-29, RF-30
- [x] La funcionalidad adicional no interfiere con la lógica del juego (RN-12) — Groq corre aislado
      del flujo de jugadas reales, a propósito, para que una falla del comentarista nunca pueda tumbar
      una partida
- [x] **Ejecución del torneo reducido** (modelo × modelo, ambos colores, nivel fijo) — 2 rondas, 12
      partidas, 2026-10-09. No es el barrido combinatorio completo (3×3×3), descartado por tiempo.
- [x] **Datos reales recolectados**: las 12 partidas quedaron persistidas en Neon vía la API real,
      exportables desde la UI igual que cualquier partida jugada manualmente
- [ ] **Análisis de resultados con conclusiones argumentadas** sobre qué modelo se desempeña mejor —
      métricas, observaciones e IDs de partida ya listos en `08-RESULTADOS_TORNEO.md`. Falta que
      Frente 4 lo convierta en slides/narrativa; es el pendiente más importante antes de armar la
      presentación (10% de la nota)
- [ ] Material visual de la presentación (slides o demo en vivo)
- [ ] Guion de exposición cronometrado (30 min, tope 35)
- [ ] Plan alternativo si falla Internet o algún modelo durante la demo (RNF-18)
- [ ] QA general antes de la presentación: casos de prueba manuales del flujo completo (RNF-17)
- [ ] Verificar que los 4 integrantes puedan responder preguntas sobre cualquier frente

---

## Resumen para quien recién llega a este documento (ej. para armar la presentación)

**Ya construido y probado** (Frentes 1, 2 y 3 — prácticamente al 100%): selección de rivales,
tablero con drag&drop, validación de reglas, 3 niveles de dificultad con comportamiento real distinto
por modelo, velocidad configurable, pausar/reanudar, estadísticas con filtro, exportación en 4
formatos (incluye Excel con colores), persistencia de partida, revisor de partida con Stockfish,
comentarista IA conectado a un LLM real, y una auditoría de UI/UX completa (sin emojis como íconos,
contraste corregido, botones con tamaño táctil correcto).

**El torneo reducido ya se corrió y está documentado en `08-RESULTADOS_TORNEO.md`** (métricas, IDs de
partida, observaciones e ideas de slides ya redactadas). Lo único que falta para la sección de
análisis de la presentación es que Frente 4 lo lleve a slides/narrativa — los datos ya están listos.

**Housekeeping pendiente, no bloquea la demo**: la elección de herramienta de gestión de tareas
(nunca se decidió, ver `05-DECISIONES.md`) — decisión del equipo: no se espera que el docente la
cuestione.

## Nota sobre dependencias entre frentes
- Frente 2 y Frente 3 comparten el contrato de datos (`Move`, `AiAttempt`) — ya resuelto, mismo
  dueño (Jean Marco) implementó ambos.
- Frente 1 dependía de que Frente 3 tuviera los endpoints básicos disponibles — ya no aplica, todo
  está integrado end-to-end.
- Frente 4 dependía de que existiera el torneo (Frente 3) para tener datos reales de comparación —
  ya no es un bloqueo: el torneo reducido se corrió y sus resultados están en
  `08-RESULTADOS_TORNEO.md`, listos para usarse en el análisis.
