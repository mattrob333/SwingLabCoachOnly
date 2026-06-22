# SwingLab Design System

> **Phase 7 — Professional Visual Design Elevation**
> Foundation tick: refined design tokens + elevated shared primitives.

## Design Direction

SwingLab is a **professional baseball hitting-coach tool**. The visual language is:

- **Warm, confident, sport-specific** — not generic SaaS grey, not fitness-app, not clinical.
- **Subtle warmth** in the neutral ramp (paper, not screen) — a deliberate oklch tint at hue ~55, not pure grey.
- **Clay primary** (the brand color) paired with a **deep navy "ink" accent** (pinstripe authority).
- **Designed semantic tokens** — success (forest green), warning (rich amber), destructive (deep red) — not default Tailwind.
- **Premium shadows** — soft, layered, warm-tinted. Hairline borders.
- **Mobile-first** with strong desktop layouts. Accessible (contrast, focus-visible, reduced-motion).

---

## Color Tokens

All tokens are CSS custom properties in `app/globals.css`, mapped to Tailwind v4 utilities via `@theme inline`. Light + dark both defined intentionally.

### Primary (Clay — brand)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--primary` | `oklch(0.54 0.20 28)` | `oklch(0.62 0.18 28)` | Primary CTAs, active states, links |
| `--primary-foreground` | `oklch(0.99 0.005 60)` | `oklch(0.16 0.008 50)` | Text on primary surfaces |

### Accent (Navy / Ink — pinstripe)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--accent` | `oklch(0.95 0.012 250)` | `oklch(0.30 0.015 250)` | Hover surfaces, subtle navy tint |
| `--accent-foreground` | `oklch(0.28 0.05 250)` | `oklch(0.92 0.02 250)` | Text on accent |
| `--info` | `oklch(0.42 0.10 250)` | `oklch(0.62 0.10 250)` | Info badges, neutral labels |
| `--info-foreground` | `oklch(0.99 0.005 60)` | `oklch(0.16 0.008 50)` | Text on info |

### Semantic

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--success` | `oklch(0.55 0.13 152)` | `oklch(0.65 0.13 152)` | Paid, completed, approved |
| `--success-foreground` | `oklch(0.99 0.005 60)` | `oklch(0.16 0.008 50)` | Text on success |
| `--warning` | `oklch(0.74 0.15 68)` | `oklch(0.78 0.14 68)` | Pending, in-review |
| `--warning-foreground` | `oklch(0.22 0.03 60)` | `oklch(0.16 0.008 50)` | Text on warning |
| `--destructive` | `oklch(0.52 0.22 25)` | `oklch(0.65 0.20 25)` | Errors, expired, revoked, delete |
| `--destructive-foreground` | `oklch(0.99 0.005 60)` | `oklch(0.99 0.005 60)` | Text on destructive |

### Neutral Ramp (warm-tinted)

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `oklch(0.995 0.003 60)` | `oklch(0.16 0.008 50)` | Page background |
| `--foreground` | `oklch(0.20 0.008 50)` | `oklch(0.96 0.004 60)` | Body text |
| `--card` | `oklch(1 0.002 60)` | `oklch(0.205 0.008 50)` | Card / elevated surfaces |
| `--secondary` | `oklch(0.965 0.005 60)` | `oklch(0.27 0.008 50)` | Secondary surfaces, default badges |
| `--muted` | `oklch(0.965 0.004 60)` | `oklch(0.27 0.008 50)` | Muted backgrounds, skeletons |
| `--muted-foreground` | `oklch(0.52 0.010 50)` | `oklch(0.70 0.010 50)` | Secondary text, captions |
| `--border` | `oklch(0.905 0.005 60)` | `oklch(1 0 0 / 8%)` | Hairline borders |
| `--input` | `oklch(0.905 0.005 60)` | `oklch(1 0 0 / 12%)` | Input borders |
| `--ring` | `oklch(0.54 0.20 28)` | `oklch(0.62 0.18 28)` | Focus ring (clay-tinted) |

---

## Shadow Tokens

Layered, soft, warm-tinted (not pure black). Defined as CSS vars and mapped to Tailwind `shadow-*` utilities.

| Token | Light (shadow color) | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px 0 oklch(0.20 0.01 50 / 0.05)` | Subtle — default surface |
| `--shadow-sm` | `0 1px 3px 0 / 0.08, 0 1px 2px -1px / 0.05` | **Card default**, buttons |
| `--shadow-md` | `0 4px 8px -2px / 0.08, 0 2px 4px -2px / 0.05` | Hover lift, dropdowns |
| `--shadow-lg` | `0 12px 24px -6px / 0.10, 0 4px 8px -4px / 0.06` | Popovers, modals, toasts |
| `--shadow-xl` | `0 20px 40px -8px / 0.12, 0 8px 16px -6px / 0.07` | Large overlays |

