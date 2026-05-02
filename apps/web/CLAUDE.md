# apps/web — `@twy/web`

Astro 5 static marketing site. Deployed via SST as a `sst.aws.StaticSite` on the **Marketing** Router (defined in `infra/web.ts`).

> Read root `CLAUDE.md` first.

## Domains

| Stage | Hosts |
|---|---|
| dev  | `dev.twy.am`, `dev.twy.be` |
| prod | `twy.am`, `twy.be`, `www.twy.am`, `www.twy.be` |
| personal | CloudFront default (`*.cloudfront.net`) |

The dashboard lives at `app.<domain>` — the Sign-in CTA links there via `PUBLIC_APP_URL` injected at SST build time.

## Stack

- **Astro 5** — `output: 'static'`, `build.format: 'file'` (flat `/about.html` files, no trailing-slash 403s on CloudFront).
- **Tailwind CSS** — `@astrojs/tailwind` integration.
- **No SST link[]** — this site has no Lambda / backend access.
- Build output: `dist/` (Astro default).

## Structure

```
src/
  layouts/BaseLayout.astro   # Shared HTML shell (meta, OG, Tailwind)
  pages/index.astro          # Landing placeholder
  pages/404.astro            # Custom 404 (CloudFront errorPage)
  styles/global.css          # @tailwind base/components/utilities
public/
  favicon.svg
```

## Common commands

```bash
pnpm --filter @twy/web dev       # local dev server (port 4321)
pnpm --filter @twy/web build     # astro check + astro build → dist/
pnpm --filter @twy/web preview   # preview the dist/ build
```

## Env vars

| Var | Set by | Used for |
|---|---|---|
| `PUBLIC_APP_URL` | SST `environment` in `infra/web.ts` | Dashboard CTA href |
| `PUBLIC_STAGE`   | SST `environment` in `infra/web.ts` | Stage-aware copy if needed |

Locally these fall back to `http://localhost:3000` (see `src/pages/index.astro`).
