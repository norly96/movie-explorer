# Spec 4 — Home redesign

## Context and goal
The app works (popular list, filters, search, infinite scroll, detail page) and
is deployed, but the first screen a visitor sees is a bare grid: no header, no
featured movie, no way to tell who built it, no TMDB attribution, and a few
measured weaknesses (mobile performance score right at the 90 limit, no page
title of its own, no heading on the home). This spec gives the home a proper
first impression and fixes those weaknesses **without changing how the explorer
behaves**.

The main goal is to impress the people who review this repository as a
portfolio: the first screen must look polished and finished, load fast and be
accessible. The explorer (grid, filters, search, infinite scroll) keeps working
exactly as before; it is not what this spec optimizes.

The main flow the redesign must make easy: the visitor lands on the home, sees
the featured movie, opens its detail page with one action, and can come back and
try the search and filters.

Scope: **only the home page and the elements shared by every page** (header,
background, the main-content landmark, the About page and the icons of the shared
components). The movie detail page is not redesigned; it only receives what is
shared. Everything else about it (trailer, metadata, gallery, image sizes, its
Lighthouse measurement) goes to a later audit spec.

Most visual and behavioral decisions were taken beforehand in the design canvas
of the home redesign (desktop, mobile, mobile with filters, and two interactive
prototypes). This spec states them as requirements and records their values in
Appendix A, so that the repository does not depend on the canvas. The deployed
address stays public but unannounced; announcing it is the maintainer's
decision, outside this spec.

## Users / actors
- **Visitor, mainly a reviewer of the portfolio**: opens the home, judges the
  first impression and the quality of the interface, follows a movie to its
  detail page, may try the filters, may follow the author's links.
- **Visitor looking for movies**: uses the explorer exactly as before.
- **Maintainer** (the repository owner): provides the three links and the logo
  shown in the header, and needs the site to comply with TMDB's attribution
  requirement.
- **Assistive-technology and keyboard users**: every part of the new interface
  must work for them.

## User stories
- H1: As a reviewer, I want a clear header and a featured movie on the first
  screen, so that the project looks polished and finished at first glance.
- H2: As a visitor, I want to open the featured movie's detail page with one
  action, so that I can see what the app offers beyond the list.
- H3: As a visitor, I want the featured movie to step aside as soon as I search
  or filter, so that my results are the focus and not pushed down the page.
- H4: As a visitor on a long list, I want a button that takes me back to the
  search and filters, so that I can change them without scrolling all the way up.
- H5: As a reviewer, I want links to the author's own site, LinkedIn and GitHub
  in the header, so that I can reach the author directly.
- H6: As the maintainer, I want an About page with the TMDB attribution, so that
  the site meets TMDB's terms of use.
- H7: As a visitor on a phone, I want all of this to be comfortable to use with
  a thumb, so that the redesign is not just for desktop screens.
- H8: As a visitor with a mouse, I want a movie card to answer when I point at
  it (gold border and a slight enlargement), so that the page feels alive and I
  know which movie I am about to open.
- H9: As a maintainer, I want the redesign to raise the measured scores and not
  lower them, so that the quality bar of the constitution (accessibility,
  Lighthouse ≥ 90) is met on the real, public address.

## Functional requirements (EARS acceptance criteria)
Requirement numbers are stable identifiers, grouped by topic.

**Header and navigation**
- RF-1: THE SYSTEM shows the same header at the top of every page (home, movie
  detail, About and the not-found pages): the site's logo and name
  ("Movie-explorer"), which link to the home, and the links "Home" and "About".
  The other pages keep their content and layout; they receive only what is shared
  by every page: this header, the background of RF-27, the main-content landmark
  of RF-5 and the icons of the shared components of RF-35.
- RF-2: WHILE the visitor is on the page that a header link points to, THE
  SYSTEM marks that link as the current page in a way that does not depend on
  color alone (accent color, bolder text and a visible underline) and exposes it
  as the current page to assistive technology.
