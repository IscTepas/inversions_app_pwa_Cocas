# Term Strategy Modal — CALENDAR_SPREAD / DIAGONAL_SPREAD

## Ubicación

- **Modal:** `src/features/dashboard/simulation/TermStrategyModal.tsx`
- **Panel contenedor:** `src/features/dashboard/simulation/SimulationControlPanel.tsx`
- **Sección de resultados:** `src/features/dashboard/simulation/SimulatorStrategySection.tsx`
- **Parámetros:** `TermStrategyParams` (exportado desde `TermStrategyModal.tsx`)

## Flujo de apertura

1. El usuario selecciona `CALENDAR_SPREAD` o `DIAGONAL_SPREAD` en el `<select>` de estrategias del `SimulationControlPanel`
2. `handleEstrategiaChange` detecta `isTermStrategy(e) === true` y abre el modal: `setTermModalOpen(true)`
3. El modal se renderiza al final del panel:

```tsx
<TermStrategyModal
  open={termModalOpen}
  estrategia={estrategia}
  params={termParams}
  onChange={setTermParams}
  onClose={() => setTermModalOpen(false)}
/>
```

## Valores iniciales (defaults)

```typescript
const DEFAULT_TERM_PARAMS: TermStrategyParams = {
  optionStyle: "CALL",
  strikeShort: 0,
  strikeLong: 0,
  expirationShort: new Date().toISOString().slice(0, 10),  // hoy
  expirationLong: new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10), // hoy + 60 días
  premiumShort: 0,
  premiumLong: 0,
  contracts: 1,
  riskFreeRate: 0.05,
};
```

## Campos del modal

| Sección | Campo | Tipo | Default | Editable |
|---|---|---|---|---|---|
| General | Tipo de Opción | `select: CALL / PUT` | `CALL` | ✅ |
| General | Contratos | `number, min=1` | `1` | ✅ |
| General | Tasa Libre de Riesgo | `number, step=0.01` | `0.05` (5%) | ✅ |
| **Ala Corta (Short Leg)** | Strike | `number, step=0.5` | `0` | ✅ |
| | Vencimiento | `date` (disabled) | Heredado de "Estrategia Desde" | ❌ |
| | Premium | `number, step=0.01` | `0` | ✅ |
| **Ala Larga (Long Leg)** | Strike | `number, step=0.5` | `0` | ✅ |
| | Vencimiento | `date` (disabled) | Heredado de "Estrategia Hasta" | ❌ |
| | Premium | `number, step=0.01` | `0` | ✅ |

## Comportamiento actual

- Al presionar **"Confirmar"**, el modal se cierra y actualiza `termParams` en el estado del `SimulationControlPanel`
- **NO se ejecuta ningún API call** desde el modal
- Los parámetros se almacenan para usarse cuando el usuario presione **"Ejecutar Simulación"**
- En `SimulatorStrategySection`, cuando `activeStrategy` es `CALENDAR_SPREAD` o `DIAGONAL_SPREAD`, se muestra un mensaje placeholder:
  > *"El análisis de estrategias temporales (Calendar / Diagonal Spread) estará disponible en un sprint posterior."*
- Las fechas de vencimiento (`expirationShort`, `expirationLong`) se sincronizan automáticamente desde los campos "Estrategia Desde" y "Estrategia Hasta" del panel de control mediante un `useEffect`. Los inputs están `disabled` en el modal y muestran el texto *"Tomado del panel de control"*.

## Interfaz `TermStrategyParams`

```typescript
export interface TermStrategyParams {
  optionStyle: "CALL" | "PUT";
  strikeShort: number;
  strikeLong: number;
  expirationShort: string;  // YYYY-MM-DD
  expirationLong: string;   // YYYY-MM-DD
  premiumShort: number;
  premiumLong: number;
  contracts: number;
  riskFreeRate: number;
}
```

## Pendiente / Mejoras posibles

