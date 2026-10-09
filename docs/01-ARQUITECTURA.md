# Arquitectura — Duelo de Inteligencias

> **Actualizado 2026-10-09 — implementada, no ya "propuesta".** Este documento describe la
> arquitectura real del sistema tal como quedó construida. Ver `05-DECISIONES.md` para la bitácora
> completa de cómo se llegó aquí (incluye decisiones descartadas en el camino).

## Principio de diseño

El **backend es la única autoridad de la partida**. El frontend nunca llama directamente a los
proveedores de IA: todas las llamadas pasan por el backend, que guarda las claves, valida cada
movimiento y orquesta los adaptadores de cada proveedor. Esto protege las API keys y permite cambiar
de proveedor sin tocar el frontend ni el motor de reglas.

**Despliegue: dos proyectos separados en Vercel — `duelo-inteligencias-backend` (Next.js) y
`duelo-inteligencias-frontend` (Vite/React) — con base de datos compartida en Neon (Postgres
serverless).** Decisión de hosting confirmada el 25 de septiembre de 2026 (reemplazó la idea inicial
de ejecución 100% local con SQLite); el backend en Next.js se confirmó el 1 de octubre de 2026. Ver
`05-DECISIONES.md`.

```
[ Navegador ] --HTTPS--> [ Frontend (Vite/React, Vercel) ] --HTTPS/CORS--> [ Backend (Next.js, Vercel, autoridad) ]
                                                                                    |              |
                                                                                    v              v
                                                                    [ Google / Anthropic / OpenAI ]   [ Neon (Postgres) ]
                                                                                    |
                                                                                    v
                                                                    [ Groq — solo comentarista, aislado del juego ]
```

Nota: el tercer modelo jugable (OpenAI `gpt-5-nano`) se llama **directo**, no vía Groq — Groq quedó
reservado únicamente para el modo comentarista (narración de texto, sin efecto en el juego), a
propósito, para que una falla ahí nunca pueda tumbar una partida real. Ver `04-MODELOS_PENDIENTE.md`.

## Stack real

| Capa | Elección | Justificación |
| --- | --- | --- |
| Lenguaje | TypeScript | Un solo lenguaje tipado en frontend y backend |
| Frontend | React + Vite (`frontend/`) | Interfaz reactiva, tablero en tiempo real; proyecto Vercel separado del backend |
| Tablero | `react-chessboard` v5 | Visual + drag and drop; piezas SVG (no emoji), resaltado de jugadas y jaque |
| Íconos | `lucide-react` | SVG, no emoji — decisión 2026-10-09 tras encontrar renderizado inconsistente de emojis entre entornos |
| Backend | **API routes / Route Handlers de Next.js** (`backend/`), proyecto Vercel separado | Expone la API, guarda secretos, orquesta los adaptadores de IA — confirmado 2026-10-01, no Express |
| Reglas de ajedrez | `chess.js` | Movimientos legales, FEN, SAN, estados terminales, detección de jaque — no se reinventan reglas |
| Base de datos | **Neon (Postgres serverless) + Prisma** | Compartida entre ambos despliegues; reemplazó la propuesta original de SQLite local |
| Hosting | **Vercel** (dos proyectos) | Auto-deploy en push a `develop` activado solo para el frontend; backend se despliega manual a propósito |
| Análisis de posición | Stockfish 19 (WebAssembly, en el navegador) | Evaluación de jugadas en el revisor de partida — no requiere backend |
| Exportación | `exceljs` (Excel con colores) + generación manual de CSV/PGN/JSON | Ver `backend/lib/game/exportXlsx.ts` |
| Pruebas | **Vitest** (RNF-17 cerrado, 2026-10-09) — 28 casos: `lib/chess/engine.test.ts` (jaque, mate, ahogado, material insuficiente, enroque, las 4 promociones, al paso, rechazo de ilegales) y `lib/adapters/parse.test.ts` (validación de la respuesta de la IA) | `npm test` en `backend/`. Complementa, no reemplaza, los scripts manuales (`backend/scripts/test-ten-moves.ts`) y las pruebas end-to-end manuales con `curl`/Playwright durante el desarrollo |
| Control de versiones | Git + GitHub (`jeanma0x/proyecto01_IA_ajedrez_uvg`) | Material académico |
| Gestión de trabajo | **Pendiente** — nunca se eligió Jira/Azure Boards/otra | No bloqueó el desarrollo |

## Modelo de datos (entidades principales)

| Entidad | Campos principales | Propósito |
| --- | --- | --- |
| `Participant` | id, type, displayName, company, modelId | Humano o IA seleccionable |
| `Game` | id, whiteParticipantId, blackParticipantId, levels, status, result, reason, startedAt, endedAt | Cabecera y estado de una partida |
| `Move` | id, gameId, ply, color, piece, from, to, san, fenAfter, valid, latencyMs | Movimiento confirmado o intento registrado |
| `AiAttempt` | id, gameId, ply, provider, rawResponse, parsedMove, outcome, retry, latencyMs | Trazabilidad de cada llamada a un modelo |
| `Statistic` | participantId, level, played, wins, losses, draws, winRate, avgMovesPerWin | Vista calculada a partir de `Game`/`Move`, no necesariamente tabla física |
| `Commentary` | id, gameId, ply, provider, text, createdAt | Comentario opcional del modo comentarista, sin efecto sobre el juego |
| `AppSetting` | key, value | Velocidades, timeouts, límites no secretos |

