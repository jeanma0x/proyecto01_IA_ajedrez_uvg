# Contexto del proyecto — Duelo de Inteligencias

## Origen

Proyecto del curso **Inteligencia Artificial** (UVG, 2026 II), asignado por el docente Carlos Valdez.
Presentación oficial: **viernes 9 de octubre de 2026, 18:15–21:15, virtual**.
Fecha interna de cierre recomendada: **jueves 8 de octubre de 2026**.

## Equipo

- Jorge Luis de la Roza Zamora
- Jean Marco Portillo Ordoñez
- Imri Gabriel Contreras Bautista
- José Julián Amado García

## Qué hay que construir

Un software que permita enfrentar diferentes inteligencias —humanas o artificiales— en una partida
de ajedrez bajo reglas convencionales, y comparar el desempeño de tres modelos de IA de empresas
distintas.

## Objetivo general

Implementar un software que permita enfrentar diferentes inteligencias (humanas o artificiales) en
una partida de ajedrez.

## Objetivos específicos

1. Probar el funcionamiento del software en diferentes escenarios de enfrentamiento.
2. Evaluar distintos modelos para determinar cuál presenta el mejor desempeño como jugador de ajedrez.
3. Realizar una presentación clara, estructurada, concisa y entretenida que muestre el funcionamiento
   del programa y los resultados obtenidos en las pruebas.

## Alcance incluido

- Aplicación web **desplegada en Vercel**, con base de datos en **Neon (Postgres serverless)**.
  (Decisión del 25 de septiembre de 2026 — reemplaza la idea inicial de ejecución solo local.)
- Selección manual del participante blanco y negro entre humano y tres modelos de IA.
- Partidas humano-humano, humano-IA e IA-IA.
- Tablero visual actualizado en cada jugada; control humano mediante drag and drop.
- Validación de movimientos legales y detección de estados terminales (jaque mate, tablas, etc.).
- Registro de movimientos: turno, pieza, origen, destino, posición resultante.
- Tres niveles configurables por IA (principiante / avanzado / maestro) con diferencia observable.
- Aceleración configurable cuando ambos participantes son IA.
- Persistencia local de partidas y estadísticas.
- Pruebas comparativas entre **todas** las combinaciones posibles de IA y niveles — **pendiente al
  2026-10-09**: no existe aún el "modo torneo" que las corra automáticamente, ver `05-DECISIONES.md`.
- Modo comentarista IA como funcionalidad adicional — **confirmado e implementado** el 2026-10-09,
  con voz y conectado a un LLM real (Groq), ver `05-DECISIONES.md`.
- Material y guion de apoyo para una presentación de 30 minutos — **pendiente de iniciar**.

## Fuera del alcance

- Hosting público permanente, apps móviles nativas, publicación en tiendas.
- Sistema de cuentas, autenticación de usuarios o multijugador por Internet.
- Pagos, suscripciones o consumo deliberado de APIs de pago — **excepción documentada**: los 3
  modelos de IA finales terminaron siendo de pago por necesidad de confiabilidad, no por elección
  inicial. Ver restricción de RNF-16 más abajo y `05-DECISIONES.md`.
- Entrenamiento o fine-tuning de modelos de lenguaje.
- Motor de ajedrez propio (usar librería) o sustituir a los LLM por Stockfish como "jugador".
- Emparejamiento automático de rivales sin acción explícita del usuario.

## Restricciones críticas (afectan la nota directamente)

- **Los 3 modelos de IA deben ser de empresas distintas.** Incumplirlo resta 10 puntos flat.
- **30 minutos de exposición, tope 35.** Pasarse penaliza restando un tercio de la nota.
- **No asistir el día de la presentación = nota de 0** para ese estudiante.
- **El docente elige a quién le pregunta.** Los 4 integrantes deben dominar el proyecto completo,
  no solo su frente de trabajo.
- Las IA deben usar alternativas **gratuitas** y requieren conexión a Internet; las cuotas y
  disponibilidad de los modelos pueden cambiar sin aviso — no congelar la elección hasta comprobarla.
  **Excepción documentada conscientemente por el equipo:** los 3 modelos finales (Gemini, Claude
  Haiku, GPT-5 Nano) terminaron siendo de pago ($5 cada uno) porque sus cuotas gratuitas no fueron
  confiables bajo las pruebas del equipo — ver el detalle completo y la justificación en
  `05-DECISIONES.md`, necesario tenerlo claro para responder preguntas del docente sobre RNF-16.
- Vercel y Neon también deben mantenerse dentro de sus capas gratuitas (RNF-16) — Vercel pasó a plan
  Pro durante el desarrollo (necesario para el backend); Neon se mantiene en capa gratuita.
- No se requiere entrega escrita formal, pero sí material visual de apoyo bien estructurado.

## Ponderación (25 puntos totales, ver rúbrica completa)

Los puntos que más pesan **no son funcionalidad básica**, sino:

- Preguntas del docente: **30%**
- Análisis de resultados y conclusiones: **10%**
- Selección de rivales: **10%**

El resto de funcionalidades (tablero, log, aceleración, drag&drop, niveles, estadísticas, validación,
funcionalidad adicional, material de apoyo, calidad de exposición) pesan 5% cada una.

## Stakeholders

| Stakeholder | Interés / responsabilidad |
| --- | --- |
| Instructor | Define instrucciones y rúbrica; evalúa software, análisis, exposición y respuestas |
| Equipo (4 estudiantes) | Analiza, diseña, implementa, prueba, documenta y presenta |
| Jugador humano | Configura la partida y mueve piezas por drag and drop cuando participa |
| Espectador de la demo | Observa tablero, historial, estadísticas, narración y resultados |
| Proveedores de IA | Procesan solicitudes por Internet; aplican límites de uso y disponibilidad |

## Documentos relacionados

- `01-ARQUITECTURA.md` — stack técnico, arquitectura y modelo de datos propuestos.
- `02-REQUISITOS.md` — requisitos funcionales, no funcionales y reglas de negocio detalladas.
- `03-FRENTES_CHECKLIST.md` — los 4 frentes de trabajo con su checklist de tareas.
- `04-MODELOS_PENDIENTE.md` — qué falta cerrar sobre los 3 modelos de IA.
- `05-DECISIONES.md` — bitácora de decisiones aprobadas vs. propuestas.
