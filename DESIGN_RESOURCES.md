# OnboardX — Design Resources

> Reference document for the OnboardX website design system.
> Source of truth: `website/tailwind.config.js` + `website/src/styles/globals.css`

---

## Brand Assets

| Asset | Path | Usage |
|-------|------|-------|
| Logo | `website/src/assets/Logo.webp` | Main branding, navbar, embeds |
| Favicon | `website/src/assets/onboardx.ico` | Browser tab icon |

---

## Color Palette

All colors live under the `discord` namespace in Tailwind.

### Core Backgrounds

| Token | Hex | Role |
|-------|-----|------|
| `discord-darkest` | `#040405` | Page background |
| `discord-darker` | `#111214` | Cards, sidebar, secondary surfaces |
| `discord-dark` | `#202225` | Inputs, hover states, elevated surfaces |
| `discord-gray` | `#36393F` | Borders, dividers, scrollbar thumb |

### Text

| Token | Hex | Role |
|-------|-----|------|
| `discord-white` | `#FFFFFF` | Primary text, headings |
| `discord-lighterGray` | `#B9BBBE` | Secondary text, labels |
| `discord-lightGray` | `#72767D` | Tertiary text, hints, timestamps |

### Brand / Accent

| Token | Hex | Role |
|-------|-----|------|
| `discord-blue` | `#5865F2` | Primary CTA, links, focus rings |
| `discord-purple` | `#6C5CE7` | Alternative accent, gradients |

### Status Colors

| Token | Hex | Role |
|-------|-----|------|
| `discord-green` | `#1E9448` | Success, online, enabled |
| `discord-greenDark` | `#1B8040` | Darker variant |
| `discord-yellow` | `#FAB12F` | Warning, degraded |
| `discord-yellowDark` | `#E0A32D` | Darker variant |
| `discord-red` | `#ED4245` | Error, danger, offline |
| `discord-redDark` | `#DA373C` | Darker variant |

---

## Typography

### Font Stack

| Family | Tailwind | Usage |
|--------|----------|-------|
| **Inter** | `font-sans` | Body text, UI |
| **JetBrains Mono** | `font-mono` | Code, technical values |

Loaded via `next/font/google` in `layout.tsx`.

### Scale

| Size | Tailwind | Typical Use |
|------|----------|-------------|
| `2xl` (24px) | `text-2xl` | Hero stats, section headings |
| `lg` (18px) | `text-lg` | Card titles, page headings |
| `sm` (14px) | `text-sm` | Body text, descriptions |
| `xs` (12px) | `text-xs` | Hints, timestamps |
| `11px` | `text-[11px]` | Uptime legend, micro-labels |

### Weights

| Weight | Tailwind | Usage |
|--------|----------|-------|
| 700 | `font-bold` | Headings, stat values |
| 600 | `font-semibold` | Card titles, nav links, CTAs |
| 500 | `font-medium` | Secondary labels |
| 400 | `font-normal` | Body text (default) |

---

## Spacing and Layout

### Page Structure

Sidebar: fixed left, `w-60` (240px). Main content: `ml-60`.

### Key Dimensions

| Element | Value |
|---------|-------|
| Sidebar width | `w-60` (240px) |
| Content max-width | `max-w-3xl` (768px) or `max-w-4xl` (896px) |
| Page padding | `px-6` (24px) horizontal, `py-10` (40px) vertical |
| Section spacing | `mt-6` (24px) |
| Hero spacing | `mt-16` (64px) |
| Card padding | `p-6` (24px) or `p-8` (32px) |
| Grid gaps | `gap-4` (16px) / `gap-6` (24px) |

---

## Components

### Cards

```
rounded-2xl border border-discord-gray/20 bg-discord-darker p-6
```

Hoverable variant:
```
transition-all duration-300 hover:-translate-y-1 hover:border-discord-blue/50
hover:shadow-lg hover:shadow-discord-blue/10
```

### Buttons

**Primary (CTA):**
```
rounded-lg bg-discord-blue px-6 py-3 text-sm font-semibold text-white
transition-all duration-300 hover:-translate-y-0.5 hover:bg-discord-blue/80
hover:shadow-lg hover:shadow-discord-blue/30
```

**Secondary:**
```
rounded-lg border border-discord-gray bg-discord-dark px-6 py-3
text-sm font-semibold text-discord-white
transition-all duration-300 hover:-translate-y-0.5 hover:bg-discord-gray/50
```

**Danger:**
```
rounded-lg border border-discord-red/40 bg-discord-red/10 px-5 py-2
text-sm font-semibold text-discord-red
transition hover:bg-discord-red/20
```

