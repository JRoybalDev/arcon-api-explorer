# Page Setup With The Grid Layout

Use this helper when creating a new frontend page that should use the shared public site frame.

The app shell already provides the shared header/navbar for non-dashboard routes. New public pages only need to render the body grid: left aside, main content, right aside, and footer.

## Layout Shape

The intended desktop layout is:

```txt
header header header
aside  main   aside
footer footer footer
```

The header is rendered by `apps/web/src/routes/App.tsx` and spans the full grid. The page route renders the remaining sections.

On smaller screens, the sections stack in this order:

```txt
aside
main
aside
footer
```

## Create The Route

Add a route component under:

```txt
apps/web/src/routes
```

Use this structure:

```tsx
import { motion } from "framer-motion";
import { siteConfig } from "../shared/siteConfig";

const sectionMotion = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 }
};

export function ExamplePage() {
  return (
    <section className={`public-page page-full frontend-template-grid--asides-${siteConfig.frontendAsideMode}`}>
      <div className="frontend-template-grid">
        <motion.aside
          animate="visible"
          className="template-section template-aside grid-area-aside-left"
          initial="hidden"
          transition={{ delay: 0.04, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          variants={sectionMotion}
        >
          <div className="template-section__label">Left Aside</div>
          <h2>Secondary rail</h2>
          <p>Use this area for filters, section links, or supporting navigation.</p>
        </motion.aside>

        <motion.section
          animate="visible"
          aria-label="Main content"
          className="template-section grid-area-main"
          initial="hidden"
          transition={{ delay: 0.1, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          variants={sectionMotion}
        >
          <div className="template-section__label">Main</div>
          <h1>Page title</h1>
          <p>Primary page content goes here.</p>
        </motion.section>

        <motion.aside
          animate="visible"
          className="template-section template-aside grid-area-aside-right"
          initial="hidden"
          transition={{ delay: 0.16, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          variants={sectionMotion}
        >
          <div className="template-section__label">Right Aside</div>
          <h2>Supporting content</h2>
          <p>Use this area for calls to action, stats, related links, or page tools.</p>
        </motion.aside>
      </div>

      <motion.footer
        animate="visible"
        className="template-section public-layout-footer"
        initial="hidden"
        transition={{ delay: 0.22, duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
        variants={sectionMotion}
      >
        <div className="template-section__label">Footer</div>
        <p>Footer content spans below the main and aside sections.</p>
      </motion.footer>
    </section>
  );
}
```

## Register The Route

Add the route in:

```txt
apps/web/src/main.tsx
```

Example:

```tsx
{
  path: "/example",
  element: <ExamplePage />
}
```

Non-dashboard routes automatically receive the shared header/navbar, page transition animation, and `site-template-shell` grid wrapper from `App.tsx`.

## Aside Modes

Aside behavior is controlled in:

```txt
apps/web/src/shared/siteConfig.ts
```

Use:

```ts
frontendAsideMode: "static"
```

for sticky viewport-height asides that stay in place while the page scrolls and release before the footer.

Use:

```ts
frontendAsideMode: "scroll"
```

for asides that stretch with the page and scroll naturally with the rest of the content.

## Shared Classes

Use these classes instead of making a new layout from scratch:

- `public-page`: page spacing, aside sizing, and footer spacing.
- `frontend-template-grid`: three-column body grid.
- `frontend-template-grid--asides-static`: sticky aside behavior.
- `frontend-template-grid--asides-scroll`: full page-height aside behavior.
- `template-section`: bordered section surface.
- `template-aside`: shared aside sizing behavior.
- `grid-area-aside-left`: left aside placement.
- `grid-area-main`: main placement.
- `grid-area-aside-right`: right aside placement.
- `public-layout-footer`: footer area below main and asides.

## Theme Variables

Use semantic app variables so the Branding tab can control colors in both light and dark mode:

```css
color: var(--app-text);
background: var(--app-surface);
border-color: var(--app-border);
```

Common variables:

- `--app-bg`
- `--app-surface`
- `--app-surface-muted`
- `--app-surface-accent`
- `--app-surface-danger`
- `--app-border`
- `--app-border-strong`
- `--app-border-accent`
- `--app-border-danger`
- `--app-button-primary`
- `--app-button-primary-text`
- `--app-button-secondary`
- `--app-button-secondary-border`
- `--app-button-secondary-text`
- `--app-text`
- `--app-heading`
- `--app-muted`
- `--app-nav`
- `--app-nav-active`
- `--app-accent`
- `--app-accent-strong`
- `--app-accent-text`
- `--app-danger`
- `--app-topbar`

Do not hard-code page colors unless a one-off asset or illustration truly needs a fixed color.

## Loading And Empty States

Use the shared loading component for async pages:

```tsx
import { LoadingScreen } from "../shared/Loading";

return <LoadingScreen label="Loading page..." />;
```

The app also has a catch-all not found route in `apps/web/src/routes/NotFound.tsx`.

## Final Check

Before handing off a new page:

```bash
bun run typecheck
bun run build
```

Then verify desktop and mobile widths. Check that the header spans the same width as the body grid, static asides stop before the footer, and light/dark mode colors remain readable.
