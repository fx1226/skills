# Skills

Private collection of Agent Skills used for software engineering work.

> This repository is private and is not currently intended for public installation or distribution.

## Catalog

| Skill | Category | Purpose |
|---|---|---|
| [`c-coding-standards`](c-coding-standards/SKILL.md) | Engineering | Project-aware rules for safe, portable, maintainable C code |
| [`svn-code-review`](svn-code-review/SKILL.md) | Engineering | Read-only, evidence-backed code review for SVN working copies and repository revisions |
| [`xu-code-review`](xu-code-review/SKILL.md) | Engineering | Evidence-backed Git/SVN review across standards, requirements, reliability and safety |
| [`xu-fr-flow`](xu-fr-flow/SKILL.md) | Workflow | Explicitly invoked FR orchestration from requirements through design, implementation and developer testing, with human approval gates |
| [`xu-design-review-loop`](xu-design-review-loop/SKILL.md) | Engineering | Technical design with independent read-only review, bounded rework and explicit human approval |
| [`xu-dev-review-loop`](xu-dev-review-loop/SKILL.md) | Engineering | Pre-submission testing and author diff review, followed by independent review, responses to feedback and bounded incremental re-review |
| [`xu-dev-test-loop`](xu-dev-test-loop/SKILL.md) | Engineering | Post-code-review black-box cases, independent case review, confirmed local/device testing and QA handoff |
| [`write_richsun_log`](write_richsun_log/SKILL.md) | Documentation | Draft or revise the Shengyang daily work log in the team format and personal phrasing |
| [`note-take`](note-take/SKILL.md) | Workflow | Turn durable preferences and project conventions into confirmed global or project rule-file edits |

## Layout

```text
<skill-name>/
  SKILL.md
  agents/            (optional)
  references/        (optional)
  test-prompts.json
```

Each Skill owns a small invocation file and discloses heavier reference material only when its workflow needs it.

## Development

- Treat this repository as the maintenance source of truth.
- Follow RED-GREEN-REFACTOR when changing Skill behavior: establish a failing agent scenario, make the smallest guidance change, then rerun the scenario.
- Keep `SKILL.md` focused on invocation and execution; place heavy reference material in the Skill's `references/` directory.
- Keep behavioral regression scenarios in `test-prompts.json`.
- Synchronize runtime-installed copies only after validation, then verify checksums.
