# Verification

Read before selecting or reporting checks. Verification must match the project's language profile, target, build system, and side-effect permissions.

## Evidence order

1. Use documented repository commands and CI configuration.
2. Compile with the selected language mode and real project flags.
3. Run focused unit/integration tests, then broader suites proportional to the change.
4. Apply the project's formatter and lint/static-analysis targets.
5. Use dynamic analysis on supported executable builds.
6. Cross-build and test on the actual target or a justified emulator/harness.

Do not invent a replacement workflow when maintained commands exist. Do not change `-std`, enable extensions, disable warnings, add suppressions, or alter optimization solely to make a check pass.

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
- No analyzer is complete or sound for all C behavior. A clean report is not proof of safety.

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

Build against every supported C mode, compiler family, target data model, feature configuration, and endianness that materially changes behavior. If the full matrix is unavailable, run the safe subset and state what remains unverified.

For freestanding and safety-sensitive targets, supplement host tests with the actual cross-compiler, linker map/resource analysis, target or simulator execution, timing/stack evidence, and hardware-specific tests. Do not report host compilation as target validation.

## Formatting and generated code

Run the configured formatter only on intended first-party files or changed ranges. Verify that generated outputs are reproducible from the edited generator/template. Recheck the working tree after tools that may rewrite files.

## Verification report

Report:

- exact command or maintained target;
- tool/compiler version when material;
- selected language/profile and target;
- observed exit status and meaningful diagnostics;
- tests/checks passed, failed, skipped, or unavailable;
- whether any suppression or deviation was used;
- residual risks, especially missing cross-compiler, hardware, analyzer, coverage, or licensed compliance evidence.

Never convert “recommended,” “configured,” “not run,” or “unavailable” into “passed.”
