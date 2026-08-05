# RecoverKit — Dev Flow (Lean Rigor)

Version: 0.1.0
Last updated: 2026-08-05
Decision: **lean rigor** — GitHub Flow with a staging gate + enforced quality gates.
Not enterprise GitFlow ceremony, not "winging it". Rationale: we are a small elite team pre-revenue; velocity is the
product. Enterprise ceremony (release trains, code owners, required-review-counts)
solves coordination problems we do not have yet — we graduate into it when we hit 4+
active devs, real revenue, or compliance needs. (See research note in `RESEARCH.md`.)

## Core rules (from SPEC §10, made executable)

1. **Main is always deployable.** Short-lived feature branches, one concern each;
   everything reaches `main` only through the stage pipeline below.
2. **Conventional Commits**, imperative, subject ≤ 6 words, tiny.
   - OK: `feat: add card update page`
   - NOT OK: `did stuff`, `fix bug`, `feat: this is a really long subject that explains way too much`
   - Enforced by commitlint in CI (see below) — no exceptions.
3. **No AI names in commit history.** No `Co-authored-by` AI tags, no bot handles.
   The product ships our names, or nobody's.
4. **PR per feature.** Small PRs (< ~200 changed lines, single focus). One approving
   review required for anything non-trivial; trivial changes (docs, config) can go
   straight with CI green.
5. **Squash merge → linear history.** Rebase locally if needed; never merge `main`
   into a feature branch, always rebase. Delete branch after merge.
6. **CI gates merge.** Anything red does not merge. Green CI + 1 review = merge.

## Stage pipeline (two-branch model)

```
feature/* ──PR──▶ staging ──promotion PR──▶ main ──▶ production
                   (integration)           (stable)    (Vercel)
```

- **`main` is stable.** Always green, always deployable; merges = releases. Protected:
  1 review + CI + linear history + no force pushes (live).
- **`staging` is the integration stage.** All feature work lands here first via PR
  (CI green, squash merge, linear history). Because `main` only ever receives commits
  through staging promotions, staging always contains main — promotions are the
  release events.
- **Feature branches** (`feature/<kebab>`, `fix/<kebab>`, `chore/<kebab>`) live for
  hours/days, one concern each, always PR → `staging`.
- **Environments (Vercel):** PR = Preview env, `staging` branch = Staging env,
  `main` = Production. Map them in the Vercel project settings.
- **Promotion:** a `staging` → `main` PR is deliberate and batched — merge it when
  the batch is verified, not per-feature.

## Commit conventions

- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`.
- Format: `type(optional-scope): subject ≤ 6 words`
- Enforced locally + in CI via commitlint (`commitlint.config.js`):
  - conventional config + custom rule: **subject ≤ 6 words**
- Scripts: `pnpm commitlint` (last commit), `pnpm commitlint:range` (last-commit
  range `HEAD~1..HEAD` — the same range CI checks on push).

## CI (`.github/workflows/ci.yml`)

- **Now (pre-scaffold):** `install` + `commitlint` on push to `main`/`staging` and on
  PRs. Commit conventions are locked from day one.
- **First scaffold PR:** add the `checks` job to the same workflow:

```yaml
  checks:
    name: Typecheck, lint, build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec tsc --noEmit
      - run: pnpm lint
      - run: pnpm build
```

- Upgrade path: add coverage gate + e2e (Playwright) when the app has real flows.

## Branch protection (applied on `main` and `staging`)

- [x] Require pull request reviews before merging (1 review)
- [x] Require status checks to pass before merging (CI: commitlint; later checks job)
- [x] Require linear history (no merge commits)
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above (admin included)
- [ ] **Solo-dev reality check:** with admin included, the owner still needs an
      approving review from a second GitHub account to merge. Decide: teammate
      reviews, or relax enforce-admins and accept the tradeoff.

## Releases

- A `staging` → `main` promotion PR **is** a release event. Merge it, then:
  1. Tag it: `git tag v0.1.0 && git push --tags`
  2. `main` → Vercel auto-deploy to Production. Nothing else.
- Urgent fixes ride the same pipeline (`fix/*` → staging → main, fast-tracked with
  a focused review). No hotfix branches, no release trains, no semantic-release bots
  until we graduate.

## PR template

`.github/PULL_REQUEST_TEMPLATE.md` — what / why / how tested / notes. Reviewers
answer two questions: "Is it obviously correct?" and "Does it match the spec?"

## When we graduate (not now)

- 4+ active devs → add CODEOWNERS + required-review-count 2
- Real customers + compliance → add release branches, stricter gates, scheduled
  release windows
- Any two of the above → revisit this doc, then change it deliberately
