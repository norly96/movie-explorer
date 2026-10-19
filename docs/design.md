# Design System — movie-explorer

Single source of truth for visual decisions. Per AGENTS.md → Hard rules,
every color, size, radius and duration comes from this file. No arbitrary
Tailwind values (`[#...]`, `[13px]`).

## Principles

1. **Posters are the hero.** The UI is quiet so the artwork stands out.
   No decorative illustrations or background textures (no film grain). The
   only gradients are the page background's and the featured hero's dark
   layer: they give depth and keep text readable without competing with the
   artwork (home redesign, see *Page background* and *FeaturedHero*).
2. **Amber is scarce.** The accent is reserved for ratings, the primary
   action on a screen, keyboard focus, the current navigation link, the
   hover border of a movie card and the soft glow of the page background
   (low opacity, lower left, never at the top). If everything is amber,
   nothing is.
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

Pairs over the page background's gradient and glow, over the tinted bands and
over the hero's image are **not** listed here: they are measured at the worst
point during the home redesign (computed tests plus recorded checks), because
a single ratio cannot describe a changing background.

### Page background (every page)

Drawn as **one fixed layer behind the content**, sized to the large viewport so
a phone's browser bar does not make it jump. Never `background-attachment:
fixed`. Colors come from the tokens above; only the amounts below are new.

| Token | Wide (≥ `lg`) | Narrow | Use |
|---|---|---|---|
| `page-gradient-height` | 520px | 540px | Height over which `surface` fades into `background`, from the top |
| `glow-opacity` | 9% | same | `accent` at this opacity. The design canvas used 30%, but at that value `muted` text falls to 3.95:1 and `subtle` to 2.96:1 at the glow's center, below the 4.5:1 that WCAG AA needs. At 9% they keep 6.70:1 and 5.02:1, and `subtle` still keeps 4.56:1 where the bar's tint overlaps the glow (at 10% that case gives 4.46:1). Any increase must be re-checked by the contrast test |
| `glow-size` | 760 × 300px | 340 × 260px | Ellipse of the glow |
| `glow-y` | 620px | 640px | Distance from the top; centered on the left edge |
| `tint-header` | 5% | 5% | `foreground` at the top of the header, fading to 0 |
| `tint-bar` | 4% (peak at 40%) | 4% | `foreground` over the search and filters bar, fading out both ends |

Rules: no dividing lines (no 1px borders) between header, hero, search and
filters bar and results — the tints and the gradient separate them. The glow
sits lower left and never at the top.

### Hero layers

| Token | Value | Use |
|---|---|---|
| `hero-fade-wide` | transparent at 0%, opaque from 18% to 50%, transparent at 100% (vertical) | Mask that melts the image into the page |
| `hero-fade-narrow` | transparent at 0%, opaque from 14% to 45%, transparent at 100% (vertical) | Same, stacked layout |
| `hero-scrim` | `background` at 100% opacity at 0%, 92% at 34%, 35% at 62%, 0% at 100% (horizontal, from the left, wide layout) | Keeps the text readable over any image |

The scrim stops are the starting values: they stand only if the contrast test
passes (4.5:1 for text, 3:1 for the large title, against a pure white image, at
1280, 1440 and 1920 px); otherwise they are strengthened under the text only.

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
| `text-hero` | 40 / 48 | 600 | Featured hero title, wide layout |
| `text-hero-sm` | 28 / 36 | 600 | Featured hero title, narrow layout |

Rules:
- Sentence case everywhere. No all-caps labels. **One exception:** the
  featured hero's movie title is capitalized with CSS only (never typed in
  capitals), on at most 2 lines with balanced wrapping; assistive technology
  reads the text as written. Reason: it is a showcase title, the one place
  where a cinematic look helps the first impression, and capitals made by CSS
  cost nothing for screen readers (long titles are clamped because capitals
  are about 25% wider).
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

### Named sizes outside the 4px steps

Added by the home redesign; use these names, never arbitrary values.

| Token | Value | Use |
|---|---|---|
| `size-control` | 44px | Height of the search field, selectors and "Clear filters" on wide screens; "Details" button on wide screens |
| `size-control-touch` | 48px | Same controls on phones (and the full-width "Details" button) |
| `size-icon-button` | 44px | Square hit area of the header's external links |
| `size-brand-icon` | 28px | Header logo |
| `size-header` | 64px | Header height on wide screens |
| `size-header-narrow` | 56px | First row of the header on narrow screens (the second row is `size-control`, 44px) |
| `size-hero` | 320px | Minimum height of the hero on wide screens; it grows with the text, never a fixed height |
| `size-back-to-top` | 48px | Back-to-top button |

## Radius

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 4px | Badges, inputs, posters |
| `radius-md` | 6px | Buttons, cards, dialogs |

No other radius values. No fully rounded pills.

## Layout

### Breakpoints
Tailwind defaults: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280. Mobile first.

**Extra small:** `xs` is 360px, used only by the header: below it the brand's text is
hidden visually (its logo and accessible name remain), because the brand and the
three external links no longer fit side by side.

**Wide and narrow:** "wide" is `lg` (1024px) and up, "narrow" is below it. The
header, the hero, the search and filters bar and the back-to-top offsets switch
there. Between 640 and 1023px the narrow layout is used with its content
centered and limited in width; the movie grid keeps the columns below.

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
| `duration-fast` | 150ms | Color and border changes on hover/focus; the movie card's hover |
| `duration-appear` | 200ms | The back-to-top button's fade and 8px rise |
| `duration-base` | 250ms | Opening menus, dialogs, image fade-in; the hero curtain's fade |
| `duration-curtain` | 400ms | The hero curtain's height and upward movement |
| `scale-card-hover` | 1.03 | The movie card's enlargement on hover |
| Easing | `ease-out` | All transitions |

- CSS transitions only (Framer Motion is rejected in the stack).
- Animated properties are `color`, `background-color`, `border-color` and
  `opacity`. `transform` is allowed in exactly two places: the movie card's
  hover enlargement (reason: a clear answer to the pointer, so the visitor knows
  which movie will open) and the back-to-top button's rise (reason: a short
  appearance that is not mistaken for a layout change).
- **The hero curtain is a documented exception:** it animates the hero's height
  together with its upward movement and opacity. It only happens after a
  visitor's action (typing, choosing a filter, clearing, browser back and
  forward), never while the page loads, lasts under half a second and is
  disabled with reduced motion.
- Movement exists in three cases only — the hero curtain, the back-to-top
  button's appearance and the movie card's hover — plus the loading skeletons'
  pulse. Nothing animates in while the page loads and nothing moves on its own.
- Everything respects `prefers-reduced-motion: reduce`: no curtain, no fade or
  rise, no card enlargement, no smooth scroll, and the skeletons stand still
  (their pulse is switched off, not merely shortened). Responses that carry
  information (a color or border change) remain.

## Icons

Custom inline SVG components in `components/icons/`. No icon library.

- One component per icon, PascalCase with `Icon` suffix: `StarIcon.tsx`.
- `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
  `stroke-width="1.5"`, rounded caps and joins.
