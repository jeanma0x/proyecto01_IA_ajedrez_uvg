# Bitácora de decisiones — Duelo de Inteligencias

Registro vivo de decisiones técnicas y de alcance. Actualizar esta tabla cuando el equipo apruebe,
cambie o descarte algo — así Claude Code y cualquier integrante saben qué es firme y qué sigue en
discusión sin tener que releer el chat completo.

**Leyenda de estado:** `Confirmada` (el equipo ya lo decidió) · `Propuesta` (recomendación técnica,
falta aprobar) · `Pendiente` (aún sin definir) · `Descartada` (se evaluó y no se usará).

| Fecha | Decisión | Estado | Responsable | Razón / notas |
| --- | --- | --- | --- | --- |
| — | Aplicación web ejecutada localmente (sin hosting público) | Confirmada | Equipo | Evita pagar hosting y protege las API keys en backend local |
| — | Las IA se consultan por Internet y deben tener opción gratuita | Confirmada | Equipo | Restricción del proyecto (no incurrir en costos) |
| — | El usuario selecciona e inicia manualmente cada enfrentamiento | Confirmada | Equipo | No hay emparejamiento automático (RF-26) |
| — | El jugador humano controla piezas por drag and drop | Confirmada | Equipo | Requisito explícito del enunciado |
| — | Stack: TypeScript + React/Vite + Node/Express + SQLite + chess.js | Propuesta | — | Ver justificación en `01-ARQUITECTURA.md` |
| — | Modelos candidatos: Google (Gemini), Mistral AI, DeepSeek (OpenRouter) | Descartada (parcial) | — | DeepSeek ya no es viable — ver fila 2026-09-25 con el reemplazo propuesto |
| — | Herramienta de gestión: Jira o Azure Boards | Propuesta | — | Falta elegir una de las dos |
| — | Funcionalidad adicional: modo comentarista IA activable | Propuesta | — | Falta aprobación explícita del equipo — hay otras ideas discutidas (ver notas de chat: personalidades por modelo, ELO dinámico, panel de razonamiento) |
| 2026-09-25 | Reparto de los 4 frentes de trabajo | Confirmada | Equipo (reunión) | Frente 1: Gabriel Contreras y Julián Amado. Frentes 2 y 3: Jean Marco. Frente 4: Jorge Zamora. Ver `03-FRENTES_CHECKLIST.md` |
| — | Fecha interna de cierre: 8 de octubre de 2026 | Confirmada | Equipo | Un día antes de la presentación oficial |
| 2026-09-25 | Hosting en Vercel, base de datos en Neon (Postgres serverless) | Confirmada | Jean Marco | Reemplaza la propuesta original de ejecución 100% local con SQLite. Ver `01-ARQUITECTURA.md` |
| 2026-10-01 | Backend: API routes/Route Handlers de Next.js (en vez de Express serverless) | Confirmada | Jean Marco | Next.js corre nativo en Vercel sin capa de adaptación extra; un solo framework para frontend y backend; encaja directo con Prisma+Neon. Decidido por Jean Marco (dueño de Frente 2/3) para no bloquear el arranque del backend — ver justificación completa en `01-ARQUITECTURA.md` |
| 2026-09-25 | Persistencia: SQLite (descartada) | Descartada | — | Sustituida por Neon Postgres al confirmarse el hosting en Vercel |
| 2026-09-25 | Modelos: Google Gemini + Mistral `mistral-small-latest` + OpenAI `gpt-oss-120b` vía Groq (reemplaza a DeepSeek) | Propuesta | Claude Code (investigación web) | DeepSeek dejó de tener modelos gratuitos en OpenRouter desde julio 2026 (confirmado por búsqueda web). El reemplazo usa la empresa creadora (OpenAI) como "tercera empresa", resolviendo la ambigüedad Groq-vs-Meta. Ver detalle y fuentes en `04-MODELOS_PENDIENTE.md` |
| 2026-10-01 | OpenAI `gpt-oss-120b` vía Groq | Confirmada | Jean Marco | Prueba real de 10 movimientos legales consecutivos: 10/10 con claves reales. Primer modelo production-ready del proyecto. Ver evidencia en `04-MODELOS_PENDIENTE.md` |
| 2026-10-09 | Google Gemini (`gemini-3.8-flash`) — pasa a plan de pago ($5 prepago) | Confirmada | Jean Marco | La cuota gratuita era demasiado agresiva para uso confiable (ver fila 2026-10-01). Se activó facturación en Google AI Studio con $5 de crédito prepago. Prueba real de 10 movimientos legales consecutivos tras el pago: 10/10, 0 fallos, 0 reintentos. Nota de cumplimiento: esto convierte a Gemini en un modelo de pago, lo cual contradice RNF-16 y el alcance del proyecto (ver `00-CONTEXTO_PROYECTO.md`) — decisión tomada conscientemente por el equipo, documentarla así ante el docente si se pregunta |
| 2026-10-01 | Mistral AI — generación de API key | Descartada | Jean Marco | La consola ("Mistral Studio") pedía "Upgrade" para generar una key incluso en el plan gratuito. Reemplazada — ver fila 2026-10-09 |
| 2026-10-09 | Mistral AI reemplazado por Anthropic (`claude-haiku-4-5-20251001`) como tercer modelo | Confirmada | Jean Marco (decisión), Claude Code (implementación) | El plan de pago de Mistral exige un mínimo de $10 — fuera del presupuesto de $5/modelo ya definido. Anthropic sí permite exactamente $5. **Nota de transparencia:** Anthropic es la empresa creadora de Claude Code, la IA que construyó este backend — se le señaló explícitamente este conflicto de interés al equipo antes de decidir, y la elección se basó en el dato objetivo del monto mínimo, no en una recomendación espontánea de la IA. Prueba real de 10 movimientos: 10/10, 0 fallos. Ver `04-MODELOS_PENDIENTE.md` |
| 2026-10-07 | Backend y frontend desplegados en Vercel (`duelo-inteligencias-backend.vercel.app` y `duelo-inteligencias-frontend.vercel.app`), conectados entre sí y al Neon compartido | Confirmada | Jean Marco | Despliegue manual vía Vercel CLI inicialmente. Probado end-to-end en producción: carga del frontend, CORS entre ambos dominios, crear partida, movimiento humano, turno de IA (Groq). Cualquiera del equipo puede abrir el frontend desplegado y jugar contra datos reales sin instalar nada local — ver `backend/README.md` |
| 2026-10-07 | Auto-deploy en push a `develop`: activado solo para el proyecto **frontend**, backend sigue manual | Confirmada | Jean Marco | Frontend es de bajo riesgo (sin migraciones, sin secretos) — cada push a `develop` despliega solo a producción, Gabriel/Julián ven sus cambios sin esperar a que alguien corra `vercel --prod`. Backend se mantiene manual a propósito: un error de migración o de configuración ahí sí podría tumbar lo que el equipo está usando, así que sigue requiriendo aviso antes de desplegar |

