# Resultados del torneo reducido — comparativa entre los 3 modelos

> Para Gabriel (y cualquiera armando la presentación). Este documento es autocontenido: trae las
> métricas, los IDs de partida reales y las observaciones ya interpretadas, listas para copiar a
> slides. No hace falta tocar la base de datos ni correr nada para usarlo.

## Qué es esto y por qué existe

El "modo torneo" completo (barrido combinatorio de 3 modelos × 3 niveles × 3 niveles = 81 cruces de
bando) quedó fuera de alcance por tiempo. En su lugar, el 2026-10-09 se corrió un **torneo reducido**:
cada uno de los 3 modelos de IA jugó contra cada uno de los otros dos, una vez por color, en un único
nivel fijo (`advanced`). Con 3 modelos eso son 6 partidas por ronda — se corrieron **2 rondas (12
partidas en total)** para tener más de un dato por enfrentamiento.

Decisión de diseño (ver `05-DECISIONES.md`): no se filtró ni se limpió nada en la base de datos. La
vista de Estadísticas de la app sigue mostrando todo el historial (incluyendo partidas de prueba
manuales de desarrollo). **Para la comparativa real, usa solo los 12 IDs de partida de este
documento** — son datos limpios, generados en una sola sesión controlada, mismo nivel para ambos
bandos en cada partida.

Las partidas se jugaron con `backend/scripts/tournament.ts` contra la API real (no contra los
adaptadores directamente), así que cada una es un `Game` normal en Neon: se puede abrir, revisar
jugada por jugada y exportar (Excel/CSV/JSON/PGN) desde la UI como cualquier otra.

## Resultado principal

| Modelo (empresa) | Partidas jugadas | Ganadas | Perdidas | Empatadas | Incidencias técnicas | % incidencia |
|---|---|---|---|---|---|---|
| **Gemini 3.8 Flash** (Google) | 8 | **3** | 0 | 0 | 5 | 62.5% |
| **Claude Haiku 4.5** (Anthropic) | 8 | 0 | **3** | 0 | 5 | 62.5% |
| **GPT-5 Nano** (OpenAI) | 8 | 0 | 0 | 0 | **8** | **100%** |

- De las 12 partidas, **solo 3 terminaron con un resultado deportivo** (jaque mate) — las otras 9
  terminaron en incidencia técnica (RN-08/RN-09: no cuentan como derrota, se registran aparte).
- **Gemini 3.8 Flash ganó las 3 partidas decisivas que se jugaron**, siempre contra Claude Haiku, con
  ambos colores (47 y 39 jugadas con blancas, 38 jugadas con negras). Invicto en el torneo.
- **GPT-5 Nano no logró terminar ni una sola de sus 8 partidas.**

## Observación clave: la confiabilidad también es un resultado

Esto no es un accidente de la prueba — es, en sí mismo, el hallazgo más fuerte del torneo, y vale la
pena presentarlo como tal en vez de ocultarlo:

- **GPT-5 Nano es un modelo de razonamiento**: antes de responder, "piensa" usando un presupuesto de
  tokens interno que no es visible ni fijo. Bajo la obligación de llamar siempre a una función
  (necesaria para que el backend pueda interpretar su jugada), ese presupuesto a veces se agota antes
  de que el modelo llegue a emitir la jugada.
- Se probó **subir el presupuesto de tokens** (de 1500 a 3000) para darle más margen: no ayudó, solo
  cambió el síntoma — el modelo empezó a tardar 27-34 segundos por jugada y a agotar el límite de
  tiempo de la solicitud en vez de fallar por no responder.
- Se probó también **subir el límite de tiempo** junto con el presupuesto (hasta 35s): tampoco
  convergió — la latencia sigue creciendo con la complejidad de la posición, sin un techo predecible.
- Conclusión técnica: no es un bug de nuestro adaptador (el `tool_choice: "required"` ya estaba bien
  configurado desde el inicio) ni una configuración mal puesta — es una característica real de cómo
  GPT-5 Nano reparte su presupuesto de razonamiento, que no se puede ajustar con un número. Gemini y
  Claude no tienen este problema porque no son modelos de razonamiento con este patrón.