- Color always inherited via `currentColor`, never hardcoded.
- Sizes: 16 (inline with `text-sm`), 20 (default, buttons), 24 (standalone).
- Decorative icons: `aria-hidden="true"`.
- Icon-only buttons: `aria-label` on the button, minimum hit area 44×44px.

Initial set: `StarIcon`, `SearchIcon`, `FilmIcon`, `HeartIcon`,
`ArrowLeftIcon`, `AlertIcon`, `CloseIcon`.

Added by the home redesign: `ArrowUpIcon`, `ArrowRightIcon`, `ChevronDownIcon`,
`ClapperboardIcon` (the site logo), and the three header icons —
`AuthorLogoIcon`, `LinkedInIcon`, `GitHubIcon`. `AlertIcon` and `FilmIcon` are
drawn in the style above; the others come from the approved design canvas, and
the author's own icons replace the canvas glyphs when supplied.

## Interaction states

| State | Treatment |
|---|---|
| Hover (surface) | `surface` → `surface-raised` |
| Hover (accent) | `accent` → `accent-hover` |
| Hover (movie card) | Only on pointers that can hover: `accent` 2px border, `accent` title, enlargement by `scale-card-hover`; no enlargement under reduced motion or on keyboard focus |
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
- Every card has a **transparent 2px border at rest**, so hovering adds no
  layout shift. The skeleton has the same border.
