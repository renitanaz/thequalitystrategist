# Grove & Bean demo site: seeded issues (answer key)

This is the canonical list of intentionally seeded issues on the Grove & Bean demo site (`blogs/quality-website-playbook/demo-site/`). Posts 6, 7, 8, 9, 11, 12, and 14 reference specific IDs from this list. Open the pages directly in a browser to work through them; nothing here needs a server.

Pages: `index.html` (Home), `about.html`, `blog.html` (Journal listing), `blog-post.html` (single article), `contact.html`.

## SEO

- **SEO-1**: Home page (`index.html`) has no `<meta name="description">` at all.
- **SEO-2**: About and Contact pages share the exact same `<title>`, "Grove & Bean | Contact Us". About's title was never updated after being cloned from Contact.
- **SEO-3**: No canonical tag (`<link rel="canonical">`) anywhere on the site.
- **SEO-4**: The blog post (`blog-post.html`) has the same generic title as the Journal listing page, no per-article title. It also has no canonical tag, no Open Graph tags, and no JSON-LD `Article` structured data.
- **SEO-5**: The Journal listing page (`blog.html`) has no meta description at all.
- **SEO-6**: `robots.txt` reads `Disallow: /`, blocking the entire site from being crawled. A leftover staging setting that was never reverted before go-live.
- **SEO-7**: `sitemap.xml` is stale in two directions: it's missing `blog-post.html` (a real, live page never added), and it includes `old-menu.html` (a page that no longer exists, a leftover from a past redesign that would 404 if crawled).
- **SEO-8**: No favicon defined (`<link rel="icon">`) on any page.

## Accessibility

- **A11Y-1**: Home page hero image has no `alt` attribute.
- **A11Y-2**: The blog post's inline image also has no `alt` attribute.
- **A11Y-3**: Contact form fields have no `<label>` elements, placeholder text only.
- **A11Y-4**: The `.subtle` text color (`#C9B8A0` on `#FDF6EC` background, used under "Why people come back" on Home) fails WCAG contrast.
- **A11Y-5**: About page heading hierarchy skips a level: `<h1>` is followed directly by `<h3>`, no `<h2>` in between.
- **A11Y-6**: `a:focus{outline:none}` removes the focus indicator sitewide, so keyboard navigation has no visible focus state anywhere on the site.

## Performance

- **PERF-1**: Home page hero image has no `width`/`height` attributes, so the layout shifts as it loads.
- **PERF-2**: A third-party chat-widget script loads synchronously in `<head>` on every page, no `async`/`defer`, blocking render until it resolves (it points to a non-resolving placeholder domain, so in practice it hangs; the blocking pattern is the point, not the specific vendor).

## Analytics

- **ANALYTICS-1**: The GA4 snippet on every page uses a placeholder measurement ID (`G-XXXXXXX`) that was never replaced with a real one. The tracking code is present and looks correct at a glance, but no data is actually being collected.
- **ANALYTICS-2**: No event tracking exists on the contact form's submit action, so a form-submission conversion would never be recorded even if the measurement ID were fixed.

## Forms

- **FORMS-1**: Contact form fields have no `<label>` elements (see A11Y-3), and the email field has no `type="email"` or `required` attribute.
- **FORMS-2**: No client-side validation on any field.
- **FORMS-3**: Form `action="#"` with no real endpoint, so there's no success or error state after submit.

## Legal and compliance

- **LEGAL-1**: No cookie consent banner anywhere, despite a GA4 analytics script loading on every page.
- **LEGAL-2**: No Privacy Policy link anywhere on the site; the footer only links to Contact.

## Cross-browser / visual

- **VISUAL-1**: The three-card `.features` row on the Home page uses `display:flex` with no `flex-wrap` and no responsive media query, so it overflows horizontally on narrow (mobile) viewports instead of stacking.
