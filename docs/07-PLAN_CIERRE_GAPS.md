# Plan: cerrar gaps de la rúbrica — estadísticas, exportación, comentarista real

> ✅ **RESUELTO — 2026-10-09.** Jorge completó los 3 puntos (estadísticas, exportación,
> comentarista conectado a un LLM real). Jean Marco auditó el resultado y encima mejoró la
> estructura de los documentos exportados (Excel con colores, fix de un bug real del CSV en Excel) e
> hizo una auditoría de UI/UX completa sobre toda la app — ver `05-DECISIONES.md`, filas del
> 2026-10-09. Este documento se conserva como referencia de qué se pidió y por qué, no como tarea
> pendiente.

> Para Jorge. Este documento es autocontenido: no necesitas haber visto la conversación de la que
> salió, solo el código del repo (`backend/` y `frontend/`) y el enunciado/rúbrica del proyecto.

## Por qué existe este documento

Jean Marco auditó el estado actual del proyecto contra el enunciado y la rúbrica del docente (el PDF
"Duelo de inteligencias"). La mayoría de los requisitos ya están sólidamente implementados, pero
quedan 3 gaps concretos que, si no se cierran antes del 9 de octubre, afectan la nota directamente.
Este documento describe esos 3 gaps y cómo cerrarlos, con rutas de archivo exactas.

**Cuando termines cada punto, avisa para que lo auditemos juntos** (con Claude Code) antes de darlo
por cerrado — la idea es repartir la carga, no que cada quien trabaje en una burbuja sin validar.

**Explícitamente fuera de este documento**: el "modo torneo" (ejecutar automáticamente todas las
combinaciones de modelos×niveles) se deja para después, en otro plan aparte. No lo toques aquí.

## Contexto rápido del proyecto (por si no lo tienes fresco)

- Backend: Next.js (Route Handlers) + Prisma + Postgres en Neon, en `backend/`.
- Frontend: Vite + React (sin react-router — toda la navegación es con `useState` en
  `frontend/src/App.tsx`), en `frontend/`.
- No hay backend corriendo en tu máquina por defecto: para probar localmente necesitas `backend/.env`
  con las variables reales (pídeselas a Jean Marco si no las tienes) y correr `npm run dev` dentro de
  `backend/`. El frontend apunta a `http://localhost:3000/api` por defecto (variable
  `VITE_API_BASE_URL`), o puedes apuntarlo a producción si prefieres no correr el backend local.
- Antes de hacer `git push`, revisa `git fetch origin develop` y compara — el equipo pushea seguido a
  `develop` y conviene rebasear en vez de pisar cambios de otros.

---

## Gap 1 — Estadísticas de jugadores (rúbrica ítem 7, 5%)

**Qué pide la rúbrica:** "Muestra estadísticas completas, precisas y actualizadas; aporta valor al
análisis de resultados."

**Qué ya existe (backend, completo, no tocar):**
- `GET /api/statistics` (`backend/app/api/statistics/route.ts`) — acepta query params opcionales
  `participantId` y `difficulty`.
- `backend/lib/game/statistics.ts`, función `computeStatistics()`. Devuelve un arreglo de filas, una
  por cada combinación `participante + dificultad` que haya jugado al menos una partida `finished`:
  ```ts
  export interface StatisticRow {
    participantId: string;
    displayName: string;
    difficulty: "beginner" | "advanced" | "master" | null;
    played: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;           // porcentaje, 0-100
    avgMovesPerWin: number | null; // null si no tiene victorias
  }
  ```
  Nota: las partidas `incident` (incidencia técnica) **no cuentan** aquí a propósito — solo las que
  terminaron de verdad (jaque mate, tablas, etc.).

**Qué falta (todo en frontend):**

1. En `frontend/src/types/api.ts`, agregar el tipo `StatisticRow` (copia la interfaz de arriba).

2. En `frontend/src/services/api/gameApi.ts`, agregar una función para consumir el endpoint (sigue el
   mismo patrón que las demás funciones de ese archivo, usan `apiRequest` de `./apiClient`):
   ```ts
   export function getStatistics(filter?: { participantId?: string; difficulty?: Difficulty }): Promise<StatisticRow[]> {
     const params = new URLSearchParams();
     if (filter?.participantId) params.set("participantId", filter.participantId);
     if (filter?.difficulty) params.set("difficulty", filter.difficulty);
     const query = params.toString();
     return apiRequest<StatisticRow[]>(`/statistics${query ? `?${query}` : ""}`);
   }
   ```

