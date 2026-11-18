---
name: brain-memory
description: Retrieve, remember, correct, consolidate, or forget durable knowledge through Basic Memory. Use for long-term preferences, decisions, workflows, and verified lessons; exclude temporary task context.
---

# Brain Memory

Use Basic Memory for the long-term memory operations covered by this skill. Current user instructions and applicable global or project instructions govern the task; the defaults here work without memory-specific global configuration.

## Authority

Relevant discovery and retrieval may run read-only. A mutation requires a current user request or applicable standing authorization covering the operation and target, plus the Write Gate below. Reuse existing authorization within its scope; retrieval alone grants none.

Applicable global or project policy determines proactive retrieval and recording triggers; this skill supplies the operation rules, not an additional standing authorization. Current read-only, review-only, or no-retention restrictions override standing mutation authorization.

Basic Memory administration, including installation, configuration, project creation or deletion, reset, reindex, import, and format, requires a separate explicit request.

## Core Loop

1. **Resolve the interface and project.** Read [interface selection](references/basic-memory-operations.md#interface-selection) and [project routing](references/basic-memory-operations.md#project-resolution) before calling either interface. Bind an unambiguous project before writing.
2. **Locate relevant notes.** Read a known, routed identifier directly; otherwise follow the [retrieval strategy](references/basic-memory-operations.md#retrieval). Deduplicate candidates by project and permalink. Search the destination for an equivalent canonical note before creating.
3. **Read, judge, and verify.** Read exact candidates in full and apply the [eligibility, reuse, and stopping rules](references/basic-memory-operations.md#retrieval). Use sufficient non-conflicting evidence for every part of the question; expand through relations only to fill a concrete gap.
4. **Apply the authorized operation.** Follow the relevant [create](references/basic-memory-operations.md#create), [update or consolidation](references/basic-memory-operations.md#update-and-consolidate), or [explicit forgetting](references/basic-memory-operations.md#explicit-forgetting) procedure. For create or update, apply the Write Gate and [note contract](references/basic-memory-operations.md#note-contract).
5. **Verify the outcome.** Follow [readback and failure handling](references/basic-memory-operations.md#verification-and-failure-handling) using the same project and permalink. Report unverified mutations without creating another copy.

A retrieval-only request ends after step 3, including when a bounded search leaves an explicit evidence gap. A concrete correction or new durable finding covered by current or standing authorization may proceed to step 4 as a separate mutation workflow. No durable change is a normal outcome; reading alone never triggers a write.

## Write Gate

Persist only knowledge likely to change future work, with a clear scope and traceable source:

- a durable user preference, project decision, verified failure lesson, or repeated procedure;
- a retrieval pointer that adds value beyond maintained project documentation;
- a distinction that prevents confusing similar repositories, paths, hosts, devices, branches, users, or products.

Keep maintained project facts in their authoritative documents; retain a pointer or a distinct lesson when useful. Temporary ports, process state, working-tree state, draft plans, raw transcripts, and copied logs remain task context. Keep progress, blockers, and next steps in the session or an authorized handoff mechanism. An explicit remember request still needs to pass this durability gate.

Retain high-sensitivity personal information only when the user explicitly requests the minimum necessary retention. Never put secrets in Basic Memory searches, titles, tags, relations, bodies, or CLI arguments.

Distinguish durable preferences from past workarounds. User emphasis may affect priority and review depth; it is neither evidence by itself nor a persisted memory type.

## Completion

Complete retrieval when each used note was read in full and met eligibility, and the question is covered or the remaining evidence gap is explicit. Complete a mutation only when routing and authorization are clear, the Write Gate passed where required, and the outcome was verified against the same project and permalink. Distinguish persisted, proposed, historical, deleted, and unverified outcomes as applicable.

Read [research grounding](references/research-grounding.md) only when auditing or extending this skill.