- RF-3: THE SYSTEM shows at the right of the header three external links, each
  with its own icon: the author's own site (whose icon is the author's logo),
  LinkedIn and GitHub. Their addresses are defined in one site configuration
  file. Each link opens in a new tab and its accessible name says so. THE SYSTEM
  shows a link only when its address is a complete `https` address; IF it is
  empty, malformed or uses another scheme, THEN that link is not shown, so that no
  dead or unsafe link is ever published.
- RF-4: THE SYSTEM lays the header out on two rows on narrow screens (below
  1024 px; brand and external links on the first, "Home" and "About" on the
  second), without a menu toggle, and the header scrolls away with the page (it is not fixed). At every
  width, the keyboard order of the header is the same as its visual order. WHEN
  the screen is 320 px wide, THE SYSTEM hides the brand's text visually and keeps
  its logo and its accessible name.
- RF-5: THE SYSTEM provides, as the first focusable element of every page, a
  "Skip to content" link that becomes visible when it receives focus and moves
  focus to the page's main content. THE SYSTEM provides one main-content area
  for every page through the shared layout, so that the link always has a target
  (including on the not-found pages); the pages no longer declare their own.

**Featured movie (hero)**
- RF-6: WHEN the visitor opens `/` with no search text and no filter active, THE
  SYSTEM shows, between the header and the search and filters, a featured movie:
  the most popular movie, taken in order, that has a background image. It shows
  its title, its first genre (the first of its genres that has a name in the genre
  list; omitted when none has), its release year, its rating out of
  10, its synopsis limited to three lines, a large background image and a
  "Details" link to that movie's detail page. The link's accessible name includes
  the movie's title.
- RF-7: THE SYSTEM takes the featured movie from the popular-movies response that
  the page itself uses for the grid: the one rendered by the server when the page
  opens on the popular list, or the one the grid requests when the visitor clears
  the filters of a page that was opened with filters (the hero then opens when
  that response arrives). Showing it must not cause any additional request to
  the TMDB API (the images are separate requests to TMDB's image server).
- RF-8: THE SYSTEM keeps the featured movie also in the grid, in its own
  position; the grid is not altered to avoid the repetition.
- RF-9: IF no movie of the first page of the popular list has a background image,
  or that list is empty or unavailable, THEN THE SYSTEM shows no hero at all and
  the rest of the page (header, search and filters, results or the existing error
  or empty state) appears and works as usual, with nothing reserved or drawn in
  its place.
- RF-10: IF the hero's background image fails to load, THEN THE SYSTEM keeps the
  hero with its text, genre, year, rating and "Details" link on a plain dark
  background.
- RF-11: WHILE the search field contains any text (even a single character or
  spaces) or any filter is active, THE SYSTEM does not show the hero; it hides it
  as soon as the first character is typed, without waiting for the search to
  become active. WHEN everything is cleared again, THE SYSTEM shows it again (RF-7
  says where its data comes from).
- RF-12: WHEN the hero appears or disappears because of the visitor's action (a
  control, or the browser's back and forward buttons), THE SYSTEM animates it like
  a curtain: it rolls up and fades out in about 400 ms
  and 250 ms respectively, and the reverse when it returns, with the content
  below following without a jump. THE SYSTEM does not animate when the visitor
  prefers reduced motion, nor on the first render (a URL that already carries
  filters is rendered without the hero). This curtain animates the hero's height,
  an exception to the rule of animating only transform and opacity, accepted
  because it only happens after the visitor's action, never while the page loads,
  lasts under half a second and is disabled with reduced motion. WHEN a filter is
  changed, or a search becomes active, while the hero is visible, THE SYSTEM
  leaves the results heading at the top edge of the visible area once the curtain
  has finished and the change has been applied, whichever comes later
  (immediately when there is no animation).
- RF-13: WHILE the hero is hidden, THE SYSTEM makes it unreachable by keyboard
  and by assistive technology. IF the keyboard focus is inside the hero when it
  becomes hidden, THEN THE SYSTEM moves it to the search field.
- RF-14: THE SYSTEM shows the hero's title in capital letters visually only, on
  at most two lines; assistive technology reads it as written.
- RF-15: THE SYSTEM gives the home exactly one top-level heading, always present
  for assistive technology (visible or visually hidden), and the featured movie's
  title is a lower-level heading.
- RF-16: THE SYSTEM never shows data the movie does not provide (a missing genre
  is simply omitted; an unrated movie follows the rating component's rule); the
  hero has no duration and no age rating.
- RF-17: THE SYSTEM treats the hero's background image as decoration (empty
  description, since the title already names the movie), and keeps all of the
  hero's text readable over it: a contrast of at least 4.5:1 (3:1 for the large
  title) against a pure white image, at every position the text can reach, at
  widths of 1280, 1440 and 1920 px. The layer values of Appendix A stand if they
  pass this measurement; otherwise the layer is strengthened under the text,
  without changing how the image looks elsewhere.

