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
| 2026-10-01 | Google Gemini (ahora `gemini-3.8-flash`, ya no `gemini-2.5-flash`) | Pendiente | Jean Marco | Key válida, responde con JSON estructurado correcto, pero la cuota gratuita se agotó al 2°-3er intento durante la prueba real (parece tope diario, no solo por-minuto) y no se recuperó en ~5 min de espera. Falta repetir la prueba con más espaciamiento (o al día siguiente) antes de confirmar. Ver `04-MODELOS_PENDIENTE.md` |
| 2026-10-01 | Mistral AI — generación de API key | Pendiente | Jean Marco | La consola ("Mistral Studio") pide "Upgrade" para generar una key, incluso en el plan gratuito. Podría ser solo activar el plan "Experiment" (gratis) en Billing, no necesariamente un plan de pago — falta revisarlo. Si sigue bloqueado, hace falta una cuarta empresa de respaldo. Ver `04-MODELOS_PENDIENTE.md` |
| 2026-10-07 | Backend desplegado en Vercel (`duelo-inteligencias-backend.vercel.app`), conectado al Neon compartido | Confirmada | Jean Marco | Despliegue manual vía Vercel CLI (no hay auto-deploy en push todavía). Probado end-to-end en producción: crear partida, movimiento humano, turno de IA (Groq), CORS. Permite que Frente 1 y Frente 4 prueben contra datos reales sin levantar el backend local — ver `backend/README.md` para la URL y cómo apuntar el frontend |

## Pendientes de alto nivel para la reunión del equipo

1. Validar en firme Gemini y Mistral (`gpt-oss` vía Groq ya quedó confirmado el 2026-10-01, 10/10
   movimientos reales). Gemini necesita repetir la prueba con más espaciamiento; Mistral necesita
   desbloquear la generación de API key en su consola. (Trabajo de Jean Marco dentro de Frente 2, no
   requiere reunión de equipo.)
2. Aprobar la funcionalidad adicional definitiva (una sola, con dueño claro de su implementación).
3. Elegir herramienta de gestión de tareas (Jira / Azure Boards / otra).

~~Asignar responsables por frente~~ — **Confirmado el 2026-09-25**, ver tabla arriba y
`03-FRENTES_CHECKLIST.md`.

~~Aprobar Next.js vs. Express~~ — **Confirmado el 2026-10-01** por Jean Marco (dueño de Frente 2/3),
para no bloquear el arranque del backend. Ver tabla arriba.

## Cómo actualizar este archivo

Cuando se cierre una decisión: agregar/editar la fila correspondiente con fecha real, marcar el
estado como `Confirmada` (o `Descartada` si se rechaza), y anotar quién la tomó y por qué. Si una
decisión confirmada cambia más adelante, no se borra la fila anterior — se agrega una nueva fila con
la fecha del cambio, para conservar el historial.
