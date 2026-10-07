# Backend — Duelo de Inteligencias

API del proyecto (Frente 2: orquestador de LLMs + Frente 3: backend, persistencia y motor de
torneo). No tiene interfaz propia — ver `frontend/` para la UI, que la consume por HTTP.

## Stack

Next.js (App Router, Route Handlers) + Prisma + Neon (Postgres) + `chess.js`. Decisión registrada
en `../docs/05-DECISIONES.md` (2026-10-01).

## Setup local

1. Copiar `.env.example` a `.env` y completar (usamos `.env`, no `.env.local`, para que
   tanto Next.js como el CLI de Prisma lo lean sin configuración extra):
   - `DATABASE_URL`: cadena de conexión de un proyecto en [Neon](https://neon.tech).
   - `GEMINI_API_KEY`, `MISTRAL_API_KEY`, `GROQ_API_KEY`: ver `../docs/04-MODELOS_PENDIENTE.md`.
2. Instalar dependencias: `npm install`
3. Generar el cliente de Prisma y aplicar el schema:
   ```
   npx prisma generate
   npm run db:migrate
   npm run db:seed
   ```
4. Levantar el servidor: `npm run dev` (por defecto en `http://localhost:3001` si el frontend ya
   usa el 3000/5173 — ajustar con `-- -p 3001` si hace falta).

## Backend desplegado (para el equipo)

Ya está desplegado en Vercel, conectado al Neon compartido del proyecto — no hace falta correrlo
local para probar el frontend contra datos reales:

```
https://duelo-inteligencias-backend.vercel.app
```

Para que tu frontend local lo use, en `frontend/.env.local`:

```
VITE_API_BASE_URL=https://duelo-inteligencias-backend.vercel.app/api
```

Notas:
- CORS solo permite `http://localhost:5173` por ahora (el puerto por defecto de Vite). Si corres el
  frontend en otro puerto, avisa a Jean Marco para agregarlo a `FRONTEND_ORIGINS` en Vercel.
- `MISTRAL_API_KEY` todavía no está configurada (ver `../docs/04-MODELOS_PENDIENTE.md`) — elegir
  Mistral como rival IA fallará hasta que se resuelva.
- Cada `git push` a `develop`/ramas de feature **no** redespliega automáticamente todavía — los
  despliegues a este dominio se hacen manualmente con `vercel --prod` desde `backend/`. Si necesitas
  una versión nueva ahí, pide que se redespliegue.

## Contrato con el frontend

Implementa exactamente los mismos endpoints y formas de respuesta que
`frontend/mock-api` (ver `frontend/src/types/api.ts`), para que Frente 1 solo necesite cambiar
`VITE_API_BASE_URL` cuando este backend esté listo — sin tocar su código.

## Estructura

- `app/api/**/route.ts` — endpoints HTTP.
- `lib/chess/engine.ts` — motor de reglas (envoltorio de `chess.js`), única fuente de verdad de
  legalidad de movimientos (RNF-06, RNF-11).
- `lib/adapters/` — contrato común de IA y las 3 implementaciones (Google, Mistral, Groq/OpenAI).
  No se debe llamar a un SDK de proveedor fuera de esta capa (ver `../CLAUDE.md`).
- `lib/game/` — orquestación de partidas, estadísticas y serialización hacia el contrato del
  frontend.
- `prisma/schema.prisma` — modelo de datos (ver `../docs/01-ARQUITECTURA.md`).
- `prisma/seed.ts` — siembra los 4 participantes fijos (humano + 3 modelos).

## Variables de entorno en Vercel

Configurar las mismas claves de `.env.example` como variables de entorno del proyecto en Vercel
(nunca en el repo) — ver `RNF-08`/`RNF-09` en `../docs/02-REQUISITOS.md`.
