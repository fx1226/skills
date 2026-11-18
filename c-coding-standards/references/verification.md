# Verification

Read before selecting or reporting checks. Verification must match the project's language profile, target, build system, and side-effect permissions.

## Select checks by task mode

Use maintained project commands and required gates first. Select additional checks by changed behavior and risk; the sections below are a menu, not a mandatory full-toolchain run for every task.

| Mode | Proportional checks and completion evidence |
|---|---|
| Review | Inspect contracts and reachable paths; run focused checks where they can resolve a finding. Keep maintained source unchanged, using isolated build outputs where needed. Report unresolved evidence gaps. |
| Implement/change | Build in the selected mode, test affected behavior/boundaries, and use relevant configured analyzers. Extend to broader suites or targets when impact or project gates require them. |
| Format-only | Check formatter conformance and the scoped diff. Preserve tokens and preprocessing behavior, especially macro continuations, directive boundaries, token separation, and meaningful comments. Compile/test if the transformation leaves semantic doubt; a whitespace-insensitive diff alone is not proof. |
| Document | Match API prose against declarations and implementation. For changed C examples, compile/test a representative harness where available, or state the verification gap. Prose-only changes do not require an unrelated target matrix. |

Stop once required gates and risk-relevant checks are satisfied, unless a new change, failure, or unresolved question justifies more work. Keep the language mode, extensions, diagnostics, and optimization policy intact rather than weakening them to obtain a pass.

## Compiler diagnostics

Treat warnings as review inputs that need resolution or a documented, narrow suppression. `-Wall` does not mean every warning, and more warnings are not automatically better.

When a new GCC/Clang project has no warning policy, a starting evaluation set may include:

```text
-Wall -Wextra -Wpedantic -Wformat=2
-Wconversion -Wsign-conversion -Wshadow
-Wstrict-prototypes -Wmissing-prototypes
```

Calibrate flags to compiler versions, generated/third-party boundaries, and false-positive cost before making them CI gates. Add `-Werror` only when the project controls compiler drift and has a deliberate exception policy. Preserve required target/vendor diagnostics even when GCC/Clang flags differ.

Explicitly set `-std=c11`, `-std=c17`, `-std=c23`, or the declared GNU/vendor mode in maintained builds rather than relying on changing compiler defaults.

## Static analysis

Prefer the repository's configured analyzer and rule profile. When absent and supported, candidates include GCC `-fanalyzer`, Clang Static Analyzer/`scan-build`, and platform-specific tools.

- Supply realistic defines, include paths, target information, and generated sources.
- Triage findings against reachable code and interface contracts.
- Record analyzer version and configuration.
- Keep suppressions local, justified, and reviewable; do not globally disable a category to hide one false positive.
- Interpret results within the analyzer's documented coverage and limitations.

## Dynamic analysis

Use dynamic tools in dedicated test builds, with debug information and representative inputs.

- AddressSanitizer: out-of-bounds, use-after-free, and related memory errors on supported targets.
- UndefinedBehaviorSanitizer: selected undefined/suspicious operations such as invalid shifts, misalignment, and signed overflow.
- MemorySanitizer: uninitialized reads when the program and relevant dependencies can be instrumented appropriately.
- ThreadSanitizer: data races in a separate compatible build; do not assume it combines with every other sanitizer.
- Leak tools: ownership leaks where the platform/runtime supports meaningful detection.

Sanitizer runtimes are bug-finding tools for testing, not production hardening by default. Host sanitizer success does not validate a cross-compiled ABI, device MMIO, ISR timing, or target-only library.

## Tests

Select cases from the contract and risk surface:

- zero, one, minimum, maximum, and just-outside numeric values;
- empty input, exact-fit buffer, one-byte-short capacity, maximum length, truncation, and missing terminator;
- malformed tags, inconsistent lengths, noncanonical encoding, and trailing data;
- allocation/resource failure at each acquisition step;
- every partial-initialization cleanup path;
- overlap and alias cases where the contract permits or rejects them;
- endian, alignment, and representation variants;
- concurrent interleavings, cancellation, signal/ISR interaction, and lock-order failures where relevant;
- public API compatibility and header self-containment.

Use property tests or fuzzing for parsers and state machines when a deterministic oracle/invariant exists. Preserve minimal regressions for discovered defects.

## Portability and target matrix

Exercise supported C modes, compiler families, data models, feature configurations, and endianness affected by the change, plus any matrix required by project gates. If required targets are unavailable, run the safe subset and identify the remaining target-specific risks. Unchanged formatting or prose does not by itself justify a full matrix.

For freestanding and safety-sensitive targets, supplement host tests with the actual cross-compiler, linker map/resource analysis, target or simulator execution, timing/stack evidence, and hardware-specific tests. Do not report host compilation as target validation.

## Generated-code verification

When an authorized change affects a generator/template, regenerate with the documented toolchain and check reproducibility. Apply the [ownership policy](profile-overlays.md#third-party-and-generated-code) when selecting editable inputs.

## Verification report

Keep the report proportional: include only applicable items, with material gaps explicit.

- exact command or maintained target;
- tool/compiler version when material;
- selected language/profile and target;
- observed exit status and meaningful diagnostics;
- tests/checks passed, failed, skipped, or unavailable;
- whether any suppression or deviation was used;
- residual risks, especially missing cross-compiler, hardware, analyzer, coverage, or licensed compliance evidence.

Never convert “recommended,” “configured,” “not run,” or “unavailable” into “passed.” Compilation, tests, analysis, and sanitizers provide complementary evidence, not proof that undefined behavior or vulnerabilities are absent.

## Assurance claims

An ordinary review or tool pass cannot establish full ISO/CERT conformance, MISRA compliance, safety integrity, or certification. Such claims need the exact applicable edition, defined scope, rule mapping, tools and evidence, documented deviations, and the authorized assurance process. Report the bounded checks performed and missing evidence; continue useful review without inventing compliance. For a project requiring formal assurance, also read its [high-assurance overlay](profile-overlays.md#safety-critical-or-high-assurance).
