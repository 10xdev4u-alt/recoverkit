# Contributing to RecoverKit

Thanks for wanting to help. The full flow lives in `docs/DEV_FLOW.md` — this is
the short version.

## TL;DR

1. Branch: `feature/<kebab>`, `fix/<kebab>`, or `chore/<kebab>`
2. Small changes, one concern per PR
3. Conventional Commits, subject ≤ 6 words, imperative:
   - ✅ `feat: add card update page`
   - ❌ `did stuff`, `feat: a very long subject explaining way too much`
4. Commit locally — the husky hook runs commitlint before every commit
5. Open a PR against `staging`. CI must be green. Get an approving review.
6. Squash-merge → features ride `staging` → promote to `main` when verified.

## Setup

```sh
pnpm install
pnpm dev              # run the app
pnpm lint             # lint
pnpm exec tsc --noEmit  # typecheck (once the app scaffold lands)
```

## Commit rules

- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `build`, `ci`
- No AI names in commit history (no `Co-authored-by` AI tags)
- Enforced by commitlint — husky locally, CI on GitHub

## PR checklist

- [ ] Small, single-concern diff
- [ ] Conventional commit(s) pass commitlint
- [ ] CI green
- [ ] State how you tested it
- [ ] Docs updated if behavior changed

## Review expectations

Reviewers answer two questions: "Is it obviously correct?" and "Does it match
the spec (`docs/SPEC.md`)?"
