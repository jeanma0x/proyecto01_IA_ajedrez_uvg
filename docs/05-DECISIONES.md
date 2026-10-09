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
| — | Stack: TypeScript + React/Vite + Node/Express + SQLite + chess.js | Descartada | — | Superada en la práctica por Next.js (backend) + Vite/React (frontend) + Neon/Postgres, nunca se cerró formalmente esta fila — ver filas 2026-09-25 y 2026-10-01 |
| — | Modelos candidatos: Google (Gemini), Mistral AI, DeepSeek (OpenRouter) | Descartada | — | Mistral y DeepSeek quedaron fuera del todo (ver filas 2026-10-01 y 2026-10-09); combinación final: Google + Anthropic + OpenAI |
| — | Herramienta de gestión: Jira o Azure Boards | Pendiente | — | Nunca se eligió una de las dos — no bloqueó el desarrollo, pero sigue sin decidirse al cierre |
| 2026-10-09 | Funcionalidad adicional: Comentarista IA con voz + LLM real | Confirmada | Equipo (implementación: Jorge, conexión al LLM: Jorge, UI/UX: Jean Marco) | Implementada y conectada de verdad a un LLM (Groq, `gpt-oss-120b`) para movimientos notables (capturas, jaques, jaque mate, enroques, promociones) — no solo texto heurístico local. Es la única funcionalidad adicional del equipo, con dueño claro (RF-29/RF-30) |
| 2026-09-25 | Reparto de los 4 frentes de trabajo | Confirmada | Equipo (reunión) | Frente 1: Gabriel Contreras y Julián Amado. Frentes 2 y 3: Jean Marco. Frente 4: Jorge Zamora. Ver `03-FRENTES_CHECKLIST.md` |
| — | Fecha interna de cierre: 8 de octubre de 2026 | Confirmada | Equipo | Un día antes de la presentación oficial |
| 2026-09-25 | Hosting en Vercel, base de datos en Neon (Postgres serverless) | Confirmada | Jean Marco | Reemplaza la propuesta original de ejecución 100% local con SQLite. Ver `01-ARQUITECTURA.md` |
| 2026-10-01 | Backend: API routes/Route Handlers de Next.js (en vez de Express serverless) | Confirmada | Jean Marco | Next.js corre nativo en Vercel sin capa de adaptación extra; un solo framework para frontend y backend; encaja directo con Prisma+Neon. Decidido por Jean Marco (dueño de Frente 2/3) para no bloquear el arranque del backend — ver justificación completa en `01-ARQUITECTURA.md` |
| 2026-09-25 | Persistencia: SQLite (descartada) | Descartada | — | Sustituida por Neon Postgres al confirmarse el hosting en Vercel |
| 2026-09-25 | Modelos: Google Gemini + Mistral `mistral-small-latest` + OpenAI `gpt-oss-120b` vía Groq (reemplaza a DeepSeek) | Descartada | Claude Code (investigación web) | Fue la propuesta inicial tras descartar DeepSeek; superada pieza por pieza (Mistral → Anthropic el 2026-10-09, Groq → OpenAI directo el 2026-10-08) — combinación final: Google + Anthropic + OpenAI. Ver detalle y fuentes en `04-MODELOS_PENDIENTE.md` |
| 2026-10-01 | OpenAI `gpt-oss-120b` vía Groq | Descartada | Jean Marco | Confirmada inicialmente (10/10), pero la cuota gratuita de Groq se agotó durante pruebas de equipo y su propio upgrade de pago quedó bloqueado por demanda alta ("temporarily unavailable"), fuera de nuestro control. Reemplazada — ver fila 2026-10-08 |
| 2026-10-08 | OpenAI directo (`gpt-5-nano`, sin pasar por Groq) reemplaza a `gpt-oss-120b` vía Groq | Confirmada | Jean Marco | Mismo tercer modelo/empresa (OpenAI) para RN-03, solo cambia el host. Mínimo de pago de OpenAI: $5, igual que Gemini y Anthropic. Necesitó ajuste fino (`max_completion_tokens` + `reasoning_effort: "low"` + piso de 1500 tokens) por ser un modelo de razonamiento — ver detalle en `04-MODELOS_PENDIENTE.md`. Prueba real tras el ajuste: 10/10, 0 fallos. Groq se mantiene (gratis) solo para el modo comentarista, de menor volumen |
| 2026-10-09 | Google Gemini (`gemini-3.8-flash`) — pasa a plan de pago ($5 prepago) | Confirmada | Jean Marco | La cuota gratuita era demasiado agresiva para uso confiable (ver fila 2026-10-01). Se activó facturación en Google AI Studio con $5 de crédito prepago. Prueba real de 10 movimientos legales consecutivos tras el pago: 10/10, 0 fallos, 0 reintentos. Nota de cumplimiento: esto convierte a Gemini en un modelo de pago, lo cual contradice RNF-16 y el alcance del proyecto (ver `00-CONTEXTO_PROYECTO.md`) — decisión tomada conscientemente por el equipo, documentarla así ante el docente si se pregunta |
| 2026-10-01 | Mistral AI — generación de API key | Descartada | Jean Marco | La consola ("Mistral Studio") pedía "Upgrade" para generar una key incluso en el plan gratuito. Reemplazada — ver fila 2026-10-09 |
| 2026-10-09 | Mistral AI reemplazado por Anthropic (`claude-haiku-4-5-20251001`) como tercer modelo | Confirmada | Jean Marco (decisión), Claude Code (implementación) | El plan de pago de Mistral exige un mínimo de $10 — fuera del presupuesto de $5/modelo ya definido. Anthropic sí permite exactamente $5. **Nota de transparencia:** Anthropic es la empresa creadora de Claude Code, la IA que construyó este backend — se le señaló explícitamente este conflicto de interés al equipo antes de decidir, y la elección se basó en el dato objetivo del monto mínimo, no en una recomendación espontánea de la IA. Prueba real de 10 movimientos: 10/10, 0 fallos. Ver `04-MODELOS_PENDIENTE.md` |
| 2026-10-07 | Backend y frontend desplegados en Vercel (`duelo-inteligencias-backend.vercel.app` y `duelo-inteligencias-frontend.vercel.app`), conectados entre sí y al Neon compartido | Confirmada | Jean Marco | Despliegue manual vía Vercel CLI inicialmente. Probado end-to-end en producción: carga del frontend, CORS entre ambos dominios, crear partida, movimiento humano, turno de IA (Groq). Cualquiera del equipo puede abrir el frontend desplegado y jugar contra datos reales sin instalar nada local — ver `backend/README.md` |
| 2026-10-07 | Auto-deploy en push a `develop`: activado solo para el proyecto **frontend**, backend sigue manual | Confirmada | Jean Marco | Frontend es de bajo riesgo (sin migraciones, sin secretos) — cada push a `develop` despliega solo a producción, Gabriel/Julián ven sus cambios sin esperar a que alguien corra `vercel --prod`. Backend se mantiene manual a propósito: un error de migración o de configuración ahí sí podría tumbar lo que el equipo está usando, así que sigue requiriendo aviso antes de desplegar |
| 2026-10-09 | Corrección de raíz de partidas terminando en "incident" (Gemini y Claude) | Confirmada | Jean Marco | Diagnóstico directo contra `AiAttempt` en Neon encontró dos bugs: (1) la lista de movimientos legales se mostraba en SAN pero la función exige origen/destino, impidiendo que el modelo validara su propia respuesta y causando jugadas ilegales repetidas; (2) fallas de servicio transitorias (timeout/429/5xx) iban directo a incidencia sin reintento, contradiciendo RF-16 ("pausar y permitir reintentar"). Se corrigieron ambas: lista de jugadas en formato origen-destino, y hasta 2 reintentos automáticos con pausa corta para fallas de servicio (no para `AUTH`). Prueba real tras el fix: Gemini 10/10, Anthropic 10/10, OpenAI 10/10 — ver detalle en `04-MODELOS_PENDIENTE.md` |
| 2026-10-09 | Frontend: persistir partida activa en `localStorage` + confirmación antes de "Nueva partida" | Confirmada | Jean Marco | Refrescar la página perdía el estado en memoria y mandaba al usuario al menú de configuración aunque la partida siguiera viva en el backend. Ahora se restaura vía `GET /api/games/:id` al cargar la app, y el botón "Nueva partida" (solo visible con partida activa) pide confirmación antes de descartarla |
| 2026-10-09 | Vercel backend: `Root Directory` corregido de `.` a `backend` | Confirmada | Jean Marco | Efecto secundario no detectado de un ajuste anterior (2026-10-07, para que `vercel --prod` funcionara desde CLI): con `Root Directory=.`, cada push a `develop` disparaba un Preview automático desde la raíz del repo (sin app Next.js ahí) que fallaba siempre — con "Error" en TODOS los commits, incluidos los de frontend que nunca tocaban backend. No era un problema causado por el equipo. Corregido a `Root Directory=backend` (correcto para los builds que dispara GitHub) y se linkeó el proyecto también en la raíz del repo (`.vercel/project.json`, gitignored) para que los deploys manuales (`vercel --prod` desde la raíz) sigan funcionando sin el doble anidado que causó el ajuste original |
| 2026-10-09 | Estadísticas, exportación y comentarista real — gaps de la rúbrica cerrados | Confirmada | Jorge (implementación), Jean Marco (plan y auditoría) | Vista de estadísticas en frontend, botones de exportación (antes solo existían en el backend sin UI) y conexión real del comentarista a un LLM (antes solo narración heurística local). Plan detallado entregado a Jorge en `07-PLAN_CIERRE_GAPS.md` (ahora resuelto). El "modo torneo" se dejó fuera a propósito, para después |
| 2026-10-09 | Exportación: formato Excel (.xlsx) con colores y formato profesional, y fix del CSV | Confirmada | Jean Marco | A pedido explícito del usuario ("que no se vea genérico"): nuevo formato `xlsx` (librería `exceljs`) con 3 hojas (resumen, movimientos, intentos de IA coloreados por resultado — verde/amarillo/rojo). De paso se corrigió un bug real en el CSV: Excel lo mostraba todo en una sola columna por el separador de listas de la configuración regional; se agregó la directiva `sep=,` que Excel reconoce sin importar la región |
| 2026-10-09 | Stockfish 19 (evaluación de jugadas en el revisor de partida) — integrado por el equipo, bug de carga corregido | Confirmada | Equipo (integración), Jean Marco (fix) | El equipo integró Stockfish 19 vía WebAssembly en `GameReview.tsx`. El motor nunca inicializaba: el `.js` compilado espera un `.wasm` con un nombre específico (mecanismo `locateFile` de Emscripten) que no coincidía con el archivo real en el repo. Verificado con un navegador real (Playwright + Chromium, no solo lectura de código) antes y después del fix — confirmado funcionando de punta a punta (uci → isready → position → go → bestmove) en local y en producción |
| 2026-10-09 | Auditoría UI/UX completa: sin emojis como íconos, jerarquía de información, modal de resultado | Confirmada | Jean Marco | Auditoría visual real (Playwright + Chromium, 8 estados capturados, contraste WCAG y tamaños de botón medidos programáticamente) encontró y corrigió: emojis reemplazados por íconos SVG (`lucide-react`) — un emoji específico se rompía en el entorno de prueba, demostrando que la apariencia dependía de fuentes del sistema; reordenamiento de la columna derecha (Historial antes que Comentarista); ajustes de voz del comentarista colapsados por defecto; nuevo modal de "partida finalizada" como aviso inmediato; contraste de coordenadas del tablero (2.10:1/2.72:1 → 9.19:1/3.73:1, el máximo matemático sin cambiar el color de las casillas); botones por debajo de 44px subidos al mínimo táctil; redundancias de botones/encabezados eliminadas; spinners animados en estados de carga. Restricción explícita seguida: no rediseñar de forma genérica, solo pulir la estética dorado/marrón ya existente |

