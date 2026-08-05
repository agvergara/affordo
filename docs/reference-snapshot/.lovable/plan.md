
## Cambio de modelo

El estado actual pide todos los datos en cada visita. Pasamos a dos superficies:

1. **Onboarding** (una sola vez): perfil financiero del usuario.
2. **Dashboard de objetivos** (uso diario): añadir/editar objetivos, cada uno se evalúa contra el perfil guardado.

Perfil y objetivos viven en `localStorage`. Si no hay perfil → onboarding; si hay perfil → dashboard.

## Rutas

- `/` — router de estado: si no hay `affordo.profile` redirige a `/onboarding`, si hay redirige a `/goals`.
- `/onboarding` — wizard de 4 pasos.
- `/goals` — lista de objetivos + añadir/editar/eliminar.
- `/settings` — editar perfil, moneda e idioma, borrar datos.

Cada ruta con su propio `head()` (title/description/og únicos).

## Onboarding wizard (`/onboarding`)

Componente `WizardShell` con barra de progreso "01 / 04" tipo audit, botones Back / Continue, animación slideUp entre pasos, teclado (Enter avanza).

- **Paso 1 · Identity**: idioma (ES/EN), moneda (EUR/USD/GBP), formato de números (EU 1.234,56 / US 1,234.56).
- **Paso 2 · Income**: salario neto mensual, horas/semana (default 40), (avanzado) horas/día (8), pagas al año (12, 14…).
- **Paso 3 · Expenses**: total de gastos fijos mensuales. Nota: "Podrás desglosar más tarde si quieres" (no bloqueante).
- **Paso 4 · Rules**: umbral de significancia (% del ingreso, default 10, slider 5–50), ahorro actual, aportación mensual opcional.

Al terminar → escribe `affordo.profile` y navega a `/goals`.

## Dashboard (`/goals`)

Header sticky "Audit: Life/Cost" con:
- Chip de "Time value": `€20,19 / hour` derivado del perfil.
- Enlaces Settings, EN/ES toggle.

Sección superior — Snapshot del perfil (tipografía Anton grande):
- Disposable/mes, umbral %, mini-línea "Editar en Settings".

Sección Goals:
- Botón primario "+ Add goal" abre modal (nombre, precio, opcional: descripción/URL/categoría).
- Lista de goals como tarjetas industrial-audit; cada card muestra:
  - Nombre + precio grande.
  - Verdicto badge: **AFFORD** / **STRETCH** / **CUT TO AFFORD** / **CANNOT**.
  - "X.X days of work" y "Y.Y% of monthly income".
  - Barra de umbral con marcador.
  - Línea de tiempo: "Time to save: N months at current surplus" o "Cut expenses by X% to reach in 12 months".
  - Acciones: Edit, Duplicate, Remove.
- Empty state con copy honesto: "No decisions to reckon with yet."
- Ordenables por precio o fecha, filtro rápido por estado.

## Lógica (`src/lib/affordability.ts`)

Función pura `evaluate(profile, goal) → Verdict` con:
- `hourlyRate = salary * paymentsPerYear / (52 * hoursPerWeek)` (soporta 14 pagas).
- `hoursOfWork`, `daysOfWork = hours / hoursPerDay`.
- `pctOfIncome = price / salary`.
- `surplus = salary - expenses + monthlyContribution`.
- Veredicto:
  - `afford` si `savings + windfall >= price`.
  - `stretch` si `surplus > 0` y `monthsToSave = (price - savings) / surplus <= 12`.
  - `cutToAfford` si con recorte ≤50% de gastos se logra en 12 meses; devuelve `cutPct` y `newMonths`.
  - `cannot` en cualquier otro caso.
- Todo memoizado por goal.

## Formato y moneda

`src/lib/format.ts`:
- `formatMoney(value, {currency, locale})` con `Intl.NumberFormat`.
- `formatDuration(hours, {hoursPerDay, locale})` → "5 horas", "3,2 días", "1,5 meses".
- `parseNumber(input, locale)` para aceptar `1.234,56` o `1,234.56`.

## i18n

`src/lib/i18n.ts` con diccionario `{en, es}`, hook `useT()`, persistido en `localStorage["affordo.lang"]`. Lectura en `useEffect` (SSR-safe).

## Persistencia

Hook `useLocalState<T>(key, initial)` con hidratación post-mount.
Keys: `affordo.profile`, `affordo.goals`, `affordo.lang`.
Schema Zod para validar el JSON al leer (si falla → onboarding).

## Estilo (Industrial audit)

`src/styles.css`:
- Tokens del prototipo v3 en `:root` y `.dark`: `--background`, `--foreground`, `--muted`, `--accent: oklch(~0.72 0.19 45)` (naranja), `--border` con alpha.
- `@theme inline`: `--font-display: 'Anton'`, `--font-sans: 'Inter'`, `--font-mono: 'JetBrains Mono'`.
- Keyframes `slideUp`, `scaleIn`; utilities `.animate-slide-up`, `.animate-scale-in`.
- Reglas base para inputs: `border-b-2` estilo audit, foco → borde accent.

Fuentes cargadas vía `<link>` en `head()` de `__root.tsx` (Anton + Inter + JetBrains Mono).

## Componentes nuevos

- `src/components/wizard/WizardShell.tsx` — layout + progreso + nav.
- `src/components/wizard/Step{Identity,Income,Expenses,Rules}.tsx`.
- `src/components/goals/GoalCard.tsx`, `GoalDialog.tsx` (usando shadcn Dialog).
- `src/components/goals/VerdictBadge.tsx`, `ThresholdBar.tsx`.
- `src/components/layout/AppHeader.tsx` con toggle EN/ES y link Settings.
- `src/components/ui/*` shadcn existentes para inputs, dialog, slider, select.

## SEO y metadata

Cada ruta con `head()` propio:
- `/` → título y descripción neutrales de la marca Affordo.
- `/onboarding` → "Set up your reckoning · Affordo".
- `/goals` → "Goals · Affordo".
- `/settings` → "Settings · Affordo".

## Deploy en Vercel

- No hay backend: TanStack Start puede build estático. `vite.config.ts` ya está bien.
- Añadir `vercel.json` mínimo con `outputDirectory` correcto solo si el build por defecto de TanStack Start no lo detecta; por defecto Vercel autodetecta.
- Recordar al usuario en el mensaje final: sync GitHub desde Lovable → conectar el repo a Vercel → deploy sin variables de entorno.

## Fuera de scope

- Backend / login / cloud sync (todo local, como pidió).
- Desglose de gastos por categoría (queda como "hint" en onboarding paso 3, se puede añadir después).
- Import/export JSON del perfil (fácil de añadir en Settings más tarde).

## Verificación

- Typecheck (`tsgo`) limpio.
- Playwright: mobile 375px y desktop 1440 — capturar onboarding paso 1, paso 4, dashboard vacío, dashboard con 2 goals (afford + cut-to-afford).
- Comprobar que al recargar el navegador el perfil persiste y va directo a `/goals`.
- Cambiar idioma ES↔EN y verificar strings y formato de números.