**Relaciones:** `Game` referencia dos `Participant`; `Game` contiene muchos `Move`, `AiAttempt` y
`Commentary`. `Statistic` se calcula en caliente a partir de `Game`+`Move`
(`backend/lib/game/statistics.ts::computeStatistics`) — nunca se guarda a mano, así no hay
discrepancias. Las API keys **nunca** viven en estas entidades.

*Sigue pendiente:* diagrama entidad-relación formal y diccionario de datos completo (tipos, claves,
nulabilidad, restricciones de unicidad/rango, enumeraciones) — el esquema real y completo vive en
`backend/prisma/schema.prisma`, que es la fuente de verdad mientras no exista el diagrama.

## Contrato común de los adaptadores de IA

Cada proveedor (Google, Anthropic, OpenAI) se integra detrás de la misma interfaz
(`backend/lib/adapters/types.ts::AiAdapter`), para poder sustituir uno sin tocar el resto del sistema
— ver `04-MODELOS_PENDIENTE.md` para el historial completo de reemplazos (DeepSeek → Groq → OpenAI
directo; Mistral → Anthropic) y por qué.

- **Entrada:** `gameId`, FEN, color, movimientos legales (opcional), nivel, historial resumido, timeout.
- **Salida válida:** objeto `{ from, to, promotion? }` — nunca texto libre sin parsear.
- **Normalización:** eliminar bloques de código/texto extra, validar contra un esquema, **nunca
  confiar en la respuesta cruda**.
- **Errores estandarizados:** `AUTH`, `RATE_LIMIT`, `TIMEOUT`, `UNAVAILABLE`, `INVALID_FORMAT`,
  `ILLEGAL_MOVE`.
- **Registro:** proveedor, modelo, nivel, latencia, reintentos, resultado. La respuesta cruda se
  trunca/limita para no guardar secretos.
- **Reintentos:** máximo 2 reintentos configurables ante jugada inválida antes de pausar la partida
  como incidencia técnica (no cuenta como derrota deportiva).

## Niveles de juego (perfiles de prompting, no fuerza real de ajedrez)

Implementado en `backend/lib/adapters/prompt.ts::DIFFICULTY_PROFILES`:

| Nivel | Temperatura | Presupuesto de tokens | Instrucción |
| --- | --- | --- | --- |
| Principiante | 0.9 | 600 | "Elige rápidamente una jugada legal razonable. No expliques tu razonamiento." |
| Avanzado | 0.5 | 900 | "Analiza brevemente la posición antes de decidir tu jugada." |
| Maestro | 0.2 | 1200 | "Compara al menos dos jugadas candidatas y elige la mejor antes de responder." |

(OpenAI `gpt-5-nano`, al ser un modelo de razonamiento, usa un piso más alto —
`max(presupuesto, 1500)` — y `reasoning_effort: "low"`; ver `04-MODELOS_PENDIENTE.md`.)

Importante: estos son **nombres de perfiles del sistema**, no una afirmación de que el LLM juega al
nivel de un maestro de ajedrez real. La rúbrica exige diferencia *observable* entre niveles, respaldada
con evidencia de las pruebas — no una promesa de fuerza de juego. **Pendiente:** no se ha hecho una
comparación formal documentada de qué tan distinto juega cada modelo entre sus 3 niveles (parte del
análisis de resultados que depende del modo torneo, ver `05-DECISIONES.md`).

## Endpoints reales

| Método | Ruta | Propósito |
| --- | --- | --- |
| POST | `/api/games` | Crear una partida configurada |
| GET | `/api/games/:id` | Consultar FEN, turno y estado |
| POST | `/api/games/:id/moves` | Enviar movimiento humano |
| POST | `/api/games/:id/ai-move` | Solicitar turno de IA |
| PATCH | `/api/games/:id/control` | Pausar, reanudar o cambiar velocidad |
| GET | `/api/games/:id/moves` | Consultar historial |
| GET | `/api/statistics` | Consultar métricas filtradas (por participante y/o nivel) |
| GET | `/api/games/:id/export?format=` | Exportar `pgn`, `csv`, `json` o `xlsx` (Excel con colores) |
| POST | `/api/games/:id/commentary` | Generar un comentario de narrador (Groq) para un movimiento — aislado del flujo de juego real |
| GET | `/api/participants` | Listar los participantes disponibles (humano + 3 IA) |
| GET | `/api/health` | Chequeo de salud del backend |

## Seguridad y manejo de secretos

- Las claves reales (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY` — esta
  última solo para el comentarista —, `DATABASE_URL` de Neon) viven **solo** como variables de
  entorno del proyecto en Vercel (y en `backend/.env` para desarrollo local, gitignored) — nunca en el
  frontend, el repositorio, logs o capturas.
- `.env*` va en `.gitignore`; se publica un `.env.example` sin secretos reales.
- Cualquier clave expuesta se revoca y regenera de inmediato.
- Sanear logs, mensajes de error y capturas de pantalla antes de la presentación (RNF-08, RNF-09,
  RNF-15 en `02-REQUISITOS.md`).

## Diagramas pendientes de crear (prioridad alta)

1. Secuencia de un movimiento humano (frontend → backend → motor de reglas → BD → respuesta).
2. Secuencia de un movimiento de IA (orquestador → adaptador → proveedor → validación → reintento).
3. Diagrama de estados de una partida (configurada, activa, pausada, terminada, incidencia).
4. Diagrama entidad-relación completo.
5. (Prioridad media) Diagrama de componentes de frontend/backend.
