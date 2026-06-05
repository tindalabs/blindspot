<!--
Thanks for contributing to Blindspot! Please skim CONTRIBUTING.md first if you
haven't — it covers the pnpm/turbo workflow and the local OTel stack
(docker compose up) for verifying instrumentation end to end.
-->

## Summary

<!-- 1–3 bullets on WHAT changed and WHY. Link the issue if there is one. -->

-

## Type of change

<!-- Tick all that apply. -->

- [ ] Bug fix (no API change)
- [ ] New feature (additive, no breaking changes)
- [ ] Breaking change (consumer code needs updates — call out in summary)
- [ ] Docs / chore (no source changes)
- [ ] Tests / coverage

## Privacy check

<!-- Blindspot's core promise is "no PII, no DOM content in spans." -->

- [ ] No raw DOM text, input values, or PII can leak into span attributes/events
- [ ] N/A — change doesn't touch instrumentation or span emission

## Test plan

<!-- How did you verify? Reviewers will run the same steps. -->

- [ ] `pnpm test` (must stay green)
- [ ] `pnpm lint`
- [ ] `pnpm type-check`
- [ ] `pnpm build` (clean)
- [ ] Manual verification against the local stack (`docker compose up` + an `examples/` app) if runtime behaviour changed
- [ ] New / updated tests cover the change

## Changeset

- [ ] Added a changeset (`pnpm changeset`) if this affects a published package
- [ ] N/A — no consumer-facing change

## Notes for reviewers

<!--
API surface changes, perf considerations, subtle behaviour shifts, follow-up
work spun out as separate PRs, etc.
-->
