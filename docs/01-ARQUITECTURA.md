# Arquitectura — Duelo de Inteligencias

> Estado: **propuesta del equipo, pendiente de aprobación final**. Ver `05-DECISIONES.md` para el
> estado real de cada elección antes de asumir que algo está cerrado.

## Principio de diseño

El **backend es la única autoridad de la partida**. El frontend nunca llama directamente a los
proveedores de IA: todas las llamadas pasan por el backend, que guarda las claves, valida cada
movimiento y orquesta los adaptadores de cada proveedor. Esto protege las API keys y permite cambiar
de proveedor sin tocar el frontend ni el motor de reglas.

**Despliegue: Vercel (frontend + backend) con base de datos en Neon (Postgres serverless).**
Decisión confirmada el 25 de septiembre de 2026 — reemplaza la idea inicial de ejecución 100% local
con SQLite. Ver `05-DECISIONES.md`.

```
[ Navegador ] --HTTPS--> [ Backend en Vercel (autoridad) ] --API--> [ Google / Mistral / DeepSeek ]
                                    |
                                    v
                           [ Neon (Postgres serverless) ]
```

> ⚠️ Pendiente de decidir: Vercel corre funciones serverless, no un servidor Express persistente de
> forma nativa. Hay que confirmar si el backend se implementa como **API routes de Next.js** (lo más
> idiomático en Vercel) o se mantiene Express empaquetado como función serverless. Ver nota en la
> tabla de stack más abajo.

## Stack propuesto

| Capa | Elección | Justificación |
| --- | --- | --- |
| Lenguaje | TypeScript | Un solo lenguaje tipado en frontend y backend |
| Frontend | React + Vite, **o Next.js si se adopta para encajar con Vercel** | Interfaz reactiva, tablero en tiempo real — ver nota de pendiente arriba |
| Tablero | `react-chessboard` o equivalente | Visual + drag and drop; validar compatibilidad antes de fijarlo |
| Backend | Node.js + Express **empaquetado como función serverless**, o API routes de Next.js | Expone API, guarda secretos, orquesta proveedores — decisión pendiente entre las dos opciones |
| Reglas de ajedrez | `chess.js` | Movimientos legales, FEN, SAN, estados terminales — no reinventar reglas |
| Base de datos | **Neon (Postgres serverless) + Prisma** | Hosting: Vercel + Neon (confirmado). Reemplaza la propuesta original de SQLite local |
| Hosting | **Vercel** | Frontend y backend en la misma plataforma; despliegue continuo desde GitHub |
| Gráficas | Chart.js | Victorias, empates, duración, movimientos |
| Pruebas | Vitest (unitarias) + Playwright (end-to-end) | Reglas críticas y adaptadores con pruebas automatizadas |
| Control de versiones | Git + GitHub (repo privado recomendado) | Material académico |
| Gestión de trabajo | Jira o Azure Boards | Épicas, historias, tareas, seguimiento |

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
`Commentary`. `Statistic` se deriva de `Game`+`Move` para evitar discrepancias — no se guarda a mano.
Las API keys **nunca** viven en estas entidades.

*Pendiente:* diagrama entidad-relación formal y diccionario de datos completo (tipos, claves,
nulabilidad, restricciones de unicidad/rango, enumeraciones).

## Contrato común de los adaptadores de IA

Cada proveedor (Google, Mistral, DeepSeek/OpenRouter, o el que se apruebe) se integra detrás de la
misma interfaz, para poder sustituir uno sin tocar el resto del sistema.

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

| Nivel | Configuración propuesta |
| --- | --- |
| Principiante | Contexto reducido + lista completa de movimientos legales; prompt que prioriza velocidad; temperatura alta si el proveedor la admite |
| Avanzado | Posición + historial reciente; tiempo moderado para "analizar"; temperatura media/baja |
| Maestro | Contexto completo; instrucción de comparar candidatos; temperatura baja; mayor presupuesto de salida dentro de cuota |

Importante: estos son **nombres de perfiles del sistema**, no una afirmación de que el LLM juega al
nivel de un maestro de ajedrez real. La rúbrica exige diferencia *observable* entre niveles, respaldada
con evidencia de las pruebas — no una promesa de fuerza de juego.

## Endpoints propuestos (contrato preliminar — falta cerrar esquemas y códigos de error)

| Método | Ruta | Propósito |
| --- | --- | --- |
| POST | `/api/games` | Crear una partida configurada |
| GET | `/api/games/:id` | Consultar FEN, turno y estado |
| POST | `/api/games/:id/moves` | Enviar movimiento humano |
| POST | `/api/games/:id/ai-move` | Solicitar turno de IA |
| PATCH | `/api/games/:id/control` | Pausar, reanudar o cambiar velocidad |
| GET | `/api/games/:id/moves` | Consultar historial |
| GET | `/api/statistics` | Consultar métricas filtradas |
| GET | `/api/games/:id/export` | Exportar PGN, JSON o CSV |

## Seguridad y manejo de secretos

- Las claves (`GEMINI_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `DATABASE_URL` de Neon, etc.)
  viven **solo** como variables de entorno del proyecto en Vercel (y en `.env.local` para desarrollo
  local) — nunca en el frontend, el repositorio, logs o capturas.
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
