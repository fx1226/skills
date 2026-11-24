# Skills

Private collection of Agent Skills used for software engineering work.

> This repository is private and is not currently intended for public installation or distribution.

## Catalog

| Skill | Category | Purpose |
|---|---|---|
| [`c-coding-standards`](c-coding-standards/SKILL.md) | Engineering | Project-aware rules for safe, portable, maintainable C code |
| [`svn-code-review`](svn-code-review/SKILL.md) | Engineering | Read-only, evidence-backed code review for SVN working copies and repository revisions |
| [`xu-code-review`](xu-code-review/SKILL.md) | Engineering | Evidence-backed Git/SVN review across standards, requirements, reliability and safety |
| [`xu-fr-flow`](xu-fr-flow/SKILL.md) | Workflow | Explicit FR orchestration with isolated role agents, versioned handoffs and human approval gates |
| [`xu-design-review-loop`](xu-design-review-loop/SKILL.md) | Engineering | Role-isolated technical design and independent read-only review with bounded rework and explicit human approval |
| [`xu-dev-review-loop`](xu-dev-review-loop/SKILL.md) | Engineering | Role-isolated development, self-testing and diff review, followed by independent code review and bounded incremental re-review |
| [`xu-dev-ut-loop`](xu-dev-ut-loop/SKILL.md) | Engineering | Developer unit testing (UT) with role-isolated case design, review, execution, defect rework and QA handoff |
| [`write_richsun_log`](write_richsun_log/SKILL.md) | Documentation | Draft or revise the Shengyang daily work log in the team format and personal phrasing |
| [`note-take`](note-take/SKILL.md) | Workflow | Turn durable preferences and project conventions into confirmed global or project rule-file edits |

## Layout

```text
<skill-name>/
  SKILL.md
  agents/            (optional)
  references/        (optional)
  test-prompts.json
docs/                (workflow diagrams and repository-level notes)
scripts/             (zero-dependency Node.js validation tools and unit tests)
```

Each Skill owns a small invocation file and discloses heavier reference material only when its workflow needs it.
The four orchestration skills follow one compact structure: entry, roles, linear steps, exception routes, and terminal states.
Their prose lines stay within 220 characters outside tables and code fences.

## Workflow subagents

The FR workflows are capability-driven and harness-agnostic. They use isolated roles, stable context identities (`contextId` + `contextScope`), two-tier read-only isolation, and explicit human gates (`standard` A/B/C or `lite` AB/C).
Every step resolves to exactly one state: `ADVANCE`, `WAIT_USER`, or `BLOCKED`.
Routine transitions emit a 6–8 line status card; sparse `flow-ledger` JSON (schema v1) is emitted only for cross-session handoff, ledger validation, or an explicit user request.
Each standalone loop skill (`xu-design-review-loop`, `xu-dev-review-loop`, `xu-dev-ut-loop`) ships a self-contained `references/dispatch-and-ledger.md`; see [subagent dispatch and handoff](xu-fr-flow/references/subagent-dispatch.md) for the shared capability model.

This repository does not maintain harness-specific agent profiles or runner scripts; orchestrators bind logical `fr-*` roles through the current harness's isolated subagent capability.
Standalone HTML flow visuals (such as [xu-dev-review-loop-flow.html](docs/xu-dev-review-loop-flow.html)) live under `docs/` to keep skill packages lightweight.

## Validation & Scripts

Zero-dependency Node.js tools under `scripts/` enforce ledger gate invariants and cross-skill alignment:

- Validate a `flow-ledger` JSON payload against a target gate (`A`, `B`, `AB`, `C`, `ut-entry`, or `qa-handoff`):
  ```bash
  node scripts/validate-ledger.cjs --gate ut-entry path/to/ledger.json
  ```
  Add `--pending` when checking an unconfirmed gate-waiting snapshot; the default still requires the target gate to be confirmed.
- Check governance clauses, terminal states, status-card contract, prose density, relative links, self-containment, and package cleanliness:
  ```bash
  node scripts/check-skills-consistency.cjs
  ```
- Run the full repository test suite and consistency check:
  ```bash
  node --test scripts/validate-ledger.test.cjs scripts/check-skills-consistency.test.cjs && node scripts/check-skills-consistency.cjs
  ```

## Development

- Treat this repository as the maintenance source of truth.
- Follow RED-GREEN-REFACTOR when changing Skill behavior: establish a failing agent scenario, make the smallest guidance change, then rerun the scenario.
- Keep `SKILL.md` focused on invocation and execution; place heavy reference material in the Skill's `references/` directory.
- Keep behavioral regression scenarios in `test-prompts.json`.
- Run the repository validation suite before synchronizing runtime-installed copies, then verify checksums.
- Synchronize runtime-installed copies only after validation, then verify checksums.
