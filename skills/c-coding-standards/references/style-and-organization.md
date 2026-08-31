# Style and Organization

Read this reference when creating or restructuring C files, applying style, or reviewing readability. Project-maintained style always wins unless it creates a concrete correctness defect.

## Discover before formatting

Inspect, in order:

1. repository instructions and contribution documentation;
2. `.clang-format`, formatter scripts, editor configuration, and CI formatting checks;
3. representative maintained files in the same component;
4. generated/vendor markers and generator templates;
5. public API, ABI, and include-layout constraints.

Do not combine Linux, GNU, embedded-vendor, and fallback conventions into a hybrid. Consistency within the target component matters more than personal preference.

## Fallback style when the project has none

These are `Recommended` defaults, not universal defects:

- UTF-8 source, LF line endings, no trailing whitespace, and a final newline.
- Four spaces per indentation level; do not mix tabs and spaces for indentation.
- K&R braces for blocks, with braces for every controlled statement.
- One statement and normally one declaration per line.
- A soft line limit of 100 columns. Break at semantic boundaries and keep related operands visibly grouped; exceed the limit when splitting would obscure a literal, diagnostic, URL, or searchable string.
- Spaces around binary operators and after commas; no spaces just inside parentheses. Keep unary operators and member access next to their operands.
- Let a formatter enforce layout after behavior is correct. Do not hand-align large regions with fragile columns of spaces.

## Naming

Names should expose role, domain, unit, and ownership without encoding change-prone implementation details.

| Element | Fallback convention | Guidance |
|---|---|---|
| Functions | `snake_case` verb or verb phrase | `parse_header`, `queue_pop`; avoid generic `process` when a precise verb exists |
| Variables | `snake_case` noun | Include units or representation where ambiguity matters: `timeout_ms`, `encoded_len` |
| Boolean values | positive predicate | `is_ready`, `has_value`, `can_retry`; avoid negated names that create double negatives |
| Macros and enum constants | `UPPER_SNAKE_CASE` | Add a component prefix for public or collision-prone names |
| Struct/union/enum tags | lower-case descriptive noun | Prefer named tags for debugger visibility and forward declarations |
| Public identifiers | component-prefixed | Use only the project's approved namespace; keep locals unprefixed |
| Files | lower-case, descriptive | Match the primary abstraction; avoid obsolete eight-character limits |

Do not default to Hungarian notation, `g_`/`s_` type prefixes, `fn_`, or company-specific abbreviations. Type information already enforced by the compiler rarely belongs in the name. A semantic qualifier such as `_count`, `_bytes`, `_fd`, or `_index` can prevent misuse.

Avoid reserved identifier space:

- never invent identifiers containing a double underscore;
- never begin an ordinary identifier with `_` followed by an uppercase letter;
- never create a leading-underscore identifier at file scope;
- do not define names reserved by the selected C implementation or platform;
- in POSIX code, check POSIX namespace rules before creating public typedefs or feature-test identifiers.

## Files and modules

Keep a source file focused on one cohesive abstraction. Split by responsibility and stable interface, not by an arbitrary line limit.

A conventional source order is:

1. short purpose/license header if the project requires one;
2. the implementation's own public header;
3. standard C headers;
4. platform/third-party headers;
5. project headers;
6. private macros, types, constants, and file-private state;
7. private prototypes only when ordering cannot be improved;
8. function definitions grouped by behavior.

Use the repository's include ordering when it differs. Including the own header first helps expose missing dependencies but is not a substitute for a dedicated header self-containment check.

Prefer small public surfaces. A public header should contain declarations and contract documentation, not private helpers, mutable storage definitions, or includes that callers do not need. Use forward declarations only when they preserve type correctness and reduce coupling; include the defining header when a complete type is required.

## Include guards

Use a collision-resistant, non-reserved guard derived from the project and path, for example:

```c
#ifndef ACME_NET_PACKET_H
#define ACME_NET_PACKET_H

/* declarations */

#endif /* ACME_NET_PACKET_H */
```

Use `#pragma once` only when the supported compiler set and project policy accept it. Put C++ linkage guards only in public C headers that are intended for C++ consumers; do not wrap C implementation files in `extern "C"`.

## Functions and control flow

Write functions around one responsibility and one level of abstraction. Use early validation and early returns when they reduce nesting. Multiple returns are acceptable when ownership remains obvious; a cleanup label is acceptable when it makes resource release safer. Do not enforce single-exit or ban `goto` without a selected profile that requires it.

Keep loop control in the loop construct when practical. Do not modify a counter unexpectedly inside the body. Prefer readable state machines or extracted helpers to deep interleaving of loops and conditions.

For `switch`:

- decide whether the domain is open or closed;
- handle invalid external values explicitly;
- mark intentional fallthrough in the form recognized by the toolchain;
- do not add an empty `default` merely to silence a diagnostic;
- preserve compiler help for exhaustive enums when the project relies on it.

## Declarations and constants

Declare objects near first meaningful use with the narrowest useful scope. Group declarations only when they share one purpose and lifetime. Do not use comma-separated declarations when different pointer binding or qualifiers would be easy to misread.

Use named constants for protocol values, units, states, limits, masks, and repeated domain values. Prefer:

- `enum` for related integral choices when its representation is not an external ABI contract;
- `static const` objects for typed values that need storage;
- a macro for preprocessing or integer constant-expression needs that the selected C edition cannot otherwise meet.

Do not replace self-evident values such as `0` in a count initialization with meaningless names. The goal is semantic clarity, not removal of every literal.

## Comments and documentation

Comments explain information the code cannot express clearly:

- why a design or workaround exists;
- preconditions, postconditions, units, ownership, lifetime, and aliasing;
- concurrency and interrupt invariants;
- hardware, ABI, protocol, or compiler assumptions;
- error and truncation behavior;
- non-obvious mathematical reasoning or security consequences.

Prefer comments near the maintained fact. Delete stale comments when code changes. Do not require a comment percentage, repeat each statement in prose, retain version-control history in file banners, or add template sections filled with “none.” Public API documentation should describe observable behavior rather than implementation steps.

Use `/* ... */` for portability to older C modes when the project requires it. `//` is standard since C99; it is not a universal defect in C99 and later projects.

## Formatting boundaries

- Reformat only the changed region unless the user or project requests a broader normalization.
- Keep generated files untouched and change their templates.
- Preserve vendor style in narrow downstream patches so future updates remain reviewable.
- Separate formatting-only changes from behavioral changes when repository practice values blame/diff clarity.
- Never hide a safety fix inside a repository-wide whitespace rewrite.