**Search, filters and results**
- RF-18: THE SYSTEM presents the search field, the genre, year and sort controls
  and the "Clear filters" control in a redesigned bar, without changing what any
  of them does (the behavior defined in the explore-filters spec stays as it is).
  On wide screens (1024 px and up) the bar is one row, with the search field
  shrinking to fit; on narrow screens the three selectors and "Clear filters" are
  laid out in two columns under the search field.
- RF-19: THE SYSTEM keeps the room of "Clear filters" reserved when the control
  is not shown, so that showing or hiding it never moves any other control or the
  content.
- RF-20: THE SYSTEM makes every control of the bar at least 44 px high (48 px on
  phones), and the text of the search field and the selectors 16 px, so that phone
  browsers do not zoom in on focus; the "Clear filters" button follows the button
  style of `design.md` (14 px text).
- RF-21: THE SYSTEM shows, above the results, a heading that says what is being
  shown: "Popular movies" by default; `Results for “<text>”` (the trimmed text)
  when searching; or the names of the active filters joined by " · " in the order
  genre, year, sort (for example "Drama · 1999 · Highest rated"), only those that
  are active, and "Filtered movies" when a filter is active but none of its names
  can be resolved. A long search text is shortened visually to one line with an
  ellipsis, and stays complete for assistive technology.
- RF-22: WHEN the first page of a search or filter selection has loaded with
  results, THE SYSTEM announces it to assistive technology, politely and without
  moving focus, with the text of the results heading (for example `Results for
  “matrix”` or "Drama · 1999"). The empty case is already announced by the
  existing empty state, and it is not announced twice. (The data has no total
  count, so no number is announced.)

**Movie cards**
- RF-23: WHILE the visitor points at a movie card with a mouse or another
  pointer that can hover, THE SYSTEM shows a gold (accent) border around the card
  and enlarges it slightly (about 3 %), in about 150 ms, and the title takes the
  accent color as `design.md` already states. Every card has a transparent 2 px
  border at rest, so that the hover adds no layout shift. The card's neighbors and the
  layout do not move, the enlarged card is not clipped nor covered by its
  neighbors, and the border is a real border (it stays visible in forced-colors
  mode). WHEN the visitor prefers reduced motion, THE SYSTEM keeps the gold
  border and the title color but does not enlarge the card. The effect does not
  apply to touch screens, where there is no hover. The keyboard focus indicator
  of the card is unchanged and the card does not enlarge on focus.

**Back to top**
- RF-24: WHEN the visitor on the home has scrolled well below the search and
  filters bar
  (about 300 px past it), THE SYSTEM shows a button fixed at the bottom right of
  the screen; it shows only an icon, has the accessible name "Back to top of
  results", and appears with a short fade. WHILE it is not shown, THE SYSTEM makes
  it unreachable by keyboard. The other pages do not have this button.
- RF-25: WHEN the visitor activates it, THE SYSTEM scrolls to the search and
  filters bar and moves keyboard focus to the results heading; THE SYSTEM scrolls
  smoothly unless the visitor prefers reduced motion.
- RF-26: THE SYSTEM never lets the button cover the element that has keyboard
  focus, and keeps it clear of the browser's and the device's reserved areas on
  phones.

**Background and visual continuity**
- RF-27: THE SYSTEM shows on every page a background that stays still while the
  page scrolls, without jank and without jumping when a phone's browser bar shows
  or hides: a vertical gradient from the surface color to the page color over the
  top part of the screen, plus a soft amber glow at the lower left, never at the
  top.
