# Circuit Quest — Primer Orden ⊣⊢

Videojuego web 2D para aprender **circuitos RC/RL de primer orden** jugando:
**VER → TOCAR → CAMBIAR → PREDECIR → VER RESULTADO → CORREGIR → REPETIR.**

El objetivo: que al ver un capacitor, un switch y "t = 0" el cerebro diga automáticamente
*"ANTES → 0⁺ → INFINITO → Req → τ → fórmula"*.

---

## Cómo ejecutar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en dist/ (estático, se puede abrir con npm run preview)
npm test           # pruebas del motor de circuitos y del modelo de dominio
```

No hay backend, ni login, ni APIs externas. El progreso se guarda en `localStorage`
(clave `circuit-quest-v1`). Para reiniciar: *Mapa de dominio → Reiniciar progreso*.

## Qué jugar primero

1. **CONTINUAR** en la pantalla de inicio (empieza por *Lab 0 — Lo que ya sabes*, 5 preguntas visuales).
2. Sigue el orden del mapa: los labs se desbloquean en secuencia (activa *modo libre* en el mapa para saltar).
3. La primera sesión (Lab 0 → Lab 5) dura ~25–35 min y termina con el **ejercicio real de clase**.
4. Luego RL (Lab 6), **Boss Fight** (Lab 7) y **Simulacro** cronometrado (Lab 8 / *MODO EXAMEN*).

## Estructura de niveles

| Lab | Nombre | Qué descubre el estudiante | Actividades |
|---|---|---|---|
| 0 | Lo que ya sabes | Ya tiene Ohm, LCK, paralelo, apagar fuentes | 5 preguntas visuales |
| 1 | El capacitor | C en DC estable = **abierto**; vC no salta | Conectar batería (electrones animados, cargas en placas), desconectar (guarda energía), descargar sobre R (energía → calor), fórmulas reveladas *después* |
| 2 | El inductor | L en DC estable = **cable**; iL no salta | Bobina con campo magnético, *arrastra C o L al hueco*, comparación C vs L, minijuego de clasificación, **¿Qué sobrevive al salto?** |
| 3 | Máquina del tiempo | Tres fotos: ANTES (0⁻) / JUSTO DESPUÉS (0⁺) / MUCHO DESPUÉS (∞) | Botones gigantes que **transforman físicamente** el circuito (C → abierto, C → batería con su voltaje viejo) + "película completa" |
| 4 | Velocidad: τ y Req | τ = Req·C es *velocidad*; Req se ve desde C con fuentes apagadas | Sliders R y C con curva fantasma, retos (lento / rápido / τ = 3 s), 63 % y 5τ; **Encuentra Req** (retirar C, apagar V→cable / I→abierto, corriente de prueba, fuente dependiente que NO se apaga) |
| 5 | La fórmula + clase | x(t) = final + (inicio − final)·e^(−t/τ) | Arrastrar INICIO / FINAL / VELOCIDAD sobre la gráfica, ensamblar la fórmula con bloques con significado, números, **ejercicio de clase guiado** |
| 6 | RL: mismo truco | vC → iL, Req·C → L/Req | Traducción RC→RL, máquina del tiempo RL, ejercicio RL parcialmente guiado |
| 7 | Boss Fight | Resolver sin guía eligiendo el procedimiento | Herramientas ANTES / 0⁺ / INFINITO / APAGAR FUENTES / VER DESDE C·L / CALCULADORA (con operador ∥) / GRÁFICA; se puntúa **resultado + orden** |
| 8 | Simulacro profesora | Listo para el parcial | 3 bosses, sin ayudas, cronómetro, puntos por procedimiento, resumen de errores |

Cada concepto aparece como ejemplo guiado → parcialmente guiado → sin guía → transferencia
(el tipo se ve en la barra contextual inferior).

### El ejercicio de clase (Lab 5 y Lab 8)
C = 0,2 F, 5 Ω, 10 Ω, 3 A, fuente 20u(−t) V. El motor calcula (y los tests verifican):
v(0⁺) = 20 V, v(∞) = 10 V, Req = 5∥10 = 3,333 Ω, τ = 0,667 s (1/τ = 1,5 s⁻¹),
**v(t) = 10(1 + e^(−1,5t)) V** e **i(t) = −2(1 + e^(−1,5t)) A** en la R de 5 Ω.
> La topología se reconstruyó a partir de las respuestas (fuente 20u(−t) V en serie con 5 Ω hacia el
> capacitor; en t = 0 un switch conecta el 10 Ω y la fuente de 3 A). Si el dibujo de la profesora es
> distinto, basta editar `clase` en `src/data/circuits.ts`.

## Ayudas (en cualquier puzzle)

- **👁 MUÉSTRAME** — 1ª: resalta dónde mirar · 2ª: muestra la transformación · 3ª: siguiente paso / descarta una opción.
- **Ver solución completa** — revela todo (el paso casi no cuenta para el dominio).
- **😵 NO ENTIENDO NADA** — no da más teoría: reduce el circuito a *un elemento + una fuente*, hace **una** pregunta y luego reconstruye el circuito paso a paso.
- **Errores clasificados** con micro-animación propia (no un párrafo): `CONFUSION_DC_CAPACITOR`, `CONFUSION_DC_INDUCTOR`, `ERROR_CONTINUIDAD`, `ERROR_CONDICION_INICIAL`, `ERROR_CONDICION_FINAL`, `ERROR_APAGAR_FUENTES`, `ERROR_REQ`, `ERROR_TAU`, `ERROR_SIGNO`, `ERROR_FORMULA_EXPONENCIAL`, `ERROR_UNIDADES` (+ `ERROR_BASICO`).
- **Confidence check** (🎲 / 🤔 / 🎯) en preguntas marcadas y cada 4ª pregunta.

## Arquitectura

```
src/
  engine/            Motor de circuitos (sin React)
    types.ts         CircuitDefinition, ComponentDefinition, NodeDefinition, SwitchState, TimeState, Probe…
    mna.ts           Análisis nodal modificado (R, V, I, VCCS, switch, C/L con modo open/short/fuente)
    analysis.ts      Método generalizado de la profesora: x(0⁻), x(0⁺), x(∞), Req (fuente de prueba de 1 A), τ, x(t), solveAt(t)
    flow.ts          Corriente en cada cable (para animar electrones)
  data/
    circuits.ts      ← TODOS los circuitos (coordenadas + componentes)
    questions.ts     ← Banco de preguntas por habilidad y REPRESENTACIÓN (icono, circuito, gráfica, numérica…)
    labs.ts          ← Niveles: secuencia de Steps
    model.ts         Tipos: Exercise/Step/Hint/QuestionDef/Lab
  learning/
    skills.ts        19 habilidades
    errors.ts        Tipos de error → habilidad
    mastery.ts       BKT heurístico (ver abajo)
    spaced.ts        Repetición espaciada dentro de la sesión
  store/game.ts      Zustand + persist (localStorage)
  components/        CircuitView (SVG), TimeScrubber, ResponseGraph, QuestionCard, Remediation, Reduction, Calculator…
  activities/        Un componente por tipo de Step (Explore, TimeMachine, ReqHunt, TauLab, Formula, Guided, Boss…)
  screens/           Home, WorldMap (avatar WASD), LabPlayer, MasteryMap
