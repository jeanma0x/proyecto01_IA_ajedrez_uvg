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
| 2026-09-25 | Backend: API routes/Route Handlers de Next.js (en vez de Express serverless) | Propuesta | Claude Code (análisis técnico) | Next.js corre nativo en Vercel sin capa de adaptación extra; reduce configuración de despliegue con el tiempo limitado hasta el 8-oct. Falta aprobación del equipo — ver justificación completa en `01-ARQUITECTURA.md` |
| 2026-09-25 | Persistencia: SQLite (descartada) | Descartada | — | Sustituida por Neon Postgres al confirmarse el hosting en Vercel |
| 2026-09-25 | Modelos: Google Gemini 2.5 Flash + Mistral `mistral-small-latest` + OpenAI `gpt-oss-120b` vía Groq (reemplaza a DeepSeek) | Propuesta | Claude Code (investigación web) | DeepSeek dejó de tener modelos gratuitos en OpenRouter desde julio 2026 (confirmado por búsqueda web). El reemplazo usa la empresa creadora (OpenAI) como "tercera empresa", resolviendo la ambigüedad Groq-vs-Meta. Ver detalle y fuentes en `04-MODELOS_PENDIENTE.md`. Pasa a `Confirmada` tras la prueba real de 10 movimientos por modelo |

## Pendientes de alto nivel para la reunión del equipo

1. Aprobar la recomendación de Next.js sobre Express serverless (o sustituirla) — los 4 integrantes
   deben estar de acuerdo antes de que Frente 2/3 empiecen a programar.
2. Validar en firme los 3 modelos (Gemini, Mistral, `gpt-oss` vía Groq): correr la prueba real de 10
   movimientos por modelo antes de comprometerse.
3. Aprobar la funcionalidad adicional definitiva (una sola, con dueño claro de su implementación).
4. Elegir herramienta de gestión de tareas (Jira / Azure Boards / otra).

~~Asignar responsables por frente~~ — **Confirmado el 2026-09-25**, ver tabla arriba y
`03-FRENTES_CHECKLIST.md`.

## Cómo actualizar este archivo

Cuando se cierre una decisión: agregar/editar la fila correspondiente con fecha real, marcar el
estado como `Confirmada` (o `Descartada` si se rechaza), y anotar quién la tomó y por qué. Si una
decisión confirmada cambia más adelante, no se borra la fila anterior — se agrega una nueva fila con
la fecha del cambio, para conservar el historial.
