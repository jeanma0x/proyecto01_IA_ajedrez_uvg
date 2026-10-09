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

Las 12 partidas del torneo se jugaron en nivel `advanced` para ambos bandos (ver más abajo por qué
ese nivel específicamente es importante para interpretar bien este resultado).

| Modelo (empresa) | Partidas jugadas | Ganadas | Perdidas | Empatadas | Incidencias técnicas | % incidencia |
|---|---|---|---|---|---|---|
| **Gemini 3.8 Flash** (Google) | 8 | **3** | 0 | 0 | 5 | 62.5% |
| **Claude Haiku 4.5** (Anthropic) | 8 | 0 | **3** | 0 | 5 | 62.5% |
| **GPT-5 Nano** (OpenAI) | 8 | 0 | 0 | 0 | **8** | **100%** (solo en nivel `advanced` — ver precisión abajo) |

- De las 12 partidas, **solo 3 terminaron con un resultado deportivo** (jaque mate) — las otras 9
  terminaron en incidencia técnica (RN-08/RN-09: no cuentan como derrota, se registran aparte).
- **Gemini 3.8 Flash ganó las 3 partidas decisivas que se jugaron**, siempre contra Claude Haiku, con
  ambos colores (47 y 39 jugadas con blancas, 38 jugadas con negras). Invicto en el torneo.
- **GPT-5 Nano no logró terminar ni una sola de sus 8 partidas en `advanced`** — pero sí fue
  perfectamente confiable en `beginner` (4/4, ver la sección de precisión más abajo). No es que el
  modelo "no sirva", es que el nivel `advanced`/`master` lo hace fallar.

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

## Precisión importante: el problema de GPT-5 Nano es solo en `advanced`/`master`

Después del torneo se hizo una verificación adicional específicamente para separar "el modelo falla
siempre" de "el modelo falla bajo cierta condición". Se corrieron 4 partidas más de GPT-5 Nano (contra
los otros dos modelos, ambos colores) pero en nivel **`beginner`** en vez de `advanced`:

| Partida (nivel `beginner`) | Resultado | Jugadas | ID |
|---|---|---|---|
| gemini-flash vs gpt-5-nano | Ganan blancas (jaque mate) | 31 | `cmv13z88200018okkaghfjm2v` |
| claude-haiku vs gpt-5-nano | Tablas (material insuficiente) | 155 | `cmv144li2003n8okk1yymrqlo` |
| gpt-5-nano vs gemini-flash | Ganan negras (jaque mate) | 32 | `cmv14ozgi00l98okkya4w60g9` |
| gpt-5-nano vs claude-haiku | Ganan negras (jaque mate) | 26 | `cmv14szo300ox8okknoww7jsi` |

**4 de 4 terminaron sin ninguna incidencia** — contraste total con el 8/8 fallido en `advanced`.

La causa probable: el prompt de cada nivel le da una instrucción distinta (ver
`backend/lib/adapters/prompt.ts`). `beginner` dice *"Elige rápidamente una jugada legal razonable. No
expliques tu razonamiento."*; `advanced` dice *"Analiza brevemente la posición antes de decidir tu
jugada."* — para un modelo de razonamiento como GPT-5 Nano, esa instrucción de "analizar" parece
empujarlo a gastar más tokens de razonamiento interno de los que el presupuesto permite, justo el
problema que se vio en el torneo. En `beginner` la instrucción lo mantiene corto y el modelo responde
de forma confiable.

**Conclusión revisada, más útil que "GPT-5 Nano no sirve"**: GPT-5 Nano es confiable en `beginner`
(consistente con las pruebas manuales que el equipo ya había hecho en la UI) pero no en
`advanced`/`master`, donde la instrucción de "analizar" lo lleva a agotar su presupuesto de
razonamiento. Esto es en sí un dato interesante para el análisis: la confiabilidad de un modelo de
razonamiento puede depender de qué tan exigente sea la instrucción que se le da, no solo del modelo en
sí. **Para la demo en vivo de esta noche: si alguien elige GPT-5 Nano, usar nivel `beginner` para
evitar el riesgo de incidencia.**

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
- Slide de confiabilidad: GPT-5 Nano 8/8 fallido en `advanced` vs. 4/4 exitoso en `beginner` es un
  mejor dato que "el modelo falla" — muestra que la confiabilidad de un modelo de razonamiento puede
  depender de qué tan exigente sea la instrucción, no solo del modelo en sí. Relevante para cualquier
  producto real que dependa de function calling con modelos de razonamiento.
- Si da tiempo de aquí a la presentación, correr 1-2 rondas más (mismo comando) solo ayuda a tener más
  partidas decisivas de Gemini vs Claude Haiku para reforzar el "invicto"; no va a cambiar el
  diagnóstico de GPT-5 Nano en `advanced`, que ya está confirmado con 8/8 intentos fallidos.
- **Para la demo en vivo**: si alguien va a elegir GPT-5 Nano frente al docente, usar nivel
  `beginner` — es el único nivel confirmado confiable para ese modelo.
