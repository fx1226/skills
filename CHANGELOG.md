# Changelog

## Unreleased

- Define portable roles, dispatch, evidence checks and same-role handoff for the FR workflows across OpenCode, Codex, Pi, DeepSeek Harness, and Kimi Code. OpenCode's optional `fr-*` profiles provide role-specific permissions and same-role continuation with `sessionID`.
- Rename `xu-dev-test-loop` to `xu-dev-ut-loop` to reflect the developer unit testing (UT) stage.
- Enforce role-isolated Agent execution across the FR workflows. The main Agent only orchestrates; requirements analysis, design, development, test-case authorship, each review role, and formal test execution use separate contexts, with same-role continuity for rework. Route test defects through the original developer, code reviewer, and test executor, and report a blockage instead of letting the orchestrator fill an unavailable role. The optional program gate records explicit same-role developer handoffs instead of claiming session continuity.

## 0.2.0 - 2026-11-22

- Add `xu-fr-flow`, `xu-design-review-loop`, and `xu-dev-test-loop` for explicitly invoked FR delivery. Requirements/feasibility, technical design, and developer test cases remain human approval gates; design and black-box cases use independent read-only review with bounded same-reviewer rework. Keep formal case design after code review, bind local/device execution evidence to the current snapshot, return test-driven fixes to `xu-dev-review-loop`, and report QA handoff status without claiming QA acceptance.
- Rename `xu-delivery-loop` to `xu-dev-review-loop` and rework it into a bounded build → functional test → independent read-only review loop. The developer role may be the main agent itself; a review rejection returns to the same independent reviewer with a review ledger, so rework rounds re-review only the previous blockers, the new delta and affected areas while unchanged, provably decoupled parts inherit the earlier conclusion with its basis recorded. Developer-side build and test evidence are reused by impact instead of invalidated wholesale; the default valid-submission limit is 3 with a per-round cost checkpoint, and commit/deploy stay separately authorized. The optional program gate remains a hard-count path (fresh review context per round, no incremental inheritance) that passes prior review findings to the next reviewer for closure checks; manual orchestration is the default path. Version identification stays VCS-neutral, with Git, SVN, file and patch handling delegated to `xu-code-review`. Update the workflow diagram and behavioral scenarios accordingly.
- Remove the `brain-memory` skill; long-term memory governance is no longer maintained here.
- Flatten the repository so each skill package sits at the root, dropping the redundant `skills/` level.
- Make `brain-memory` self-contained, centralize its retrieval and note contracts, and honor explicit interface choices without retrying ambiguous mutations.
- Cover forward, reverse, and equal-endpoint SVN ranges; distinguish read-only review from explicitly authorized follow-up execution.
- Complete C profile-reference routing, make high-risk completion evidence explicit, and shorten skill descriptions.
- Add nine behavioral regression scenarios for these boundaries and separate forwarded approval claims from direct user authorization.
- Add `brain-memory` as a Basic Memory-specific governance skill for scoped retrieval, safe persistence, correction, consolidation, and explicit forgetting.
- Add multi-project routing, MCP-to-CLI fallback, native memory-note structure, post-mutation verification, and behavioral regression scenarios.
- Flatten the skill catalog so each skill package lives directly under `skills/`.

## 0.1.0 - 2026-07-25

Initial private release.

- Add `svn-code-review` with working-copy, single-revision, revision-range, and split-workspace modes.
- Enforce source- and SVN-state read-only review behavior.
- Add severity, evidence, scope, verification, and failure-handling references.
- Add eight behavioral regression scenarios.