3. Nuevo componente `frontend/src/features/statistics/components/StatisticsView.tsx`:
   - Al montar, llama `getStatistics()` sin filtro (trae todas las filas).
   - Tabla con columnas: Participante | Dificultad | Jugadas | Ganadas | Perdidas | Empatadas |
     % Victorias | Prom. movimientos por victoria (mostrar "—" cuando `avgMovesPerWin` es `null`).
   - Opcional pero recomendable: un `<select>` para filtrar por participante, que vuelva a llamar
     `getStatistics({ participantId })`.
   - Usa el mismo lenguaje visual que el resto de la app — mira `GameResult.tsx` para la paleta de
     colores y clases (`chess-panel`, fondos `#1B130F`/`#241A15`, dorado `#E8B84B`, etc.) y replica el
     estilo, no inventes uno nuevo.
   - Recibe una prop `onClose: () => void` para volver a la pantalla anterior.

4. En `frontend/src/App.tsx`, agregar la forma de llegar a esta vista:
   - Nuevo estado `const [isViewingStatistics, setIsViewingStatistics] = useState(false);`.
   - Un botón "📊 Estadísticas" en el `<header>` (junto al tag "♟ AI CHESS" que ya existe), visible
     siempre, haya o no una partida en curso.
   - Cuando `isViewingStatistics` es `true`, renderizar `<StatisticsView onClose={() => setIsViewingStatistics(false)} />`
     en vez del resto del contenido de `<main>` — sigue el mismo patrón condicional que ya usan
     `isReviewing`/`!game` en ese archivo (no hace falta instalar react-router, el proyecto no lo usa).

---

## Gap 2 — Botón de exportar partida (RF-25)

**Qué ya existe (backend, completo, no tocar):**
`GET /api/games/{id}/export?format=json|csv|pgn` (`backend/app/api/games/[id]/export/route.ts`). Ya
devuelve el archivo con `Content-Disposition: attachment` para CSV/PGN — el navegador lo descarga
solo, no hace falta manejar blobs ni `fetch` manual.

**Qué falta:** un botón/enlace en el frontend que apunte ahí. El lugar correcto es
`frontend/src/features/game/components/GameResult.tsx` (solo se muestra cuando la partida terminó —
es justo el momento en que alguien querría exportarla). Agrega algo como:

```tsx
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

// ...dentro del JSX, junto al botón "Nueva partida" que ya existe:
<div className="flex flex-col gap-2 sm:flex-row">
  <a href={`${API_BASE_URL}/games/${game.id}/export?format=pgn`} target="_blank" rel="noreferrer">
    Descargar PGN
  </a>
  <a href={`${API_BASE_URL}/games/${game.id}/export?format=csv`} target="_blank" rel="noreferrer">
    Descargar CSV
  </a>
  <a href={`${API_BASE_URL}/games/${game.id}/export?format=json`} target="_blank" rel="noreferrer">
    Descargar JSON
  </a>
</div>
```

Estilízalos como botones secundarios (no tan protagonistas como el botón dorado de "Nueva partida" que
ya está ahí) — usa clases consistentes con el resto del archivo.

---

## Gap 3 — Conectar el comentarista con un LLM real (rúbrica ítem 9, 5%)

> ⚠️ **Nota (2026-10-08):** el equipo acaba de reescribir bastante este archivo (commit "agregar
> diccionario y estilos de narración deportiva" — ahora tiene 3 personalidades de narrador y un
> diccionario de frases con plantillas). Lo que sigue ya está actualizado contra esa versión nueva —
> si cuando lo leas el archivo volvió a cambiar, usa los nombres de función/tipo como referencia
> (`createCommentary`, `Commentary.category`), no números de línea.

**El problema:** hoy el "Comentarista IA" (`frontend/src/features/game/components/AiCommentator.tsx`)
narra con **reglas locales y plantillas de texto escritas a mano** (función `createCommentary`, elige
una frase de un diccionario fijo según la categoría de la jugada y el estilo de narrador elegido).
Suena bien y la voz funciona perfecto, pero **no usa ningún LLM real** — y sí existe un endpoint de
backend que sí llama a un LLM (`POST /api/games/{id}/commentary`, en
`backend/app/api/games/[id]/commentary/route.ts`, que usa Groq con el modelo `gpt-oss-120b`, gratis)
que nunca se está llamando desde el frontend. Es una funcionalidad a medio conectar.

**Ya existe y no hay que tocar:**
- `requestAiCommentary(gameId, data)` en `frontend/src/services/api/gameApi.ts` (ya está escrita,
  solo nadie la llama).
- Tipos `AiCommentaryRequest`/`AiCommentaryResponse` en `frontend/src/types/api.ts`.
- El endpoint de backend, ya probado y funcionando.