- Esto es un punto de comparación legítimo entre los 3 proveedores, además del ganar/perder: **la
  confiabilidad bajo las mismas condiciones también varía fuertemente entre empresas**, y es
  relevante para cualquier conclusión sobre "qué modelo conviene usar" en una tarea de este tipo.

La causa secundaria de incidencias (1 de las 9) fue un comportamiento ya conocido de Claude Haiku:
repitió la misma jugada ilegal 3 veces seguidas pese a recibir retroalimentación explícita de que no
la repitiera, agotando el presupuesto de reintentos (RF-15).

## IDs de partida (las 12 del torneo limpio)

Ábrelas desde la UI (Revisor de partida) o expórtalas (botón Excel/CSV/JSON/PGN) para capturas o
datos de detalle en las slides.

| # | Blancas | Negras | Resultado | Jugadas | ID |
|---|---|---|---|---|---|
| 1 | gemini-flash | claude-haiku | Ganan blancas (jaque mate) | 47 | `cmv0lwr7q00018of9wmf5c8qh` |
| 2 | gemini-flash | gpt-5-nano | Incidencia técnica | 19 | `cmv0m28z3005b8of9k2geixlh` |
| 3 | claude-haiku | gemini-flash | Incidencia técnica | 28 | `cmv0m7bg4007x8of9uptym0y2` |
| 4 | claude-haiku | gpt-5-nano | Incidencia técnica | 38 | `cmv0maqyi00b98of92m8dfqdo` |
| 5 | gpt-5-nano | gemini-flash | Incidencia técnica | 24 | `cmv0mi6h000fx8of9sriq2tzn` |
| 6 | gpt-5-nano | claude-haiku | Incidencia técnica | 32 | `cmv0mnbt500j18of9b7rzizw3` |
| 7 | gemini-flash | claude-haiku | Ganan blancas (jaque mate) | 39 | `cmv0nfofk00018od4rq3lgik9` |
| 8 | gemini-flash | gpt-5-nano | Incidencia técnica | 1 | `cmv0njxyf004f8od47gpt6ha2` |
| 9 | claude-haiku | gemini-flash | Ganan negras (jaque mate) | 38 | `cmv0nlgp3004r8od435obvea2` |
| 10 | claude-haiku | gpt-5-nano | Incidencia técnica | 23 | `cmv0nq21p00918od4nzdej363` |
| 11 | gpt-5-nano | gemini-flash | Incidencia técnica | 14 | `cmv0nug8y00bz8od4oe1cpf2d` |
| 12 | gpt-5-nano | claude-haiku | Incidencia técnica | 10 | `cmv0o5k5700018onajwzf7mwo` |

Todas jugadas en nivel `advanced` para ambos bandos, misma sesión (2026-10-09).

## Cómo correr más partidas si hace falta

```bash
cd backend
npm run dev                 # en una terminal, con las API keys configuradas
npx tsx scripts/tournament.ts   # en otra terminal
```

Variables opcionales: `DIFFICULTY` (beginner | advanced | master, default `advanced`),
`MOVE_DELAY_MS` (pausa entre jugadas, default 1200), `BASE_URL` (default `http://localhost:3000`).
El script imprime un resumen por modelo y la lista de IDs al final — guárdalos igual que en la tabla
de arriba si se corre una ronda nueva para la demo.

## Ideas para la sección de análisis (Frente 4)

- Slide de resultado: la tabla de la sección "Resultado principal" tal cual, es autoexplicativa.
- Slide de confiabilidad: usar la observación de GPT-5 Nano como ejemplo de que "elegir un LLM" no es
  solo comparar quién juega mejor ajedrez, sino también quién responde de forma confiable bajo
  restricciones de formato — relevante para cualquier producto real que dependa de function calling.
- Si da tiempo de aquí a la presentación, correr 1-2 rondas más (mismo comando) solo ayuda a tener más
  partidas decisivas de Gemini vs Claude Haiku para reforzar el "invicto"; no va a cambiar el
  diagnóstico de GPT-5 Nano, que ya está confirmado con 8/8 intentos fallidos.