- [ ] Conectar el modal con los engines de cálculo reales (`calendarSpreadEngine`, `diagonalSpreadEngine`)
- [ ] Mostrar resultados (griegas, P&L, stress tests) después de confirmar
- [ ] Validar que `expirationLong > expirationShort`
- [ ] Validar que strikes, primas y contratos sean > 0
- [ ] Cargar precio actual del ticker automáticamente al abrir el modal (similar a como hace `CoverageParamsModal`)
- [ ] Integrar con el flujo de term strategies de `StrategiesView.tsx` (que ya tiene formularios funcionales con cálculo real)

## Diferencia con `StrategiesView.tsx` (Sidebar)

| Aspecto | StrategiesView (Sidebar) | SimulationControlPanel (Dashboard) |
|---|---|---|
| Interacción | Formulario inline + botón "▶ Calcular" | Modal + botón "Ejecutar Simulación" |
| API call | Directo a `/api/v1/strategies/term/{calendar\|diagonal}/{call\|put}` | Solo almacena params, no llama API |
| Resultados | Se muestran inline abajo del formulario (griegas, stress tests) | Placeholder "próximamente" |
| Estrategias | short-put, long-put, short-call, long-call, calendar-spread, diagonal-spread | 13 canónicas (IRON_CONDOR, COVERED_CALL, CALENDAR_SPREAD, etc.) |

## Cambios realizados (2026-05-30)

Se eliminó la redundancia de fechas entre el panel de control y el modal de Calendar/Diagonal Spread.

### Archivos modificados

**`SimulationControlPanel.tsx`**
- Se agregó un `useEffect` que sincroniza `estrategiaFrom` → `expirationShort` y `estrategiaTo` → `expirationLong` en `termParams` cada vez que el usuario cambia las fechas del panel:

```typescript
useEffect(() => {
  setTermParams((prev) => ({
    ...prev,
    expirationShort: estrategiaFrom,
    expirationLong: estrategiaTo,
  }));
}, [estrategiaFrom, estrategiaTo]);
```

**`TermStrategyModal.tsx`**
- Los dos inputs de "Vencimiento" (Ala Corta y Ala Larga) se marcaron como `disabled` y ya no llaman a `set()`
- Se agregó un texto auxiliar: *"Tomado del panel de control"* debajo de cada input deshabilitado

### Efecto

- El modal ya no tiene fechas editables duplicadas
- Los vencimientos se heredan automáticamente del panel
- El usuario solo configura lo específico de la estrategia (strikes, primas, contratos, CALL/PUT, tasa)
- No afecta a otras estrategias (IRON_CONDOR, COVERED_CALL, etc.) porque el modal solo se abre para CALENDAR_SPREAD y DIAGONAL_SPREAD

## Cambios realizados (2026-05-30) — Auto-fetch strikes y premiums desde option chain

### Objetivo
Que el modal obtenga automáticamente los strikes y primas desde la option chain del mercado al abrirse, eliminando la entrada manual.

### APIs consumidas
- `GET /api/options/chain?symbol={ticker}&expiration={expirationShort}` — strikes + bid/ask/IV para short leg
- `GET /api/options/chain?symbol={ticker}&expiration={expirationLong}` — strikes + bid/ask/IV para long leg

### Comportamiento implementado
- `TermStrategyModal` recibe nuevas props: `ticker: string` y `currentPrice?: number`
- Al abrir el modal, se fetchean ambas chains en paralelo mediante `fetchOptionChain`
- Los strikes se muestran en un `<select>` poblado con los strikes disponibles de cada chain
- La prima se calcula automáticamente como `(bid + ask) / 2` al seleccionar un strike
- Por defecto se preselecciona el strike ATM (más cercano al precio actual)
- Si la API falla o no hay datos, se permite entrada manual como fallback

### Archivos modificados