## Pendientes de alto nivel para la reunión del equipo

~~Validar en firme los 3 modelos~~ — **Confirmado el 2026-10-08**: Google Gemini (pago, $5),
Anthropic Claude Haiku (pago, $5) y OpenAI `gpt-5-nano` directo (pago, $5, reemplaza a Groq) — los 3
con prueba real de 10/10 movimientos. Ver `04-MODELOS_PENDIENTE.md`. Nota: ninguno terminó siendo
gratuito al final — RNF-16 queda documentado como excepción consciente del equipo.

~~Aprobar la funcionalidad adicional definitiva~~ — **Confirmado el 2026-10-09**: Comentarista IA con
voz y LLM real (Groq). Ver fila arriba.

**Pendientes reales que siguen abiertos al 2026-10-09** (ver `03-FRENTES_CHECKLIST.md` para el detalle
completo por frente):

1. **Modo torneo** (barrido automático de todas las combinaciones modelo × modelo × nivel × nivel) —
   bloquea el análisis de resultados de Frente 4 (10% de la nota). El único pendiente que de verdad
   bloquea contenido de la presentación.
2. Pruebas automatizadas (RNF-17) — no existen, solo verificación manual/scripts.
3. Elegir herramienta de gestión de tareas (Jira / Azure Boards / otra) — nunca se decidió, no bloqueó
   el desarrollo pero sigue sin cerrarse.
4. Material visual, guion cronometrado y plan alternativo de la presentación (Frente 4) — pendientes
   de iniciar.

~~Asignar responsables por frente~~ — **Confirmado el 2026-09-25**, ver tabla arriba y
`03-FRENTES_CHECKLIST.md`.

~~Aprobar Next.js vs. Express~~ — **Confirmado el 2026-10-01** por Jean Marco (dueño de Frente 2/3),
para no bloquear el arranque del backend. Ver tabla arriba.

## Cómo actualizar este archivo

Cuando se cierre una decisión: agregar/editar la fila correspondiente con fecha real, marcar el
estado como `Confirmada` (o `Descartada` si se rechaza), y anotar quién la tomó y por qué. Si una
decisión confirmada cambia más adelante, no se borra la fila anterior — se agrega una nueva fila con
la fecha del cambio, para conservar el historial.
