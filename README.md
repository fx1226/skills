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
```

Each Skill owns a small invocation file and discloses heavier reference material only when its workflow needs it.

## Workflow subagents

The FR workflows define logical roles and use the subagent tools available in the current harness. An orchestrator hands each role a versioned task, verifies its evidence, and advances through the human approval gates. See [subagent dispatch and handoff](xu-fr-flow/references/subagent-dispatch.md) for the capability checks and examples for OpenCode, Codex, Pi, DeepSeek Harness, and Kimi Code.

The optional OpenCode profiles in `.opencode/agents/` map to the same `fr-*` roles. OpenCode discovers skills and profiles separately. To use these profiles in another project, install or link them into that project's `.opencode/agents/` directory or the global `~/.config/opencode/agents/` directory. Keep their IDs unchanged.

## Development

- Treat this repository as the maintenance source of truth.
- Follow RED-GREEN-REFACTOR when changing Skill behavior: establish a failing agent scenario, make the smallest guidance change, then rerun the scenario.
- Keep `SKILL.md` focused on invocation and execution; place heavy reference material in the Skill's `references/` directory.
- Keep behavioral regression scenarios in `test-prompts.json`.
- Synchronize runtime-installed copies only after validation, then verify checksums.