**Decisión ya tomada (no la cambies sin avisar):** se usa **Groq** (gratis) para esto, no uno de los 3
modelos de pago (Gemini/Claude/GPT-5-nano) — para no competir por presupuesto ni por cuota de
solicitudes con las partidas reales (si Groq se satura, solo se pierde el comentario, nunca la
partida). Por la misma razón (Groq ya se nos agotó una vez bajo carga de pruebas), **no se llama en
cada movimiento**, sino solo en movimientos "notables". Esto también hace mejor comentarismo (un
narrador real no describe con el mismo detalle cada jugada, se enfoca en los momentos importantes).

**Qué hacer, en `AiCommentator.tsx`:**

1. Agrega un campo `source: "heuristic" | "ai"` a la interfaz `Commentary` (default implícito
   `"heuristic"` al crearla en `createCommentary`).

2. **No toques la parte de la voz** (`speakText`, `playLatest`, `stopSpeaking`, la cola de narración)
   — ya está bien afinada y sincronizada; tocarla sin necesidad puede reintroducir bugs que ya se
   arreglaron antes. La voz sigue narrando siempre con el texto de `createCommentary` (heurístico),
   tal cual hoy.

3. En el efecto `// Detectar nuevas jugadas.` (busca ese comentario — es el que llama a
   `createCommentary(...)` y luego `setComments(...)` + `playLatest()`), justo después de hacer
   `setComments(...)`, revisa si `commentary.category` es "notable" — usa el mismo criterio que ya
   existe en `createCommentary` para `isCritical` (`capture`, `check`, `checkmate`, `promotion`) y
   agrégale `castle` (el enroque también es un momento que vale la pena narrar con el LLM real). Si lo
   es, dispara en segundo plano (sin `await`, no debe bloquear nada):
   ```ts
   const NOTABLE_CATEGORIES: MoveCategory[] = ["capture", "check", "checkmate", "promotion", "castle"];

   // ...dentro del efecto, después de setComments(...):
   if (NOTABLE_CATEGORIES.includes(commentary.category) && game.lastMove) {
     void requestAiCommentary(game.id, {
       fen: game.fen,
       moveNumber: game.moveCount,
       lastMove: game.lastMove,
     })
       .then(({ commentary: aiText }) => {
         setComments((current) =>
           current.map((c) =>
             c.id === commentary.id ? { ...c, message: aiText, source: "ai" } : c,
           ),
         );
       })
       .catch(() => {
         // Si Groq falla o se satura, se queda el texto heurístico — igual
         // que ya hace loadMoves en este mismo archivo (catch silencioso).
       });
   }
   ```
   No hace falta importar nada nuevo salvo `requestAiCommentary` desde
   `"../../../services/api/gameApi"` (ya existe esa función, revisa el import que ya tiene el archivo
   de `getMoves` en la línea 3 para seguir el mismo patrón de ruta relativa).

4. En el render de cada tarjeta de comentario (busca el `<article>` donde se muestra
   `CATEGORY_LABELS[comment.category]`), agrega una badge pequeña junto a esa: algo como `✨ IA` cuando
   `comment.source === "ai"`. Así en la demo se puede señalar explícitamente "esto lo generó un LLM
   real", que es justo lo que falta demostrar.

5. Revisa también el efecto `// Reiniciar cuando cambia la partida.` (resetea `comments`/`moves` al
   cambiar de partida) — no necesita cambios, solo asegúrate de que tu lógica nueva no dependa de
   estado que ese efecto limpia sin que lo contemples.

---

## Verificación antes de avisar que terminaste

1. `cd frontend && npm run build && npm run lint` — debe quedar limpio, sin errores nuevos.
2. Prueba visual real en el navegador (esto es importante — nadie en el equipo la ha hecho aún para
   estos cambios):
   - Abre la vista de estadísticas sin partida activa y con una partida activa, confirma que carga
     datos reales.
   - Termina una partida y prueba los 3 botones de descarga (PGN/CSV/JSON) — confirma que de verdad
     se descargan y que el contenido tiene sentido.
   - Juega una partida con capturas/jaques y confirma que después de un ratito el comentario de esa
     jugada cambia de texto (de heurístico a IA) y aparece la badge "✨ IA". Si Groq tarda o falla, no
     debería romper nada — el comentario se queda con el texto de siempre.
3. Antes de hacer push: `git fetch origin develop` y revisa si hay commits nuevos de otros antes de
   pushear, por si hay que rebasear primero.

Cuando termines los 3 puntos, dile a Jean Marco para auditar juntos (con Claude Code) y ver si algo
quedó incompleto o hay que ajustar algo contra la rúbrica.