**`TermStrategyModal.tsx`**
- Nuevas props: `ticker`, `currentPrice`
- Nuevo estado: `shortChain`, `longChain`, `loading`, `errorChain`
- `useEffect` que fetchea ambas chains cuando se abre el modal
- Inputs de strike cambiados de `<input type="number">` a `<select>` con opciones de la chain
- Premium se auto-asigna al seleccionar strike (midpoint bid/ask)
- Select de optionStyle ahora re-fetchea cuando cambia (call vs put cambia bid/ask)

**`SimulationControlPanel.tsx`**
- Se pasa `ticker={ticket}` y `currentPrice={coverageParams.currentPrice}` al `TermStrategyModal`

### Pendiente / Mejoras futuras
- [ ] Al presionar "Confirmar", disparar `POST /api/v1/strategies/term/{calendar|diagonal}/{call|put}` con los parámetros
- [ ] Mostrar resultados (griegas, P&L, stress tests) en `SimulatorStrategySection`
- [ ] Reemplazar el placeholder *"estará disponible en un sprint posterior"*
- [ ] Validar fecha de expiración contra `GET /api/options/expirations` antes de fetch chain

### Pregunta abierta — Calendar Spread (mismo strike en short y long leg)
1. Mostrar solo strikes comunes entre ambas expiraciones
2. Select independiente para cada leg (si son distintos → se trata como Diagonal Spread)
3. Short leg determina y se valida que el strike exista en long leg

## Cambios realizados (2026-05-30) — Fix: strikes y premiums no cargaban

### Problema
Los usuarios reportaban que los strikes y premiums no cargaban en el modal de Calendar/Diagonal Spread, mostrando los selects deshabilitados con el texto "Sin datos".

### Diagnóstico
La causa raíz eran las **fechas de expiración inválidas**:
- `expirationShort` default: `isoToday()` = **2026-05-30 (sábado)** — ningún contrato de opciones expira en sábado
- `expirationLong` default: `isoPlusDays(30)` = **2026-06-29 (lunes)** — tampoco es una expiración estándar
- `fetchOptionChain` retornaba `rows: []` → `<select disabled>` mostraba "Sin datos"
- `currentPrice` siempre era 0 porque solo se fetcheaba al abrir el Coverage Modal, no el Term Modal

### Archivos modificados

**`TermStrategyModal.tsx`**
- Nuevo import: `fetchExpirations` (de `optionChainApi`) y `getMarketQuotes` (de `marketApi`)
- Nuevo estado: `validExpirations`, `expirationsLoading`, `localPrice`
- Nuevo `useEffect`: al abrir el modal, fetchea `GET /api/options/expirations` y valida/corrige `expirationShort`/`expirationLong` contra la lista de fechas válidas. Si la fecha actual no es válida, elige la próxima expiración disponible hacia adelante.
- Nuevo `useEffect`: fetchea `GET /api/market/quotes` para obtener `currentPrice` del ticker, habilitando el auto-select ATM (mismo patrón que CoverageParamsModal)
- Nuevo `useEffect`: auto-select ATM cuando `localPrice` llega después de que las chains ya se cargaron
- Función `strikeSelectOrInput`: reemplaza el `<select disabled>` por un `<input type="number">` editable cuando la chain está vacía (fallback a entrada manual)
- `useEffect` de chain fetch: ahora espera a que `expirationsLoading=false` antes de dispararse, evitando fetches con fechas inválidas
- Se muestra en UI la lista de expiraciones disponibles (primeras 5) como ayuda contextual

**`SimulationControlPanel.tsx`**
- Nuevo `useEffect` (líneas 546-553): fetchea `getMarketQuotes` cuando `termModalOpen=true`, usando el mismo `coverageParams.currentPrice` como destino (evita duplicar estado de precio)

### Efecto
- Al abrir el modal, las fechas se corrigen automáticamente a expiraciones válidas
- Si la API de expiraciones falla, se procede con las fechas originales y entrada manual
- Si la chain tiene datos, se auto-selecciona el strike ATM
- Si la chain está vacía, el strike se puede ingresar manualmente en un `<input>`
- El precio del ticker se obtiene automáticamente sin depender del Coverage Modal
