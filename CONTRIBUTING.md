# Contributing to Blindspot

Thank you for your interest in contributing! This document covers everything you need to get started.

## Development setup

Blindspot is a pnpm monorepo managed with Turborepo. Node.js ≥ 18 and pnpm ≥ 9 are required.

```bash
git clone <repo-url>
cd blindspot-ux
pnpm install
pnpm build
```

## Workspace packages

| Package | Path | Description |
|---------|------|-------------|
| `@tindalabs/blindspot` | `packages/web` | Browser SDK |
| `@tindalabs/blindspot-docs` | `packages/docs` | Documentation site |

## Workflow

```bash
pnpm build         # build all packages
pnpm test          # run test suites
pnpm type-check    # TypeScript check
pnpm lint          # ESLint across all packages
pnpm e2e           # Playwright end-to-end tests
```

To work on a specific package:

```bash
pnpm --filter @tindalabs/blindspot build
pnpm --filter @tindalabs/blindspot test
```

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes with tests where appropriate.
3. Run `pnpm lint && pnpm test && pnpm build` locally.
4. Open a PR against `main` with a clear description of what changed and why.

## Reporting bugs

Open a GitHub issue. Include: browser/Node version, a minimal reproduction, and the observed vs expected behaviour.

## Security vulnerabilities

**Do not open a public issue.** Email [ikerlaforga@gmail.com](mailto:ikerlaforga@gmail.com) instead. See [SECURITY.md](SECURITY.md).

## Code style

- TypeScript strict mode throughout.
- Privacy-first: no PII captured without explicit opt-in.
- New instrumentations live under `packages/web/src/instrumentations/` and must have corresponding tests.

## License

By contributing you agree that your work will be released under the [MIT License](LICENSE).
