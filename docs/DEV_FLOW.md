# RecoverKit — Dev Flow (Lean Rigor)

Version: 0.1.0
Last updated: 2026-08-05
Decision: **lean rigor** — GitHub Flow + enforced quality gates. Not enterprise GitFlow,
not "winging it". Rationale: we are a small elite team pre-revenue; velocity is the
product. Enterprise ceremony (release trains, code owners, required-review-counts)
solves coordination problems we do not have yet — we graduate into it when we hit 4+
active devs, real revenue, or compliance needs. (See research note in `RESEARCH.md`.)

## Core rules (from SPEC §10, made executable)

1. **Main is always deployable.** Short-lived feature branches off `main`, one concern each.
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

## Branch model — GitHub Flow

```
main ── always deployable
  ├─ feature/retry-scheduler   → PR → squash → main
  ├─ feature/card-update-page  → PR → squash → main
  └─ docs/dev-flow             → PR → squash → main
```

- Branch naming: `feature/<kebab-case>` or `fix/<kebab-case>` or `chore/<kebab-case>`.
- No `develop`, no `release/*`, no `hotfix/*` until we graduate.

## Commit conventions

- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`.
- Format: `type(optional-scope): subject ≤ 6 words`
- Enforced locally + in CI via commitlint (`commitlint.config.js`):
  - conventional config + custom rule: **subject ≤ 6 words**
- Scripts: `pnpm commitlint` (last commit), `pnpm commitlint:range` (last-commit
  range `HEAD~1..HEAD` — the same range CI checks on push).

## CI (`.github/workflows/ci.yml`)

- **Now (pre-scaffold):** `install` + `commitlint` on push to `main` and on PRs.
  Commit conventions are locked from day one.
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

## Branch protection (configure on GitHub, on `main`)

- [x] Require pull request reviews before merging (1 review)
- [x] Require status checks to pass before merging (CI: commitlint; later checks job)
- [x] Require linear history (no merge commits)
- [x] Require branches to be up to date before merging
- [x] Do not allow bypassing the above (admin included)

## Releases

- Merge to `main` → Vercel auto-deploy. Nothing else.
- Tag semantic versions on meaningful merges: `git tag v0.1.0 && git push --tags`.
- No release trains, no release branches, no semantic-release bots (until graduation).

## PR template

`.github/PULL_REQUEST_TEMPLATE.md` — what / why / how tested / notes. Reviewers
answer two questions: "Is it obviously correct?" and "Does it match the spec?"

## When we graduate (not now)

- 4+ active devs → add CODEOWNERS + required-review-count 2
- Real customers + compliance → add release branches, staging env, stricter gates
- Any two of the above → revisit this doc, then change it deliberately