- RF-28: THE SYSTEM draws no dividing lines between the header, the hero, the
  search and filters bar and the results; the header and the bar have a faint
  tint that fades out, and the hero's image fades into the background at its top
  and bottom edges.
- RF-29: THE SYSTEM keeps all text and icons that sit over the glow, over the
  gradient or over the tinted bands within the contrast required by WCAG 2.1 AA,
  measured at the worst point, not on average.

**About page and attribution**
- RF-30: THE SYSTEM provides an "About" page, reachable from the header, with its
  own page heading and main content area. Its content is, at least, TMDB's
  attribution: the notice that TMDB's API terms of use require (section 3),
  worded "This website uses TMDB and the TMDB APIs but is not endorsed, certified,
  or otherwise approved by TMDB.", and TMDB's logo, supplied by the maintainer
  from TMDB's official logo page, unmodified, and used according to those terms
  (less prominent than the application's own name and mark, and without implying
  any endorsement). Any further content is out of scope.
- RF-31: THE SYSTEM shows the same attribution (statement and logo) in the
  README.

**Performance and quality of the home**
- RF-32: THE SYSTEM loads early with high fetch priority, and never lazily, the
  images that determine the home's first paint (the hero's image and the first
  posters above the fold), and never hides or animates them while they first
  appear.
- RF-33: THE SYSTEM renders the hero's background sharp at full width on common
  screens, using a larger source image than the ones used for the cards instead
  of enlarging a small one, without making the visitor download more than their
  screen needs.
- RF-34: THE SYSTEM gives the home and the About page a descriptive title and
  description of their own, in place of the framework's default text.
- RF-35: THE SYSTEM shows the design system's icons where it specifies them in
  states the home displays: the star in the rating, the alert in the error state,
  the film icon in the empty state and in the missing-poster fallback (a surface
  with the film icon, same proportions, never a broken image). Decorative icons
  are hidden from assistive technology. The icons appear wherever those shared
  components are used, including the detail page and its not-found page.

**Loading states**
- RF-36: WHILE the results are loading, THE SYSTEM shows skeletons that act as
  loading indicators: they have the exact size of the final cards, animate only
  opacity, are hidden from assistive technology, and WHEN the visitor prefers
  reduced motion they stay still (no pulse and no repetition at all).

## Housekeeping (tasks that go first; they are not requirements)
- Remove the unused list-view helper (`resolve-view-state`) and its test, in a
  commit of its own (approved on 15 October 2026).
- Add an automated test that fixes the 300 ms search delay of the explorer
  (existing behavior, explore-filters RF-6).

## Non-functional requirements
- **Audit compliance**: every change of this spec is checked against the audit
  checklist before it is considered done, and the whole is measured again at the
  end: contrast of every new color pair in every state (normal, hover, focus,
  placeholder, over images and gradients, at the worst point); a solid dark layer
  behind any text over an image; visible focus indicator at 3:1 against every
  background and never clipped; every control with an accessible name and
  operable by keyboard; DOM order equal to visual order; reserved space for every
  image and no layout shift; skeletons with the exact size of the final content;
  decorative icons hidden and informative ones named; a single top-level heading
  and no skipped levels; touch targets of at least 44 px (never below 24 px); no
  fixed heights that cut text at 200 % text size or 400 % zoom (the hero grows);
  no horizontal scroll at 320 px; a clean browser console; state changes
  announced; page zoom never blocked.
- **Wide and narrow layouts**: "wide" means 1024 px and up (`lg` in `design.md`)
  and "narrow" below 1024 px. Between 640 and 1023 px the narrow layout is used
  with its content centered and limited in width, and the grid keeps the columns
  of `design.md`. Between 1024 and 1279 px the wide layout is used with a flexible
  search field.
