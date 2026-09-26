# CLAUDE.md

Contexto para Claude Code en el repositorio del proyecto **Duelo de Inteligencias** (curso
Inteligencia Artificial, UVG, 2026 II). Léelo junto con los documentos en `/docs`:

- `docs/00-CONTEXTO_PROYECTO.md` — qué es el proyecto, objetivos, alcance, restricciones y rúbrica.
- `docs/01-ARQUITECTURA.md` — stack técnico, arquitectura, modelo de datos, contrato de adaptadores.
- `docs/02-REQUISITOS.md` — requisitos funcionales, no funcionales y reglas de negocio (RF/RNF/RN).
- `docs/03-FRENTES_CHECKLIST.md` — los 4 frentes de trabajo del equipo, con checklist por requisito.
- `docs/04-MODELOS_PENDIENTE.md` — qué falta cerrar sobre los 3 modelos de IA a utilizar.
- `docs/05-DECISIONES.md` — bitácora de qué está confirmado, propuesto o pendiente.

## Resumen de una línea

Aplicación web desplegada en Vercel (base de datos en Neon) para enfrentar humanos e IA (3 modelos de
empresas distintas) en partidas de ajedrez, con validación de reglas, estadísticas comparables y un
modo de ejecución masiva de todas las combinaciones posibles, para un curso universitario con
presentación el 9 de octubre de 2026.

## Reglas de negocio que NUNCA deben romperse

- El backend es la única autoridad de la posición del tablero; el frontend nunca decide si un
  movimiento es válido, y nunca llama directamente a un proveedor de IA.
- Los tres modelos comparados deben ser de tres empresas distintas (no solo tres nombres de modelo
  distintos del mismo proveedor). Ver `docs/04-MODELOS_PENDIENTE.md`.
- Un intento de movimiento inválido no debe consumir turno, alterar el tablero, ni tumbar la partida.
- Las claves de API y la cadena de conexión de Neon viven solo en variables de entorno del proyecto
  en Vercel (o `.env.local` en desarrollo) — nunca en el frontend, el repositorio, logs o capturas.
- Las partidas terminadas por incidencia técnica (fallo de red, cuota agotada, etc.) no cuentan como
  derrota deportiva — se registran aparte.

## Convenciones de código (mientras el equipo no defina otras)

- TypeScript en todo el proyecto (frontend y backend).
- Nombres de archivos y variables en inglés; contenido visible al usuario (UI, mensajes, docs) en
  español.
- Cada proveedor de IA se integra detrás de la interfaz de adaptador común descrita en
  `docs/01-ARQUITECTURA.md` — no llamadas directas a un SDK de proveedor fuera de esa capa.
- Nada de lógica de reglas de ajedrez fuera de la capa de motor (usar `chess.js`, no reimplementar
  reglas a mano en el frontend ni en los adaptadores de IA).

## Encargo inicial para esta sesión

El equipo ya tiene la documentación de análisis, requisitos y arquitectura (ver `/docs`), pero **aún
no ha empezado a programar**. Antes de escribir código, necesito que hagas lo siguiente:

1. **Lee todos los documentos de `/docs`** para tener el contexto completo del proyecto.
2. **Investiga y valida los 3 modelos de IA candidatos** (`docs/04-MODELOS_PENDIENTE.md`): confirma
   con la información que tengas disponible (o señalando qué no puedes verificar sin acceso a
   Internet) si Google Gemini, Mistral AI y DeepSeek (vía OpenRouter) siguen siendo una combinación
   viable de tres empresas distintas con capa gratuita, y qué riesgos ves en cada uno. Si detectas que
   alguno ya no es viable, propone una alternativa concreta de otra empresa.
3. **Revisa la arquitectura propuesta** (`docs/01-ARQUITECTURA.md`) y señala cualquier riesgo técnico,
   inconsistencia o simplificación que recomiendes antes de empezar a construir.
4. **Genera un plan de ejecución** desde hoy hasta el 8 de octubre de 2026 (fecha interna de cierre),
   con tareas concretas por semana.
5. **Distribuye las tareas del plan entre los 4 frentes** definidos en `docs/03-FRENTES_CHECKLIST.md`
   (Tablero y experiencia visual / Orquestador de LLMs / Backend, persistencia y motor de torneo /
   Funcionalidad adicional, análisis y presentación), respetando las dependencias entre frentes que ya
   se identificaron ahí.
6. **Señala explícitamente** qué decisiones de `docs/05-DECISIONES.md` siguen en estado "Propuesta" o
   "Pendiente" y bloquean el arranque de cada frente, para que el equipo las cierre primero.

Entrega el resultado como un plan claro y accionable, no como código todavía — el objetivo de esta
sesión es investigación y planificación, no implementación.
