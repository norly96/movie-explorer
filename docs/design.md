# Design System — movie-explorer

Single source of truth for visual decisions. Per AGENTS.md → Hard rules,
every color, size, radius and duration comes from this file. No arbitrary
Tailwind values (`[#...]`, `[13px]`).

## Principles

1. **Posters are the hero.** The UI is quiet so the artwork stands out.
   No gradients, decorative illustrations or background textures.
2. **Amber is scarce.** The accent is reserved for ratings, the primary
   action on a screen and keyboard focus. If everything is amber, nothing is.
3. **Elevation through surfaces, not shadows.** Shadows are nearly invisible
   on dark backgrounds, so depth comes from lighter surface tokens and borders.
4. **Motion answers the user.** Transitions only respond to user actions
   (hover, open, load). No decorative entrance animations.
5. **Dark only.** There is one theme. No light mode, no theme toggle.

## Color

All text/background pairs below are verified against WCAG 2.1 AA.

| Token | Hex | Use |
|---|---|---|
| `background` | `#0B0B0D` | Page background |
| `surface` | `#141417` | Cards, panels, inputs |
| `surface-raised` | `#1C1C21` | Hover state of surfaces, menus, dialogs |
| `border` | `#2A2A31` | Decorative dividers and card outlines |
| `border-strong` | `#62626C` | Input and secondary button outlines |
| `foreground` | `#EDEDEF` | Primary text |
| `muted` | `#A1A1AA` | Secondary text (year, runtime, metadata) |
| `subtle` | `#8A8A94` | Placeholders, helper text |
| `accent` | `#F5B83D` | Ratings, primary button, focus ring, active links |
| `accent-hover` | `#FFC857` | Hover state of accent elements |
| `accent-foreground` | `#0B0B0D` | Text on accent backgrounds |
| `danger` | `#F87171` | Error messages and error icons |

### Contrast (verified)

| Pair | Ratio | Requirement |
|---|---|---|
| `foreground` on `surface-raised` | 14.51 | 4.5 ✅ |
| `muted` on `surface-raised` | 6.62 | 4.5 ✅ |
| `subtle` on `surface-raised` | 4.96 | 4.5 ✅ |
| `accent` on `surface-raised` | 9.54 | 4.5 ✅ |
| `danger` on `surface-raised` | 6.14 | 4.5 ✅ |
| `accent-foreground` on `accent` | 11.06 | 4.5 ✅ |
| `border-strong` on `surface` | 3.05 | 3.0 ✅ (UI components) |

`surface-raised` is the worst case; every pair passes on lighter-contrast
backgrounds too. `border` (1.29–1.38) is decorative only and must never be
the sole boundary of an interactive element.

## Typography

**Family:** Geist, loaded with `next/font` (no extra dependency).
**Numbers:** use `tabular-nums` for ratings, years and runtimes so they align
in lists. No monospace font.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `text-xs` | 12 / 16 | 400 | Badges, legal text |
| `text-sm` | 14 / 20 | 400 | Metadata, helper text, card title |
| `text-base` | 16 / 24 | 400 | Body text, overview |
| `text-lg` | 20 / 28 | 600 | Section titles ("Popular") |
| `text-xl` | 24 / 32 | 600 | Page titles |
| `text-2xl` | 32 / 40 | 600 | Movie title on detail page |

Rules:
- Sentence case everywhere. No all-caps labels.
- Weights allowed: 400 and 600. Nothing else.
- Body text line length max ~70 characters (`max-w-prose`).
- Card titles clamp to 2 lines (`line-clamp-2`).

## Spacing

