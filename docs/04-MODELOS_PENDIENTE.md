# Modelos de IA — pendiente de definir y validar

> Esta es la **mayor incertidumbre del proyecto**. Ningún modelo debe darse por definitivo hasta
> comprobar disponibilidad gratuita real y una prueba de movimientos procesables. Los planes
> gratuitos y modelos disponibles cambian con frecuencia — no confiar en información antigua.

## Investigación web — 2026-09-25 (Claude Code)

Se validó por búsqueda web el estado actual de los 3 candidatos originales. **Resultado: DeepSeek
ya no es viable** — se propone un reemplazo. Estado por candidato:

| Empresa | Modelo | Tier gratuito | Tarjeta | Rate limits | Salida estructurada / function calling | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| Google | Gemini 2.5 Flash (Developer API / AI Studio) | Vigente | No requerida | ~10 RPM / 250 req-día (Flash); ~15 RPM / 1000 req-día (Flash-Lite); 250k TPM compartido | **Sí** — JSON Schema nativo (`responseSchema`) + function calling | Verificado por búsqueda web — 2026-09-25. Falta prueba real de 10 movimientos |
| Mistral AI | `mistral-small-latest` | Vigente (tier "Experiment") | No requerida para empezar | No publicados con precisión pública; revisar consola del equipo | **Sí** — function calling y modo JSON en Small/Large | Verificado por búsqueda web — 2026-09-25. Falta confirmar RPM exacto desde consola y prueba real de 10 movimientos |
| ~~DeepSeek~~ | ~~DeepSeek R1/V3 vía OpenRouter~~ | **No viable desde julio 2026** | — | — | — | **Descartado** — todos los modelos DeepSeek en OpenRouter pasaron a solo-pago (desaparecieron las variantes `:free`) |
| **OpenAI (reemplazo)** | `gpt-oss-120b` (o `gpt-oss-20b`) vía Groq (`api.groq.com`) | Vigente | No requerida | ~30 RPM / hasta 1000 req-día según modelo; TPM 6k-20k según modelo | **Sí** — tool/function calling completo estilo OpenAI | Verificado por búsqueda web — 2026-09-25. Falta prueba real de 10 movimientos |

**Combinación final propuesta:** Google (Gemini 2.5 Flash) + Mistral AI (`mistral-small-latest`) +
OpenAI (`gpt-oss-120b` vía Groq). Tres empresas creadoras distintas (Google, Mistral AI, OpenAI),
las tres con tier gratuito sin tarjeta y con soporte de salida estructurada/function calling —
crítico para RF-14 (parsear la jugada sin depender de texto libre).

**Por qué Groq resuelve la ambigüedad Groq-vs-Meta del documento original:** al usar `gpt-oss`
(modelo open-weight creado por **OpenAI**) en vez de un Llama de Meta, la empresa creadora relevante
para RN-03 es OpenAI, que ya es distinta de Google y Mistral AI — no depende de si "la empresa" es
el host (Groq) o el creador del modelo.

**Vercel (Pro, ya en uso) y Neon (free) — actualizado 2026-09-25:**
- El equipo ya usa **Vercel Pro ($20/mes)**, no Hobby. Con Pro (Fluid Compute, default actual) el
  timeout de función sube a 300s por defecto y hasta 800s configurable — muy por encima de lo que
  tarda cualquier llamada a Gemini/Mistral/`gpt-oss`, incluso con reintentos. **El riesgo de que la
  plataforma corte una jugada de IA a medias queda neutralizado.**
  Sigue siendo buena práctica fijar un **timeout interno propio** (~8-10s por intento de IA),
  independiente del límite de Vercel — no para evitar que la plataforma mate la función, sino porque
  RNF-05 (avisar "esperando" tras 1s) y RF-15/16 (reintentos y pausa por incidencia sin colgar la
  partida) necesitan que el propio código decida cuándo algo tardó demasiado, en vez de esperar a que
  Vercel corte a los 300s.
- Neon sigue en **free tier**: 100 compute-hours/mes, 0.5 GB storage, 1 proyecto, *scale-to-zero*
  obligatorio con cold start de ~300–500ms. **Riesgo vigente:** el cold start puede consumir por sí
  solo buena parte del presupuesto de RNF-04 (<500ms) en el primer movimiento tras inactividad —
  mitigar con un "warm-up" (query trivial) al cargar la pantalla de configuración de partida.
