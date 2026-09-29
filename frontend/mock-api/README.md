# Frontend Mock API

API simulada utilizada exclusivamente para el desarrollo aislado del
**Frente 1 - Tablero y experiencia visual**.

## Importante

Este proyecto **no es el backend oficial de Duelo de Inteligencias**.

Su propósito es permitir que el frontend pueda desarrollarse y probarse
mientras los Frentes 2 y 3 implementan el backend real.

El backend real podrá sustituir este mock siempre que respete el contrato
HTTP acordado entre frontend y backend.

## Responsabilidades del mock

- Exponer participantes de prueba.
- Crear partidas temporales en memoria.
- Consultar el estado de una partida.
- Validar movimientos mediante `chess.js`.
- Simular respuestas y errores del backend.
- Permitir probar controles básicos de partida.

## Fuera de alcance

Este mock no implementa:

- Prisma.
- Neon/PostgreSQL.
- Persistencia.
- Proveedores de IA reales.
- API keys.
- Estadísticas reales.
- Modo torneo.

Todos los datos desaparecen cuando se reinicia el servidor.

## Ejecución

```bash
npm install
npm run dev