- **Performance** (constitution §8): Lighthouse ≥ 90 in all four categories on
  the home and the About page, measured on the public address (production build,
  mobile and desktop, median of several runs). The reference is a new
  measurement of the deployed home taken before the implementation starts (the
  earlier baseline was taken on a local server and stays as a historical record);
  the same method is used afterwards. Aim for 95 to 100 in accessibility, best
  practices and SEO. The detail page's own Lighthouse measurement belongs to the
  audit spec, but the contrast of its text over the new background is checked by
  hand. The redesign must not lower any reference score of the home (the About
  page is new and only has the floor of 90), must not increase the unused
  JavaScript the baseline reported for the home, and adds no blocking work to the
  first paint. The image that determines the first paint is content (a poster or
  the featured movie), never decoration, and no text or image waits for an entry
  animation.
- **Without JavaScript**: the header, the skip link, the hero (on the popular
  list), the results and the About page are rendered by the server and work
  without JavaScript; only what needs it (the hero's retraction, the back-to-top
  button, the filters' updates) is absent.
- **Forced-colors mode**: the decorative layers (gradient, glow, image fade) may
  be dropped there; text, borders and the focus indicator stay visible and
  nothing informative depends on those layers.
- **Accessibility** (constitution §7, WCAG 2.1 AA): keyboard order is header,
  featured movie's "Details", search, filters, results; semantic landmarks
  (header, navigation, main); focus never hidden under another element; borders
  and focus drawn with real borders or outlines, so that forced-colors mode keeps
  them.
- **Reduced motion**: with the visitor's reduced-motion preference, nothing moves
  (the curtain, the fade of the button, the card's enlargement, the smooth
  scroll, the skeletons' pulse); the responses that carry information (a color or border change)
  remain.
- **Motion limited to three cases**: the hero's curtain, the appearance of the
  back-to-top button and the card's hover. They only answer a visitor's action;
  nothing moves on its own and nothing animates in while the page loads. Except
  for the curtain's height (RF-12), they animate only transform, opacity and
  color properties. The only other movement allowed is the loading indicator of
  RF-36, which stops with reduced motion.
- **Design system**: every color, size, radius and duration comes from
  `docs/design.md`, which is updated first for what this spec adds, including the
  values of Appendix A as new tokens instead of adjusting the approved design to
  the existing scale (see Changes to earlier specs).
- **Tested requirements (constitution §5) — scoped exception**: every requirement
  has an automated test, except for four aspects that exist only on real devices
  or to the eye: the smoothness and absence of jumps of the curtain (RF-12), the
  device's and the browser's reserved areas (RF-26), the stillness and absence of
  jank of the background with a phone's browser bar (RF-27) and the contrast over
  real images (RF-29, which also has an automated calculation of the token pairs
  and of a pure white image). For those, the verification is a recorded
  demonstration in the pull request, as in the deploy-ci spec. The exception is
  limited to this spec and is repeated whenever a later spec changes what it
  covers.
- **TMDB terms of use**: the project stays free. TMDB's API terms do not allow
  commercial use (selling the application, charging for it or deriving revenue
  from TMDB content) without a separate written agreement, and they limit how long
  TMDB data may be cached (six months); the caches used here last hours.
- **Minimal stack** (constitution §1): no dependency is added.
- **Data flow** (constitution §3, §4): the hero reads its data through the
  existing service layer, and the response schema is extended and validated with
  Zod like the rest.
- **Language** (constitution §9): all interface text, code, specs and
  documentation in English.
- **No regression**: all existing tests keep passing unchanged, except where an
  affected requirement of an earlier spec is amended first and the maintainer
  approves it.

## UI states
- **Loading**: on the first visit the server renders the page (header, hero when
  it applies, filters and the first results) so there is no empty first paint.
  WHILE a new filter, search or sort is loading, the results show the existing
  skeleton (RF-36); the hero is already hidden by then. WHILE more results load, the
  explorer's inline loading indicator remains.
- **Success**: header, hero (when no search and no filter), search and filters,
  results heading, grid, back-to-top button once the visitor has scrolled.
- **Empty**: a search or filter without results shows the existing empty state;
  the hero is hidden in that situation.
- **Error**: if the popular list cannot be loaded, the existing error state and
  its retry action appear and the page has no hero (RF-9). If the hero's image
  fails, the hero stays without it (RF-10). If more results fail to load, the
  existing inline error with retry remains.
- **Hero states**: present (home with no search and no filter), hidden (any
  search or filter, hero rolled up and unreachable), absent (no suitable movie or
  no data, nothing reserved). WHILE a page opened with filters waits for the
  popular list after the filters are cleared, the hero is absent and opens when
  the list arrives (RF-7).
- **Back-to-top button**: hidden (near the top, not focusable) or shown (past the
  bar, focusable).
- **Movie card**: rest, hovered (gold border, slight enlargement, accent title),
  focused by keyboard (existing focus ring).

## Edge cases
- The URL already carries filters or a search when the page opens: the hero is not
  rendered and there is no animation; when the visitor then clears them, the hero
  opens once the popular list arrives (RF-7).
- Moving through the browser's history between a URL with filters and one without:
  the hero's curtain animates like any other change (RF-12); only the first render
  never animates.
- The keyboard focus is on the hero's "Details" link when the hero becomes hidden:
  focus moves to the search field (RF-13).
- Text typed in the search field is a single character or only spaces: the hero is
  already hidden and the heading still reads "Popular movies" until the search
  becomes active (RF-11).
- The visitor clears filters while far down the page: the results scroll back to
  the top of the grid as today (explore-filters RF-19), the hero returns, and the
  content below must not jump visibly.
- The first popular movie has no background image: the next one that has it is
  featured.
- Very long titles or synopses: the title is limited to two lines and the
  synopsis to three; at 200 % text size nothing is cut.
- The featured movie also appears as the first card in the grid (RF-8): this is
  intended.
- A movie with no rating: the hero follows the rating component's rule (no star,
  "No rating").
- Very narrow screens (320 px): the header does not overflow and the brand's text
  is hidden visually.
- The visitor prefers reduced motion: no curtain, no fade, no card enlargement, no
  smooth scroll, and still skeletons.
- All three external links are still empty: none is shown (RF-3).
- A card at the edge of the grid, enlarged by the hover, is not cut by the
  container nor hidden behind the cards beside it.
- A touch screen: there is no sticky hover state on cards after a tap.
- A browser without support for the features used for the fixed background or the
  fade of the hero's image: the page stays usable and readable, with a plain dark
  background and an unfaded image.
- Opening the home from the browser's back button after visiting a detail page:
  the page shows the state implied by its URL (RF-11), with no animation on that
  first render.
- JavaScript disabled: the page shows the header, the hero (on the popular list),
  the results and the About page; the back-to-top button does not appear.
- The configuration has an address that is not a complete `https` address: that
  link is not shown (RF-3).
- A detail page of a movie that does not exist: its existing not-found page keeps
  its content and shows the shared header and background (RF-1).

## Changes to earlier specs (to approve with this spec)
- explore-filters **RF-1** ("the home is the Spec 1 popular list, unchanged"): the
  featured movie is added above it, so that text must be clarified.
- explore-filters **RF-17**: "Clear filters" keeps its room reserved while not
  shown; it is still a visible control whenever filters are active.
- explore-filters **RF-19** (scroll to the top of the grid on every change) and its
  existing test stay as they are; it is verified in a real browser together with
  the hero's retraction.
- **`docs/design.md`** is updated and approved before any implementation, with the
  reasons: the gradient and the amber glow in the background (it says "no
  gradients" and "amber is scarce"), the capitalized hero title ("sentence case
  everywhere"), the card's hover (it says "the poster does not move or scale" and
  that only color, background, border and opacity are animated), the curtain's
  height animation as a documented exception, the new
  tokens of Appendix A (hero title sizes 40/48 and 28/36, control heights of 44 and
  48 px, the hero's height, the 400 ms duration and the rest), the header, the
  hero, the back-to-top button, the About page and the new icons.
- Existing tests that could be affected are listed in `plan.md`; none is edited
  without the maintainer's approval.

## Out of scope
- Anything on the movie detail page beyond what is shared (header, background,
  main-content landmark, icons of the shared components): trailer loading, page
  title and social preview, gallery descriptions, image sizes, the not-found pages'
  content, and the page's Lighthouse measurement. They go to the audit spec.
- Favorites in any form (no link in the header, no button on the hero or the
  cards); that is its own spec.
- A "categories" row, a footer, a hamburger menu, a fixed header.
- The film grain texture over the background.
- Any animation other than the three of the motion requirement.
- Duration and age rating on the hero.
- Content of the About page beyond the TMDB attribution (author's links, "how it
  was built").
- Changes to the behavior of search, filters, sorting, infinite scroll or the URL
  as the source of truth.
- New TMDB endpoints or additional requests for the hero.
- A search engine's files (`robots`, sitemap) and security headers: the audit spec.
- Light theme, translations, custom domain, analytics, error monitoring.
- Cache headers on the movie-list API and the final audit: a separate spec.
- Announcing the deployed address.
- Optional dependencies for testing accessibility.

## Definition of done
- RF-1 to RF-36 each have at least one verification (an automated test, or a
  recorded demonstration for the exceptions of the non-functional requirements),
  listed in `plan.md`'s matrix; the end-to-end suite is
  extended for the hero, its retraction, the About page, the back-to-top button
  and the card's hover, including a run with reduced motion emulated (it also checks that the skeletons
  do not animate).
- All existing tests still pass, and any amended requirement of an earlier spec
  was approved first.
- `docs/design.md` is updated and approved before the implementation starts.
- The maintainer has supplied the three links, their icons (including their own
  logo) and the TMDB logo before the header and the About page are implemented
  (RF-3, RF-30), or has explicitly approved implementing with the file empty.
- A reference Lighthouse measurement of the deployed home is taken before the
  implementation starts.
- The audit checklist of the non-functional requirements is passed for each
  change, and a final pass is recorded: keyboard on the home and About, a screen
  reader (VoiceOver) on the home, 200 % text size and 400 % zoom, 320 px width,
  reduced motion and forced colors, an accessibility checker on every state of the
  home, and a clean console.
- The checks of the CI pass and the production deployment of the merged result is
  verified healthy.
- Lighthouse is measured again on the public address with the method of the
  reference measurement, on mobile and desktop for the home and the About page,
  all categories ≥ 90 and, for the home, no score below the reference (the About
  page is new and only has the floor); the figures are recorded.
- Manual checks on real devices are done and noted: the hero's animation with the
  keyboard open on a phone, the back-to-top button against the browser bar and the
  safe area, the fixed background and the image fade on iOS Safari, the card's
  hover on a mouse and its absence on touch, and the contrast of the text over the
  glow.
- The housekeeping tasks are done: `resolve-view-state` and its test are gone and
  the 300 ms delay is covered by a test.
- The four aspects of the scoped exception have a recorded demonstration in the
  pull request, and an end-to-end run with JavaScript disabled shows the header,
  the skip link, the hero and the About page.
- The contrast of the detail page's text over the new background is checked by
  hand and noted; TMDB's logo guidelines are checked and noted.
- No dependency was added.
- The README carries the TMDB attribution (RF-31).

## Open questions
- The card's enlargement is about 3 % (approved by the maintainer along with
  the spec).
- The exact files and formats of the site configuration (the three links and the
  logo) are decisions for the plan.
- Icons (decided): the star, the arrows, the chevron, the search icon and the
  clapperboard are taken from the design canvas, as inline SVG components. The
  alert and film icons are not in the canvas, so they are drawn in the same style
  (`design.md`: 24 px grid, 1.5 stroke, rounded) during the implementation, unless
  the maintainer provides their own. The maintainer provides the three header icons (their own logo, LinkedIn and
  GitHub) when the plan reaches the header task; until then the canvas glyphs
  stand in and are replaced.

## Appendix A — Visual reference (values from the design canvas)
These values come from the approved canvas and are the starting point for the
tokens that `design.md` will gain. Colors are the existing tokens.

Wide values are those of the 1280 px artboard and narrow values those of the
390 px artboard; the breakpoint is 1024 px (see Non-functional requirements).

**Background (every page)**
- Base color: page color. Vertical gradient from the surface color at the top to
  the page color at 520 px on wide screens (540 px on phones).
- Amber glow: an ellipse at the left edge, 620 px from the top (640 px on phones),
  of 760 × 300 px on wide screens (340 × 260 px on phones), accent color at 9 %
  opacity fading to nothing. The canvas used 30 %, which makes the muted and subtle
  text fall below the contrast of WCAG 2.1 AA (3.95:1 and 2.96:1 at the glow's
  center); 9 % keeps them at 6.70:1 and 5.02:1, and `subtle` at 4.56:1 where the
  filter bar's tint overlaps the glow (RF-29).
- Header tint: the foreground color at 5 % at the top fading to 0 over the header;
  filter bar tint: the foreground color fading 0 → 4 % (at 40 %) → 0. No 1 px
  borders between sections.

**Header**
- Wide: 64 px high, 32 px side padding. Logo 28 px (clapperboard) and "Movie-explorer"
  at 20/28, weight 600. Links "Home" and "About" at 16 px, 24 px apart; the active
  one in accent, weight 600, with a 2 px accent underline; the other in the muted
  color. External links: three 44 × 44 buttons (40 in the canvas, raised to meet the
  touch-target requirement), 8 px apart, 1 px border in the border color,
  radius 6, 20 px icon in the muted color.
- Narrow: row 1 is 56 px high (brand at 18/28, external links 4 px apart); row 2
  is 44 px high with the two links; side padding 16 px.

**Hero**
- Wide: 320 px high. The image occupies the whole area, faded in a vertical mask
  (transparent at 0 %, opaque from 18 % to 50 %, transparent at 100 %), with a
  horizontal dark layer from the left: page color at 0 %, 92 % at 34 %, 35 % at
  62 %, 0 % at 100 %. Text column up to 520 px wide, 12 px between its items:
  title 40/48, weight 600, capitals, 1 % letter spacing; data line at 14/20 in
  the muted color with tabular numbers (genre · year · accent rating with a 16 px
  star); synopsis 16/24 in the foreground color; "Details" primary button 44 px
  high, 16 px padding, radius 6, accent background, accent-foreground text at
  14/20 weight 600 with a 20 px arrow.
- Narrow: a 16:9 image on top (mask 0 %, 14 % to 45 %, 100 %), the text below on
  the page background with 16 px padding and 8 px between items: title 28/36,
  synopsis clamped to three lines, "Details" button full width and 48 px high.
- Curtain: 400 ms (height and the upward movement) and 250 ms (fade), ease-out;
  only with no reduced-motion preference.

**Search and filters bar**
- Wide: 16 px vertical and 32 px side padding, 16 px between the search field and
  the group at the right. Search field 420 px wide and 44 px high; Genre 190 px,
  Year 130 px, Sort 210 px, "Clear filters" 132 px, all 44 px high, 12 px apart.
- Narrow: 16 px padding, 12 px gap; search field 48 px high; a two-column grid with
  Genre, Year, Sort and "Clear filters" (48 px high).
- Controls: page-color background, 1 px border in the strong border color, radius
  4 (radius 6 for the button), 16 px text, 20 px chevron in the muted color.

**Results**
- Heading 20/28, weight 600. Section padding 32 px top and sides on wide screens
  (24 px top, 16 px sides on phones). The grid keeps the columns and gaps of
  `design.md` (2, 3, 4, 5 and 6 columns).

**Back to top**
- 48 × 48 px, surface-raised background, 1 px strong border, radius 6, 20 px arrow
  icon in the foreground color; on hover the border and the icon take the accent
  color. 24 px from the right and bottom edges on wide screens, 16 px on phones.
  Appears after scrolling 300 px past the bar, fading in 200 ms with an 8 px
  upward movement. Scroll padding at the bottom of 80 px so it never covers a
  focused element.

**Movie card (new)**
- Gold (accent) 2 px border (a real border, reserved so that it adds no layout
  shift) and an enlargement of about 3 % on hover, in about 150 ms; the poster keeps its 2:3 shape and 4 px radius; the
  title turns accent on hover.