```

**Por qué funciona para cualquier circuito de primer orden con fuentes DC:** en t > 0 el circuito se
resuelve exactamente reemplazando C por una fuente de voltaje vC(t) (o L por una fuente de corriente
iL(t)), donde vC(t) sale de la fórmula exponencial. Así el time scrubber puede mostrar corrientes,
voltajes, carga, campo y calor en cualquier instante, y las preguntas numéricas (con distractores que
codifican errores concretos) se generan automáticamente con `phaseQuestion()` / `targetQuestion()`.

## Habilidades (skills)

`ohmsLaw, seriesParallel, nodes, meshes, superposition, capacitorDc, capacitorContinuity, inductorDc,
inductorContinuity, initialCondition, finalCondition, sourceDeactivation, theveninResistance,
timeConstantRC, timeConstantRL, naturalResponse, stepResponse, generalizedResponse, signConvention`

## Fórmula de mastery (`src/learning/mastery.ts`)

Bayesian Knowledge Tracing heurístico, por habilidad, P(L) ∈ [0,1]:

```
P(L|correcto) = P(1−s) / [P(1−s) + (1−P)g]
P(L|error)    = P·s    / [P·s    + (1−P)(1−g)]
P' = P(L|obs) + (1 − P(L|obs)) · T · calidad          T = 0.12, s = 0.10
```

- **g (adivinar)** = 1/nº opciones; sube con "🎲 estoy adivinando" (≥ 0.6), con "🤔", con cada MUÉSTRAME y con respuestas sospechosamente rápidas (< 2 s en preguntas difíciles).
- **s (descuido)** baja a 0.04 si dijo "🎯 seguro" y falló (evidencia de concepto erróneo).
- **Solo el primer intento es evidencia.** Acertar tras errores = observación de error + crédito pequeño (calidad × 0.35).
- **calidad** = 1/(1+ayudas) × factor de dificultad × (0.5 si adivinaba).
- Habilidades secundarias de una pregunta se actualizan con peso 0.6.
- **Detección de suerte:** acierto en una representación seguido (< 6 min) de fallo en otra → `suspectLuck`, P ≤ 0.4. Se limpia con 2 aciertos limpios seguidos en ≥ 2 representaciones.
- **Dominada** solo si P ≥ 0.85 **y** ≥ 3 aciertos al primer intento **y** ≥ 2 representaciones distintas **y** sin sospecha de suerte. Hasta entonces la barra muestra como máximo 80 %.

**Repetición espaciada:** cada fallo (o acierto "adivinando") programa un repaso 2–5 min después,
con una pregunta de la **misma habilidad en otra representación**; se intercala entre pasos como
"⚡ Repaso relámpago".

## Cómo agregar ejercicios

1. **Circuito** — en `src/data/circuits.ts`:
   ```ts
   def({
     id: 'mi-rc',
     points: { g: { x: 0, y: 220 }, t: { x: 0, y: 0 }, a: { x: 200, y: 0 }, b: { x: 200, y: 220 } },
     wires: [['b', 'g']],
     components: [
       { id: 'V', kind: 'V', a: 't', b: 'g', value: 12, display: '12 V', active: 'before' }, // 12u(−t)
       { id: 'R', kind: 'R', a: 't', b: 'a', value: 4, display: '4 Ω' },
       { id: 'C', kind: 'C', a: 'a', b: 'b', value: 0.5, display: '0,5 F' },
       // switch: { kind: 'SW', sw: { before: true, after: false } }
     ],
     ground: 'g',
     storage: 'C',
   });
   ```
   Convenciones: en `V`, `a` es el terminal +; en `I`, la flecha apunta hacia `a`; la corriente de un componente se mide de `a` a `b`.
2. **Usarlo** — en `src/data/labs.ts` agrega un Step: `{ type: 'timeMachine', circuit: 'mi-rc', … }`,
   `{ type: 'guided', circuit: 'mi-rc', guidance: 'free' }`, `{ type: 'boss', circuit: 'mi-rc', name: '…' }` o `{ type: 'reqHunt', … }`.
   Las preguntas, distractores, transformaciones y gráficas se generan solas.
3. **Pregunta conceptual** — agrégala a `src/data/questions.ts` con `skills`, `representation` y un `error` por opción incorrecta. Automáticamente entra en el pool de repasos.
4. Corre `npm test`: agrega el resultado esperado en `src/engine/__tests__/analysis.test.ts`.

## Decisiones técnicas

- **React 19 + TypeScript + Vite 7**, **Zustand** (con `persist`) para estado. Sin Framer Motion ni librerías de gráficas: todo es **SVG propio + CSS** (electrones = `stroke-dasharray` animado, velocidad ∝ corriente) → bundle pequeño (~120 kB gzip) y control total.
- Motor MNA mínimo (no SPICE) con `GMIN` para nodos flotantes; Req con fuente de prueba de 1 A (soporta fuentes dependientes VCCS).
- Arrastrar y soltar con pointer events (mouse + táctil) y fallback de "tocar para seleccionar → tocar destino".
- Sonidos sintetizados con WebAudio (sin assets), botón de mute persistente.
- Assets 100 % originales (avatar y mapa dibujados en SVG).
- Material de la profesora: los archivos `Circuitos de 1 Orden.pptx` y `Capacitores e Inductores V02 (1).pptx` **no estaban en el repositorio**; la nomenclatura y el método siguen la especificación entregada (q = Cv, i = C dv/dt, w = ½Cv², v = L di/dt, w = ½Li², τ = ReqC, τ = L/Req, método generalizado en 6 pasos).

## Pruebas

- `npm test` — motor (ejercicio de clase, máquinas del tiempo, RL, bosses, Req con dependiente) y modelo de dominio (un acierto ≠ dominio, suerte, ayudas, confianza).
- Se verificó con Playwright (desktop 1440×900 y móvil 390×844) un recorrido completo de los Labs 0–8 sin errores de consola ni desbordes horizontales.

## Versión publicada

Jugable en: https://claude.ai/artifact/QNzLDJDq42BsoGvZTu2kzx

Para regenerar el archivo único (JS + CSS en línea) que se publica: `npm run build:artifact` → `dist/circuit-quest.html`.