## Pendientes de alto nivel para la reunión del equipo

~~Validar en firme los 3 modelos~~ — **Confirmado el 2026-10-09**: OpenAI `gpt-oss` vía Groq (gratis),
Google Gemini (pago, $5) y Anthropic Claude Haiku (pago, $5) — los 3 con prueba real de 10/10
movimientos. Ver `04-MODELOS_PENDIENTE.md`.

1. Aprobar la funcionalidad adicional definitiva (una sola, con dueño claro de su implementación).
2. Elegir herramienta de gestión de tareas (Jira / Azure Boards / otra).

~~Asignar responsables por frente~~ — **Confirmado el 2026-09-25**, ver tabla arriba y
`03-FRENTES_CHECKLIST.md`.

~~Aprobar Next.js vs. Express~~ — **Confirmado el 2026-10-01** por Jean Marco (dueño de Frente 2/3),
para no bloquear el arranque del backend. Ver tabla arriba.

## Cómo actualizar este archivo

Cuando se cierre una decisión: agregar/editar la fila correspondiente con fecha real, marcar el
estado como `Confirmada` (o `Descartada` si se rechaza), y anotar quién la tomó y por qué. Si una
decisión confirmada cambia más adelante, no se borra la fila anterior — se agrega una nueva fila con
la fecha del cambio, para conservar el historial.
