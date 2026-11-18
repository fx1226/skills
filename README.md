# Skills

Private collection of Agent Skills used for software engineering work.

> This repository is private and is not currently intended for public installation or distribution.

## Catalog

| Skill | Category | Purpose |
|---|---|---|
| [`c-coding-standards`](c-coding-standards/SKILL.md) | Engineering | Project-aware rules for safe, portable, maintainable C code |
| [`svn-code-review`](svn-code-review/SKILL.md) | Engineering | Read-only, evidence-backed code review for SVN working copies and repository revisions |
| [`xu-code-review`](xu-code-review/SKILL.md) | Engineering | Evidence-backed Git/SVN review across standards, requirements, reliability and safety |
| [`xu-review-loop`](xu-review-loop/SKILL.md) | Delivery | Build → functional test → independent review loop with developer self-testing, read-only review and bounded rework |

## Layout

```text
<skill-name>/
  SKILL.md
  agents/
  references/
  test-prompts.json
```

Each Skill owns a small invocation file and discloses heavier reference material only when its workflow needs it.

## Development

- Treat this repository as the maintenance source of truth.
- Follow RED-GREEN-REFACTOR when changing Skill behavior: establish a failing agent scenario, make the smallest guidance change, then rerun the scenario.
- Keep `SKILL.md` focused on invocation and execution; place heavy reference material in the Skill's `references/` directory.
- Keep behavioral regression scenarios in `test-prompts.json`.
- Synchronize runtime-installed copies only after validation, then verify checksums.