- Hover (pointers that can hover only): the border becomes `accent`, the title
  becomes `accent` and the card enlarges by `scale-card-hover` over
  `duration-fast`. The hovered card is raised above its neighbors so it is never
  covered or clipped; the neighbors and the layout do not move. Under reduced
  motion the border and the title still change but the card does not enlarge;
  on touch screens there is no hover. The keyboard focus indicator is unchanged
  and the card does not enlarge on focus.
- Missing poster: see *Posters* — the same surface with the film icon.

### RatingBadge
- `StarIcon` 16px filled with `accent` + score with one decimal.
- `text-sm`, weight 600, `tabular-nums`, `accent` color.
- Screen readers: "Rated 7.8 out of 10".
- Score 0 (unrated): show "No rating" in `subtle`, no star.

### MovieCardSkeleton
- Same dimensions as `MovieCard`.
- `surface-raised` blocks for poster, title and metadata.
- Pulse via opacity (`animate-pulse`); with reduced motion the animation is
  switched off entirely (`motion-reduce:animate-none`), not merely shortened.

### SearchInput
- `surface` bg, `border-strong` outline, `radius-sm`, `text-base`
  (16px prevents iOS zoom).
- `SearchIcon` 20px in `subtle` on the left.
- Visible `<label>` or `aria-label`; placeholder never replaces the label. In
  the redesigned bar the label may be visually hidden but stays a real
  `<label>` that names the field.
- Height `size-control` on wide screens and `size-control-touch` on phones.

### ErrorState
- Centered: `AlertIcon` 24px in `danger`, message in `foreground`,
  secondary "Try again" button.
- Message says what failed and what to do. No apologies.
  Example: "Couldn't load popular movies. Check your connection and try again."

### EmptyState
- Centered: `FilmIcon` 24px in `subtle`, message in `muted`,
  optional action.
  Example: "No movies match "zzz". Try a different title."

### SiteHeader (every page)
- Not fixed: it scrolls away with the page. Transparent, with the `tint-header`
  fade; no bottom border.
- Wide: one row of `size-header` height, 32px side padding — brand
  (`ClapperboardIcon` at `size-brand-icon` + "Movie-explorer" at `text-lg`,
  weight 600, linking home), the links "Home" and "About" 24px apart (16px
  text), and at the right the three external links.
- Narrow: a 56px row (brand at 18/28 weight 600, external links) and a 44px row
  ("Home", "About"); side padding 16px; no menu toggle. At 320px the brand's text
  is hidden visually and its accessible name remains.
- Current page: the link is `accent`, weight 600 and has a 2px `accent`
  underline, and it is marked as the current page for assistive technology (not
  color alone). The other links are `muted`.
- External links: `size-icon-button` squares, 8px apart, 1px `border` outline,
  `radius-md`, 20px icon in `muted`, open in a new tab and say so in their
  accessible name. A link appears only if its address is a complete `https`
  address.
- Keyboard order equals visual order at every width, so the two layouts are two
  variants of the markup, of which only one is shown.
- First on the page: a "Skip to content" link, visible only on focus.

