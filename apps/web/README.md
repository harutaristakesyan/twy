# apps/web — `@twy/web`

Reserved folder for the Astro marketing site. Not yet wired into SST.

When ready, the wiring will happen in `infra/web.ts` as a second `sst.aws.StaticSite` mounted on the same multi-domain `sst.aws.Router` that already serves `@twy/dashboard`.