Dark mode shadows use pure black (`oklch(0 0 0 / ...)`) at higher opacity for depth.

---

## Radius

`--radius: 0.625rem` (10px). Derived scale: `sm` (6px), `md` (8px), `lg` (10px), `xl` (14px), `2xl` (18px), `3xl` (22px), `4xl` (26px).

---

## Type Scale

Applied via Tailwind utility classes (not forced base styles, to avoid regressions on components with explicit sizing). Convention:

| Role | Classes | Example usage |
|---|---|---|
| Display | `text-3xl font-bold tracking-tight sm:text-4xl` | Landing hero, coach page hero |
| H1 | `text-2xl font-bold tracking-tight sm:text-3xl` | Page titles |
| H2 | `text-xl font-semibold tracking-tight sm:text-2xl` | Section headers |
| H3 | `text-lg font-semibold` | Card titles, subsections |
| Body | `text-sm` or `text-base` | Default body text |
| Caption | `text-xs text-muted-foreground` | Metadata, timestamps, helper text |

`tracking-tight` on headings tightens letter-spacing for a more designed feel. `font-heading` maps to the same sans-serif stack.

---

## Shared Primitives

All primitives live in `components/ui/` and use the token system via Tailwind utilities. Each has a `data-slot` attribute for test targeting.

| Primitive | Key classes | Notes |
|---|---|---|
| **Card** | `rounded-xl border-border/70 bg-card shadow-sm transition-shadow` | Soft border (70% opacity), premium shadow, hover-transition-ready |
| **Button** (default) | `bg-primary text-primary-foreground shadow-sm hover:bg-primary/90` | Smoother hover (90% not 80%), subtle shadow |
| **Badge** | `rounded-full` + semantic variants | success/warning/info/destructive use token-based `/15` or `/20` opacity tints |
| **Skeleton** | `animate-pulse rounded-md bg-muted` | aria-hidden by default |
| **EmptyState** | `border-dashed border-border bg-card/50` | Centered, icon + title + description + action |
| **Avatar** | `rounded-full bg-muted` | Sizes: sm (28px), default (36px), lg (48px) |
| **Toaster** | `shadow-lg` + semantic border/bg | Token-based success/warning/error variants |

### Badge Variants

| Variant | Light | Usage |
|---|---|---|
| `default` | `bg-secondary text-secondary-foreground` | Neutral labels |
| `primary` | `bg-primary text-primary-foreground` | Clay accent |
| `success` | `bg-success/15 text-success` | Paid, completed, approved |
| `warning` | `bg-warning/20 text-warning-foreground` | Pending, in-review |
| `info` | `bg-info/12 text-info` | Counts, neutral info |
| `destructive` | `bg-destructive/10 text-destructive` | Expired, revoked, errors |
| `outline` | `border-border text-foreground` | Bordered, transparent |

---

## Base Rendering

- `body`: `text-rendering: optimizeLegibility`, `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale` — crisp, premium text rendering.
- `::selection`: clay-tinted selection background (18% opacity light, 25% dark).
- `html`: `scroll-behavior: smooth`, disabled under `prefers-reduced-motion`.
- Focus ring: clay-tinted (`--ring`), applied via `outline-ring/50` + `focus-visible:ring-ring/50`.

---

## Usage Rules

1. **Always use tokens** — never hardcode hex/oklch values in components. Use `bg-primary`, `text-muted-foreground`, `border-border`, `shadow-sm`, etc.
2. **Token-first, per-screen second** — change the token here to lift every screen. Don't hand-tune individual screens before the foundation is locked.
3. **Semantic over literal** — use `bg-success/15` not `bg-emerald-100`. This keeps light+dark coherent and makes theme changes a single-edit operation.
4. **Hairline borders** — `border-border` (or `border-border/70` for softer). Never use `border-foreground` or thick defaults.
5. **Shadows for depth** — `shadow-sm` for cards, `shadow-lg` for overlays. Avoid `shadow-2xl` (too heavy).
6. **Accessibility** — maintain contrast ratios (WCAG AA), keep `focus-visible` rings, respect `prefers-reduced-motion`.
7. **Baseball-specific tone** — clay + navy is the brand language. No rainbow accents. Sport-appropriate iconography and language.