**Ghost:**
```
rounded-lg border border-discord-gray/40 px-3 py-1.5
text-xs font-semibold text-discord-lighterGray
transition hover:bg-discord-gray/40
```

### Toggle Switches

```
relative h-6 w-11 rounded-full transition
  ON:  bg-discord-green       OFF: bg-discord-gray
  Knob: absolute top-0.5 h-5 w-5 rounded-full bg-white
    ON:  left-[22px]          OFF: left-0.5
```

### Inputs

```
w-full rounded-2xl border border-discord-gray/40 bg-discord-dark
px-3 py-2 text-sm text-discord-white outline-none
transition focus:border-discord-blue
```

### Select / Dropdown

`.discord-select` class from globals.css:
```
border-radius: 1rem
border: 1px solid rgba(54, 57, 63, 0.55)
background: #202225
padding: 0.625rem 2.25rem 0.625rem 1rem
font-size: 0.875rem
```

Focus: blue border + `box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.3)`

### Stat Cards (Homepage)

```
rounded-2xl border border-discord-gray/30 bg-discord-dark p-6
hover: hover:-translate-y-1 hover:border-discord-blue/50
Value: text-2xl font-bold text-discord-blue
Label: mt-1 text-sm text-discord-lighterGray
```

### Feature Cards (Homepage)

```
h-full rounded-2xl border border-discord-gray/30 bg-discord-dark p-6
Dot: h-2.5 w-2.5 rounded-full bg-discord-blue animate-pulse
Title: font-semibold text-discord-white
Text:  mt-2 text-sm text-discord-lighterGray
```

### Module Toggle Cards (Dashboard)

```
rounded-xl border p-4
  ON:  border-discord-blue/50 bg-discord-blue/10
  OFF: border-discord-gray/20 bg-discord-dark hover:bg-discord-gray/30
```

---

## Animations

| Class | Duration | Usage |
|-------|----------|-------|
| `animate-fade-in-up` | 0.7s ease-out | Page transitions, card reveals |
| `animate-float-y` | 6s infinite | Hero elements, decorative |
| `animate-glow` | 4s infinite | Glow effects |
| `animate-gradient-x` | 6s infinite | Gradient backgrounds |
| `animate-spin-slow` | 24s infinite | Decorative spinners |
| `animate-tooltip` | 0.18s | Tooltip appearance |

All disabled when `prefers-reduced-motion: reduce`.

Staggered reveals via `<Reveal delay={ms}>`.

---

## Scrollbar

| Part | Color |
|------|-------|
| Track | `#111214` |
| Thumb | `#36393F` |
| Thumb hover | `#5865F2` |
| Width | 10px |

---

## Selection

```css
::selection { color: #ffffff; background: #5865f2; }
```

---

## Focus Styles

- **Inputs**: `focus:border-discord-blue`
- **Checkboxes/Radios**: `accent-color: #5865F2`
- **Select**: blue border + `box-shadow: 0 0 0 3px rgba(88, 101, 242, 0.3)`
- **Cards**: `hover:border-discord-blue/50`

---

## Elevation / Shadows

| Level | Class | Usage |
|-------|-------|-------|
| Subtle | `shadow-discord-blue/10` | Card hover |
| Medium | `shadow-discord-blue/30` | CTA button hover |
| Glow | `animate-glow` | Decorative hero |

---

## Border Patterns

| Pattern | Usage |
|---------|-------|
| `border border-discord-gray/20` | Cards, containers |
| `border border-discord-gray/30` | Stat cards, uptime |
| `border border-discord-gray/40` | Ghost buttons |
| `border-b border-discord-gray/20` | Header dividers |
| `border-t border-discord-gray/30` | Footer separators |

---

## Uptime Tracker Bar Colors

| Condition | Color |
|-----------|-------|
| >= 99% | `bg-discord-green` |
| >= 90% | `bg-discord-yellow` |
| < 90%  | `bg-discord-red` |
| no data | `bg-discord-gray/40` |

---

## Responsive Breakpoints

Standard Tailwind breakpoints:
- `sm:` 640px (2-col grids)
- `md:` 768px
- `lg:` 1024px (3-col grids)

---

## Page-Specific Notes

### Homepage (`/`)
- Hero section with animated elements
- Stats row (3 cards, 3-col grid on sm+)
- Uptime tracker (above features)
- Features section (2-col grid on sm+)

### Dashboard (`/dashboard`)
- Login card when unauthenticated
- Server grid (3-col on lg, 2-col on sm)
- Guild settings: prefix, language, module toggles

### Status (`/status`)
- Maintenance banner (yellow)
- Live status grid (4-col on sm+)
- Cluster/shard table

### Admin (`/admin`)
- Auth gate (password or Discord OAuth)
- Bot overview, cluster list, command queue
