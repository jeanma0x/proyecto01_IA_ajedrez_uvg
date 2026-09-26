# Frentes de trabajo — Duelo de Inteligencias

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

- [ ] Tablero con drag and drop funcional (RF-08)
- [ ] Resaltado de movimientos legales y de la última jugada (RF-06, RF-07)
- [ ] Orientación coherente del tablero para el jugador humano (RF-06)
- [ ] Bloqueo de interacción fuera de turno o con partida terminada (RF-09)
- [ ] Panel de selección de rivales: humano + 3 modelos, por bando (RF-01, RF-02, RF-03)
- [ ] Selector de nivel de dificultad por IA (RF-05)
- [ ] Control de velocidad (normal/rápida/máxima) para partidas IA-IA (RF-19, RF-20)
- [ ] Botón/atajo para pausar y reanudar partida IA-IA (RF-28)
- [ ] Notificación clara ante movimiento inválido (RF-11)
- [ ] Pantalla de resultado: ganador, causa, duración, movimientos totales (RF-34)
- [ ] Botón para iniciar nueva partida sin recargar la app (RF-27)
- [ ] Cumple usabilidad mínima: una sola vista de configuración, ≥1280×720, foco de teclado, contraste (RNF-01, RNF-02, RNF-03)

## Frente 2 · Orquestador de LLMs
*La parte más técnica y con más riesgo — conexión con los modelos.*

- [ ] Adaptador con interfaz común para los 3 proveedores (RNF-10) — ver contrato en `01-ARQUITECTURA.md`
- [ ] Integración funcional con el modelo de Google (HU-08 en el doc de backlog original)
- [ ] Integración funcional con el modelo de Mistral AI
- [ ] Integración funcional con el modelo de DeepSeek (vía OpenRouter u otro acceso)
- [ ] Envío de FEN, color, historial resumido y nivel en cada solicitud (RF-13)
- [ ] Parseo y validación estricta de la respuesta antes de aceptarla (RF-14)
- [ ] Lógica de reintento (máx. 2) ante jugada inválida, sin perder la posición (RF-15)
- [ ] Manejo de timeout/cuota agotada/servicio caído sin corromper la partida (RF-16, RNF-07)
- [ ] Códigos de error estandarizados: AUTH, RATE_LIMIT, TIMEOUT, UNAVAILABLE, INVALID_FORMAT, ILLEGAL_MOVE
- [ ] Diseño de prompting diferenciado por nivel (principiante/avanzado/maestro) — ver `01-ARQUITECTURA.md`
- [ ] Nunca enviar nombres de integrantes ni datos personales en los prompts (RNF-15)
- [ ] Registro de latencia, reintentos y respuestas inválidas por modelo (RF-32)

## Frente 3 · Backend, persistencia y motor de torneo
*Reglas del juego, datos y automatización de partidas.*

- [ ] Motor de validación con `chess.js`: jaque, mate, ahogado, enroque, al paso, promoción (RF-10, RF-12)
- [ ] La posición oficial vive solo en el backend (RNF-06)
- [ ] Modelo de datos implementado: Participant, Game, Move, AiAttempt, Statistic, Commentary, AppSetting
- [ ] Persistencia en SQLite, sobrevive a reinicios de la app (RF-22)
- [ ] Cálculo de estadísticas: jugadas, ganadas, perdidas, empatadas, % victorias, promedio de movimientos por victoria (RF-23, RN-10, RN-11)
- [ ] Filtro de estadísticas por modelo y nivel (RF-24)
- [ ] Exportación en JSON/CSV/PGN (RF-25)
- [ ] "Modo torneo": correr automáticamente todas las combinaciones posibles de enfrentamientos y niveles (objetivo específico del proyecto)
- [ ] Endpoints definidos y probados (ver tabla en `01-ARQUITECTURA.md`)
- [ ] Manejo seguro de claves: `.env`, `.gitignore`, `.env.example` (RNF-08, RNF-09)
- [ ] Incidencias técnicas registradas aparte, no cuentan como derrota deportiva (RN-08, RN-09)

## Frente 4 · Funcionalidad adicional, análisis y presentación
*El diferenciador creativo y el cierre del proyecto.*

- [ ] Funcionalidad adicional aprobada por el equipo e implementada (RF-29, RF-30 si es el comentarista IA, u otra que decidan)
- [ ] La funcionalidad adicional no interfiere con la lógica del juego (RN-12 si aplica al comentarista)
- [ ] Ejecución del barrido completo de combinaciones posibles (modelo × modelo × nivel × nivel)
- [ ] Recolección de datos reales (no inventados) de esas partidas
- [ ] Análisis de resultados con conclusiones argumentadas sobre qué modelo se desempeña mejor
- [ ] Material visual de la presentación (slides o demo en vivo)
- [ ] Guion de exposición cronometrado (30 min, tope 35)
- [ ] Plan alternativo si falla Internet o algún modelo durante la demo (RNF-18)
- [ ] QA general antes de la presentación: casos de prueba manuales del flujo completo (RNF-17)
- [ ] Verificar que los 4 integrantes puedan responder preguntas sobre cualquier frente

---

## Nota sobre dependencias entre frentes
- Frente 2 y Frente 3 comparten el contrato de datos (`Move`, `AiAttempt`) — conviene que ambos
  frentes se pongan de acuerdo en el esquema exacto antes de programar en paralelo.
- Frente 1 depende de que Frente 3 tenga los endpoints básicos (`/api/games`, `/api/games/:id/moves`)
  disponibles, aunque sea con datos de prueba (mock), para no bloquearse esperando el backend real.
- Frente 4 depende de que Frente 2 y 3 estén integrados end-to-end antes de poder correr el barrido
  completo de combinaciones — por eso conviene dejarlo para la última semana del cronograma.