### FeaturedHero (home, popular list, no search and no filter)
- A `section` between the header and the search and filters bar; never an
  `article`. Shows the most popular movie, in order, that has a backdrop: title
  (`text-hero`, capitalized by CSS, 2 lines at most), a data line in `muted`
  (first genre · year · rating in `accent` with a 16px star, tabular numbers),
  the synopsis in `foreground` limited to 3 lines (omitted when empty), and a
  primary "Details" button (`size-control`, `radius-md`, `ArrowRightIcon`) whose
  accessible name includes the title.
- Wide: `size-hero` minimum height; the image fills the area with `hero-fade-wide`
  and `hero-scrim`; the text column is at most 520px wide.
- Narrow: the image on top at 16:9 with `hero-fade-narrow`, the text below on the
  page background (title `text-hero-sm`), and the "Details" button full width at
  `size-control-touch`.
- The image is decoration (empty description). If it fails to load, the hero
  stays with its text on a plain background. No duration, no age rating.
- The curtain: when a search or filter makes the hero disappear it rolls up and
  fades (`duration-curtain`, `duration-base`) and comes back the same way. While
  hidden it is unreachable by keyboard and by assistive technology. No animation
  on the first render or with reduced motion.

### Search and filters bar (home)
- Wide: one row inside `max-w-7xl` — search field (flexible, about 420px), then
  Genre, Year, Sort (190 / 130 / 210px) and "Clear filters" (132px), 12px apart.
  Narrow: the search field full width, then a two-column grid of Genre, Year,
  Sort and "Clear filters".
- Selectors: `background` fill, `border-strong` outline, `radius-sm`, `text-base`,
  `ChevronDownIcon` 20px in `muted`; "Clear filters" is the Secondary button.
- The room of "Clear filters" is always reserved (it only appears and
  disappears), so nothing moves when it toggles. The bar's faint tint is
  `tint-bar`; it has no border.
- Results heading above the grid: `text-lg`, weight 600 — "Popular movies",
  `Results for “<text>”`, or the active filters joined by " · " (genre, year,
  sort). It is the target of the back-to-top button's focus.

### BackToTopButton (home only)
- `size-back-to-top` square, `surface-raised` fill, 1px `border-strong` outline,
  `radius-md`, 20px `ArrowUpIcon` in `foreground`; on hover the border and the
  icon become `accent`. Icon-only, named "Back to top of results".
- Fixed at the bottom right: 24px from the edges wide, 16px narrow, clear of the
  device's reserved areas. Appears after scrolling about 300px past the search
  and filters bar (fade and 8px rise, `duration-appear`); hidden it is not
  focusable. Activating it scrolls to the bar and moves focus to the results
  heading (smooth scroll only without reduced motion). It must never cover the
  focused element.

### About page
- Its own page heading and the shared main area. Its content is the TMDB
  attribution: the notice required by TMDB's API terms of use, "This website uses
  TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by
  TMDB.", and TMDB's logo (the short blue variant, unmodified, about 24px high),
  less prominent than the application's own name and mark, with nothing implying
  an endorsement.

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

  /* Home redesign: named sizes, type, durations and scale (values above) */
  --text-hero: 2.5rem;
  --text-hero--line-height: 3rem;
  --text-hero-sm: 1.75rem;
  --text-hero-sm--line-height: 2.25rem;
  --size-control: 2.75rem;
  --size-control-touch: 3rem;
  --size-icon-button: 2.75rem;
  --size-brand-icon: 1.75rem;
  --size-header: 4rem;
  --size-header-narrow: 3.5rem;
  --size-hero: 20rem;
  --size-back-to-top: 3rem;
  --duration-appear: 200ms;
  --duration-curtain: 400ms;
  --scale-card-hover: 1.03;
  --breakpoint-xs: 22.5rem;
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
- [ ] Checked at 375px and 1280px wide (and at 320px for anything in the header).
- [ ] Motion only in the allowed cases, and nothing moves with reduced motion.
- [ ] Contrast measured at the worst point over gradients, glow and images.
- [ ] Touch targets of at least 44px; no fixed heights that cut text at 200% size.