Base unit 4px (Tailwind's default `--spacing: 0.25rem`).
Allowed steps: `1` (4) · `2` (8) · `3` (12) · `4` (16) · `6` (24) · `8` (32) · `12` (48) · `16` (64).

| Context | Value |
|---|---|
| Inside badges | `px-2 py-1` |
| Inside buttons and inputs | `px-4 py-2` |
| Inside cards (text area) | `p-3` |
| Gap between cards | `gap-4` mobile, `gap-6` from `md` |
| Gap between page sections | `gap-12` |
| Page horizontal padding | `px-4` mobile, `px-8` from `lg` |
| Max content width | `max-w-7xl`, centered |

## Radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 4px | Badges, inputs, posters |
| `radius-md` | 6px | Buttons, cards, dialogs |

No other radius values. No fully rounded pills.

## Layout

### Breakpoints
Tailwind defaults: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. Mobile first.

### Movie grid

| Viewport | Columns |
|---|---|
| < 640 | 2 |
| `sm` | 3 |
| `md` | 4 |
| `lg` | 5 |
| `xl` | 6 |

### Posters
- Aspect ratio 2:3 via the `aspect-poster` utility (defined in `@theme`).
- Always rendered with `next/image` and a `sizes` attribute matching the grid.
- Missing poster: `surface-raised` background with a centered film icon in
  `subtle`, same aspect ratio. Never a broken image.

## Motion

| Token | Value | Use |
|---|---|---|
| `duration-fast` | 150ms | Color and border changes on hover/focus |
| `duration-base` | 250ms | Opening menus, dialogs, image fade-in |
| Easing | `ease-out` | All transitions |

- CSS transitions only (Framer Motion is rejected in the stack).
- Only `color`, `background-color`, `border-color` and `opacity` are animated.
  No scaling or movement on hover.
- Everything respects `prefers-reduced-motion: reduce` (transitions disabled).

## Icons

Custom inline SVG components in `components/icons/`. No icon library.

- One component per icon, PascalCase with `Icon` suffix: `StarIcon.tsx`.
- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
  `stroke-width="1.5"`, rounded caps and joins.
- Color always inherited via `currentColor`, never hardcoded.
- Sizes: 16 (inline with `text-sm`), 20 (default, buttons), 24 (standalone).
- Decorative icons: `aria-hidden="true"`.
- Icon-only buttons: `aria-label` on the button, minimum hit area 40×40px.

Initial set: `StarIcon`, `SearchIcon`, `FilmIcon`, `HeartIcon`,
`ArrowLeftIcon`, `AlertIcon`, `CloseIcon`.

## Interaction states

| State | Treatment |
|---|---|
| Hover (surface) | `surface` → `surface-raised` |
| Hover (accent) | `accent` → `accent-hover` |
| Focus | `focus-visible` only: 2px `accent` outline, 2px offset |
| Disabled | 40% opacity, `cursor-not-allowed`, no hover change |
| Loading | Skeleton with the exact size of the final component |

Never remove the focus outline without replacing it.

## Components

### Button
| Variant | Style | Use |
|---|---|---|
| Primary | `accent` bg, `accent-foreground` text | One per screen at most |
| Secondary | Transparent, `border-strong` outline, `foreground` text | Other actions (Retry) |
| Ghost | Transparent, `muted` text → `foreground` on hover | Low-emphasis actions, icon buttons |

All: `radius-md`, `text-sm`, weight 600, `px-4 py-2`, icon 20px with `gap-2`.

### MovieCard
- Whole card is a single link to the detail page.
- Structure: poster (2:3, `radius-sm`) → `p-3` text area.
- Title: `text-sm`, `foreground`, 2 lines max.
- Metadata row: year in `muted`, rating on the right.
- Hover: title changes to `accent`. The poster does not move or scale.

### RatingBadge
- `StarIcon` 16px filled with `accent` + score with one decimal.
- `text-sm`, weight 600, `tabular-nums`, `accent` color.
- Screen readers: "Rated 7.8 out of 10".
- Score 0 (unrated): show "No rating" in `subtle`, no star.

### MovieCardSkeleton
- Same dimensions as `MovieCard`.
- `surface-raised` blocks for poster, title and metadata.
- Pulse via opacity (`animate-pulse`), disabled with reduced motion.

### SearchInput
- `surface` bg, `border-strong` outline, `radius-sm`, `text-base`
  (16px prevents iOS zoom).
- `SearchIcon` 20px in `subtle` on the left.
- Visible `<label>` or `aria-label`; placeholder never replaces the label.

### ErrorState
- Centered: `AlertIcon` 24px in `danger`, message in `foreground`,
  secondary "Try again" button.
- Message says what failed and what to do. No apologies.
  Example: "Couldn't load popular movies. Check your connection and try again."

### EmptyState
- Centered: `FilmIcon` 24px in `subtle`, message in `muted`,
  optional action.
  Example: "No movies match "zzz". Try a different title."

## Implementation (Tailwind v4)

`app/globals.css`:

```css
@import "tailwindcss";

@theme {
  /* Remove Tailwind's default palette: only tokens below can be used */
  --color-*: initial;

  --color-background: #0B0B0D;
  --color-surface: #141417;
  --color-surface-raised: #1C1C21;
  --color-border: #2A2A31;
  --color-border-strong: #62626C;
  --color-foreground: #EDEDEF;
  --color-muted: #A1A1AA;
  --color-subtle: #8A8A94;
  --color-accent: #F5B83D;
  --color-accent-hover: #FFC857;
  --color-accent-foreground: #0B0B0D;
  --color-danger: #F87171;
  --color-transparent: transparent;
  --color-current: currentColor;

  --radius-sm: 4px;
  --radius-md: 6px;

  --aspect-poster: 2 / 3;

  --ease-out: cubic-bezier(0, 0, 0.2, 1);
}

@theme inline {
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  html {
    color-scheme: dark;
    background-color: var(--color-background);
    color: var(--color-foreground);
  }

  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

`app/layout.tsx`:

```tsx
import { Geist } from "next/font/google";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

`--color-*: initial` removes Tailwind's built-in colors, so `bg-red-500`
or `text-zinc-400` fail to generate. This enforces principle 8 automatically.

## Checklist for every UI PR

- [ ] Only tokens from this file; no arbitrary values.
- [ ] Loading, empty and error states implemented where data is fetched.
- [ ] Keyboard: every action reachable with Tab, visible focus ring.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Images use `next/image` with `sizes`; missing posters show the fallback.
- [ ] Checked at 375px and 1280px wide.