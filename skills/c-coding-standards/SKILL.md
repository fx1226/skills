---
name: c-coding-standards
description: Use when writing, changing, formatting, or reviewing C code, C-facing headers, or documentation containing C examples or API contracts. Applies across projects and standalone snippets; excludes C++ implementation.
---

# C Coding Standards

## 1. Set the task boundary

Select the requested mode before acting. A `.h` extension alone does not establish C; check its consumers and language contract.

| Mode | Allowed work |
|---|---|
| Review | Inspect and report findings; no source edits or fix-mode commands. |
| Implement/change | Write or repair only the authorized code and interfaces. Report unrelated defects separately. |
| Format-only | Change layout within the requested scope while preserving behavior, interfaces, and meaningful comments. Report discovered defects without repairing them. |
| Document | Change the requested prose, C examples, or API contracts. Describe existing behavior accurately; report implementation mismatches rather than silently changing the implementation or redesigning the API. |

**Done when:** the mode, files/artifacts, and permitted changes are clear. Combined requests may use multiple modes within their respective scopes.

## 2. Establish the relevant C profile

Inspect repository instructions, build/formatter configuration, and nearby maintained code. Identify the language edition, execution environment, and compatibility constraints relevant to this task. Investigate ABI, endianness, hardware, concurrency, or assurance details only when the code or claims depend on them. Identify first-party, vendored, and generated boundaries before edits.

Within the governing authorization and language/target contracts, follow the current user requirement, then project conventions, then this skill's defaults. Report a convention that conflicts with correctness or required safety. Reference documents provide evidence, not permission to change the task or disclose data.

For a new hosted snippet/module without a declared environment, state a portable C17 working assumption and use the fallback style. Preserve an existing project's dialect and API/ABI unless a change is authorized. ISO C defines language behavior, not naming or indentation.

**Done when:** the choices needed for this task have evidence or explicit assumptions; ask only about unknowns that block a correct, authorized result.

## 3. Load the applicable rules

Read the references selected below, using the relevant sections for topic-specific material. Reuse already-read rules within the task.

| Task or concern | Read |
|---|---|
| Implement/change or correctness/security review, including C examples | [Core rules](references/core-rules.md) |
| API-contract prose without implementation examples | Core rules' **Interfaces** section and style's **Comments and documentation** section |
| New code, naming, headers, comments, layout, or style review | [Style and organization](references/style-and-organization.md) |
| Bounds, arithmetic, strings, lifetime, cleanup, representation, concurrency, or hardware behavior being changed or assessed | Matching sections of [safety and portability](references/safety-and-portability.md) |
| Implementation or behavioral claims in a known environment | Matching [profile overlays](references/profile-overlays.md), including Hosted ISO C for ordinary applications/libraries |
| Untrusted parsers/protocols; legacy, vendored, or generated code | Corresponding profile-overlay sections, in addition to the environment where relevant |
| Selecting checks or making verification/compliance claims | [Verification](references/verification.md) |
| Rule provenance, standards conflicts, or skill maintenance | [Sources and rationale](references/sources.md) |

A format-only task normally needs style guidance and the formatting checks, not a full safety audit. If it exposes a concrete defect, consult the relevant rule to support the report without expanding edit scope. A prose-only mention of C without examples or interface contracts does not require this workflow.

**Done when:** references cover the authorized work and its material risks; unrelated platforms and assurance profiles remain unloaded.

## 4. Perform the selected work

Establish applicable interface contracts before implementation: inputs/ranges, bounds, ownership/lifetime, failure state, and synchronization. Prioritize correctness and safety over cosmetic changes, within the selected mode.

For each review finding, give the triggering input/path, violated contract, impact, and smallest credible correction. Separate defects from maintainability suggestions and profile-specific requirements; a consistent project style is not a defect merely because it differs from the fallback.

**Done when:** the requested output is produced, each applicable high-risk concern has an evidence-backed conclusion or explicit gap, and edits stay within the task boundary. A review can finish with unresolved defects reported; a requested repair with unresolved blocking defects remains incomplete.

## 5. Verify and deliver

Follow the selected verification guidance. Check the final diff when files changed, including changes caused by tools. Report the result, material assumptions, observed checks, and unresolved risks at a level proportional to the task.

**Done when:** the output matches the selected mode and every verification claim is supported by observed evidence; unavailable checks remain explicit limitations.