- **Conclusión:** con Vercel Pro + Neon free, el proyecto queda cómodo en cómputo/timeout; el único
  límite real a diseñar alrededor es el cold start de Neon.

## Prueba real de 10 movimientos — 2026-10-01 (Jean Marco + Claude Code)

Ejecutada contra la API real de cada proveedor, con claves reales, usando el adaptador del backend
(`backend/scripts/test-ten-moves.ts`). Resultado:

| Modelo | Resultado | Notas |
| --- | --- | --- |
| **OpenAI `gpt-oss-120b` vía Groq** | ✅ **10/10 movimientos legales** | Partida real y coherente (Petroff: 1.e4 Nf6 2.Nf3 Nxe4 3.Be2 Nf6 4.Bc4 Nc6 5.O-O d5). Solo 2 reintentos transitorios por servicio no disponible. **Pasa la prueba de viabilidad.** |
| **Google Gemini** | ⚠️ **1/10** en el primer intento, luego cuota agotada | La key funciona y el primer movimiento salió perfecto con `responseSchema` (JSON estructurado: `{"from":"e2","to":"e4"}`). Pero a partir del 2º-3er intento, **todas** las llamadas devolvieron `429 RESOURCE_EXHAUSTED` ("Límite de cuota alcanzado"), incluso espaciando los reintentos 10s y usando un timeout de reintento de 5s adicional entre jugadas — no se recuperó durante la sesión de prueba (~5 minutos), lo que sugiere un **tope diario**, no solo por-minuto, agotado entre nuestras propias pruebas repetidas. **No pasa la prueba todavía** — repetir con mucho más espaciamiento (o al día siguiente) antes de dar por buena esta cuota para una demo real. |
| **Mistral AI** | ❌ Bloqueado, sin probar | La consola ("Mistral Studio") no deja generar una API key en el plan gratuito sin "Upgrade". Investigación adicional sugiere que esto podría ser simplemente **activar el plan "Experiment" (gratis, sin tarjeta) en la sección de Billing**, no necesariamente un plan de pago — el botón "Upgrade" en la pantalla de keys es ambiguo. **Pendiente de que alguien del equipo revise Billing → seleccionar plan "Experiment"** antes de descartar Mistral definitivamente. |

**Dos bugs reales encontrados y corregidos en el backend durante esta prueba** (no son problema de los
proveedores):
1. `gemini-2.5-flash` ya no existe para cuentas nuevas (Google lo retiró) — el adaptador se actualizó
   a `gemini-3.8-flash`.
2. El límite de tokens de salida (`maxOutputTokens: 200` para "principiante") era insuficiente para
   modelos de razonamiento como `gpt-oss`: gastan tokens pensando antes de llamar a la función, y si
   se quedan sin tokens, el proveedor rechaza la respuesta ("model did not call a tool"). Se subieron
   los límites a 600/900/1200 según nivel.

**Conclusión parcial:** con Groq confirmado al 100%, el proyecto **ya tiene al menos un modelo
production-ready**. Gemini necesita una prueba más paciente (hay evidencia de que funciona, solo falta
confirmar que la cuota diaria alcanza para una partida real sin ráfagas de pruebas). Mistral sigue
bloqueado en la consola — revisar Billing antes de la próxima sesión.

## Candidatos propuestos (histórico — ver tabla de investigación arriba para el estado vigente)

| Empresa | Modelo candidato | Acceso propuesto | Condición a verificar |
| --- | --- | --- | --- |
| Google | Gemini Flash (versión disponible en el nivel gratuito) | Gemini Developer API directa | Nivel gratuito documentado oficialmente por Google, rate limits exactos |
| Mistral AI | `mistral-small-latest` o sucesor en modo gratuito | Mistral API directa | Acceso sin tarjeta en modo gratuito, límites de requests por minuto |
| ~~DeepSeek~~ | ~~DeepSeek R1 u otro modelo marcado como "free"~~ | ~~OpenRouter (agregador)~~ | **Descartado 2026-09-25** — ver investigación arriba. Reemplazado por OpenAI `gpt-oss` vía Groq |

