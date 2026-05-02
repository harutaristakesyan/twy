---
description: Run the full local verification loop — lint, typecheck, build, test — matching CI exactly. Use before /ship.
allowed-tools: Bash
---

You are running the verify gate. This is exactly what CI will do; failures here will fail there.

## Steps (run all even if early ones fail — collect every issue)

1. **Lint (CI gate)**:
   ```
   pnpm exec biome ci .
   ```

2. **Build all packages** (Turbo handles the dependency order):
   ```
   pnpm turbo run build
   ```

3. **Test all packages**:
   ```
   pnpm turbo run test
   ```

4. **Typecheck-only sanity** (some packages have separate `check` scripts):
   ```
   pnpm turbo run check
   ```

## Output

Report a table:

```
| Step          | Result | Time | Output (tail) |
| biome ci      | ✓/✗    | 2.1s | ... |
| turbo build   | ✓/✗    | 18s  | ... |
| turbo test    | ✓/✗    | 6s   | ... |
| turbo check   | ✓/✗    | 4s   | ... |
```

If everything green: `Ready to ship — run /ship to commit.`
If anything red: `Failures: <count>. Run /debug-test to diagnose.`

## Hard rules

- Do not run `pnpm --filter @twy/db migrate` here. Migrations are an explicit user decision.
- Do not run `cdk deploy` here. Deploys are gated on `/ship` + push + CI.
