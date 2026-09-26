# Requisitos — Duelo de Inteligencias

Prioridades: **P0** = necesario para cumplir instrucciones o evitar penalización · **P1** = valor
importante · **P2** = puede diferirse si amenaza la fecha.

## Requisitos funcionales (RF)

| ID | Prio | Requisito |
| --- | --- | --- |
| RF-01 | P0 | Seleccionar manualmente el participante de blancas y negras |
| RF-02 | P0 | Cada selector ofrece Humano y tres modelos de empresas distintas (o sustitutos aprobados) |
| RF-03 | P0 | Impedir iniciar una partida si falta un participante o configuración requerida |
| RF-04 | P0 | Permitir Humano-Humano, Humano-IA, IA-Humano e IA-IA |
| RF-05 | P0 | Elegir principiante, avanzado o maestro para cada participante IA |
| RF-06 | P0 | Mostrar tablero visual con orientación coherente para el jugador humano |
| RF-07 | P0 | Actualizar el tablero tras cada movimiento aceptado |
| RF-08 | P0 | El jugador humano mueve piezas mediante drag and drop |
| RF-09 | P0 | Bloquear interacción fuera del turno del humano o cuando la partida terminó |
| RF-10 | P0 | Validar cada movimiento con un motor de reglas antes de modificar la posición |
| RF-11 | P0 | Rechazar movimiento inválido y mostrar notificación comprensible |
| RF-12 | P0 | Aplicar enroque, promoción, al paso, jaque, jaque mate y tablas |
| RF-13 | P0 | En turno de IA, enviar posición, historial necesario, color y formato esperado |
| RF-14 | P0 | Transformar la respuesta de la IA en un movimiento estructurado antes de validar |
| RF-15 | P0 | Si la IA devuelve jugada inválida: conservar posición, registrar intento, máx. 2 reintentos |
| RF-16 | P0 | Si se agotan reintentos o falla el servicio: pausar y permitir reintentar/finalizar como incidencia |
| RF-17 | P0 | Historial con turno, color, pieza, origen, destino, SAN y FEN resultante |
| RF-18 | P0 | Poder revisar la secuencia completa de una partida terminada |
| RF-19 | P0 | En IA-IA, elegir velocidad normal/rápida/máxima antes o durante la partida |
| RF-20 | P0 | La aceleración no oculta movimientos ni altera su orden |
| RF-21 | P0 | Finalizar partida al detectar jaque mate, tablas o incidencia técnica registrada |
| RF-22 | P0 | Guardar participante, empresa, modelo, nivel, color, fecha, resultado, causa y n.º de movimientos |
| RF-23 | P0 | Calcular por participante: jugadas, ganadas, perdidas, empatadas, % victorias, promedio de movimientos por victoria |
| RF-24 | P1 | Filtrar estadísticas por modelo y nivel |
| RF-25 | P1 | Exportar partidas/estadísticas en JSON, CSV o PGN |
| RF-26 | P0 | El usuario inicia cada enfrentamiento explícitamente; el sistema no empareja solo |
| RF-27 | P0 | Poder iniciar una nueva partida sin reiniciar la aplicación |
| RF-28 | P1 | Pausar y reanudar una partida IA-IA |
| RF-29 | P1 | Modo comentarista activable/desactivable; genera comentarios sin elegir jugadas |
| RF-30 | P1 | Los comentarios se identifican como narración de IA y no cuentan para el resultado |
| RF-31 | P1 | Mostrar errores de conexión/cuota sin exponer claves ni detalles sensibles |
| RF-32 | P1 | Registrar latencia, reintentos y respuestas inválidas por modelo (para el análisis) |
| RF-33 | P2 | Cambiar tema visual/piezas sin afectar el estado de la partida |
| RF-34 | P1 | Pantalla de resultado con ganador, causa, duración y movimientos totales |

## Requisitos no funcionales (RNF)

| ID | Categoría | Requisito |
| --- | --- | --- |
| RNF-01 | Usabilidad | Configuración principal completable en una sola vista con etiquetas claras |
| RNF-02 | Usabilidad | Tablero utilizable desde 1280×720 o más, conservando proporciones |
| RNF-03 | Accesibilidad | Controles con etiquetas visibles, foco de teclado y contraste legible |
| RNF-04 | Rendimiento | Movimiento humano válido reflejado en <500ms (sin contar llamadas externas) |
| RNF-05 | Rendimiento | Indicar "esperando" si una IA tarda más de 1 segundo |
| RNF-06 | Fiabilidad | La posición oficial vive en el backend; solo cambia tras validación exitosa |
| RNF-07 | Fiabilidad | Un fallo de API no corrompe la partida ni borra movimientos confirmados |
| RNF-08 | Seguridad | Claves en variables de entorno; nunca en frontend, repo, logs o capturas |
| RNF-09 | Seguridad | `.env` fuera de control de versiones; se entrega `.env.example` sin secretos |
| RNF-10 | Mantenibilidad | Cada proveedor de IA implementa una interfaz común de adaptador |
| RNF-11 | Mantenibilidad | Las reglas de ajedrez no dependen de la interfaz ni de un proveedor de IA |
| RNF-12 | Compatibilidad | Funciona en una versión actual de Chrome, Edge o Firefox |
| RNF-13 | Portabilidad | Ejecutable en local con instrucciones versionadas para desarrollo, y accesible vía la URL pública de despliegue en Vercel para la demo |
| RNF-14 | Observabilidad | Errores técnicos con fecha, partida, proveedor, tipo de error y acción tomada |
| RNF-15 | Privacidad | No enviar nombres de integrantes ni datos personales en los prompts |
| RNF-16 | Costo | Configuración por defecto usa cuotas gratuitas; no habilita facturación sola |
| RNF-17 | Pruebas | Reglas críticas y adaptadores con pruebas automatizadas; flujo de demo con prueba manual completa |
| RNF-18 | Respaldo | Antes de presentar: exportación de resultados + grabación/capturas de una partida estable |

## Reglas de negocio (RN)

| ID | Regla |
| --- | --- |
| RN-01 | Una partida tiene exactamente dos participantes, uno por color |
| RN-02 | Un participante IA debe tener empresa, modelo y nivel |
| RN-03 | Los tres modelos comparados deben pertenecer a tres empresas distintas |
| RN-04 | Las blancas mueven primero; los turnos se alternan |
| RN-05 | Solo el motor de reglas determina si un movimiento modifica la posición |
| RN-06 | Un intento inválido no consume turno ni cambia el tablero |
| RN-07 | La aceleración solo está disponible cuando ambos participantes son IA |
| RN-08 | Toda partida terminada registra causa: jaque mate, tablas, abandono humano o incidencia técnica |
| RN-09 | Las estadísticas deportivas excluyen partidas por incidencia técnica (se reportan aparte) |
| RN-10 | % de victorias = victorias / partidas válidas jugadas × 100 |
| RN-11 | Promedio de movimientos por victoria se calcula solo con victorias del participante |
| RN-12 | La narración (comentarista) no puede modificar posición, turno ni resultado |

## Trazabilidad

Cada RF/RNF debería tener: necesidad de origen → caso de uso → historia de usuario → caso de prueba →
estado. La matriz individual completa (fila por requisito) está **pendiente** — ver
`04-MODELOS_PENDIENTE.md` y `05-DECISIONES.md` para el resto de pendientes de este tipo.