El requisito de "empresas distintas" se cumple por la **empresa creadora del modelo**, no por usar
nombres de modelo distintos del mismo proveedor. Ejemplo: dos modelos servidos por OpenRouter pero
creados por la misma empresa NO cuentan como empresas distintas.

## Qué debe comprobarse por cada modelo antes de aprobarlo

| Dato | Criterio de completitud |
|---|---|
| Empresa creadora | Fuente oficial que confirme que las tres empresas son distintas |
| Modelo exacto | Identificador usado en la API y versión observada en la respuesta |
| Proveedor | API directa o intermediario utilizado (ej. OpenRouter) |
| Condición gratuita | Cuota, límite de requests, si pide tarjeta, y fecha de verificación |
| Autenticación | Clave creada y guardada **solo** en el backend |
| Formato | Ejemplo real de solicitud y de respuesta observada |
| Prueba de viabilidad | 10 turnos legales consecutivos, o incidencias documentadas si falla |
| Alternativa de respaldo | Sustituto de otra empresa distinta, listo por si el modelo principal falla |

## Plan de sustitución
Si un modelo deja de estar disponible (cambia su política gratuita, se satura, etc.), se reemplaza
por un modelo gratuito de **otra empresa** que mantenga las tres empresas distintas. El cambio debe
actualizar: configuración, evidencia de empresa, casos de prueba y diapositivas de la presentación.

## Definición pendiente de los niveles de dificultad (por modelo)

| Parámetro | Principiante | Avanzado | Maestro |
|---|---|---|---|
| Contexto enviado | Por definir y probar | Por definir y probar | Por definir y probar |
| Temperatura | Por definir según la API de cada proveedor | — | — |
| Tokens de salida | Baja | Media | Mayor, dentro de cuota |
| Tiempo máximo de espera | Por definir | Por definir | Por definir |
| Enfoque del prompt | Decisión rápida | Análisis moderado | Comparar candidatos antes de decidir |
| Evidencia | Prueba piloto pendiente | Prueba piloto pendiente | Prueba piloto pendiente |

No se debe afirmar que un LLM alcanza fuerza equivalente a un maestro de ajedrez real — son etiquetas
internas de configuración. La rúbrica pide diferencia *observable*, respaldada con evidencia de las
pruebas piloto.

## Alternativa de respaldo (actualizada 2026-09-25)

**Groq** (empresa de hardware LPU — no confundir con Grok de xAI) ya **no es un cuarto candidato de
respaldo**: pasó a ser el acceso elegido para el tercer modelo (`gpt-oss-120b`/`gpt-oss-20b`,
creados por **OpenAI**), en reemplazo de DeepSeek — ver tabla de investigación arriba. La ambigüedad
original (¿la "empresa" es Groq o Meta?) queda resuelta al usar un modelo de OpenAI en vez de un
Llama de Meta: la empresa creadora relevante para RN-03 es OpenAI, sin depender de cómo se interprete
el rol del host.

Si en el futuro `gpt-oss` vía Groq dejara de ser viable, el siguiente respaldo a evaluar sería un
modelo Llama (Meta) también vía Groq — ahí sí persistiría la duda Groq-vs-Meta y habría que
resolverla con el docente antes de depender de esa opción.

## Checklist de esta decisión
- [ ] Prueba de conexión + 10 movimientos legales ejecutada para Google/Gemini — 1/10 el 2026-10-01, repetir con más espaciamiento
- [ ] Prueba de conexión + 10 movimientos legales ejecutada para Mistral AI — bloqueado en consola, ver arriba
- [x] Prueba de conexión + 10 movimientos legales ejecutada para OpenAI `gpt-oss` vía Groq — 10/10 el 2026-10-01
- [x] Confirmado que las tres empresas creadoras son distintas entre sí (Google, Mistral AI, OpenAI)
- [x] Condición gratuita de cada una documentada con fecha de verificación
- [x] Alternativa de respaldo identificada para al menos un modelo (Groq ya es el respaldo usado de DeepSeek)
- [ ] Parámetros de los 3 niveles de dificultad definidos y probados por modelo
- [ ] Decisión final registrada en `05-DECISIONES.md`, con fecha y responsable — queda `Propuesta` hasta cerrar Gemini y Mistral
