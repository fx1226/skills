# Sources and Rationale

Use this reference when a rule needs provenance, standards versions are in question, or this skill is being maintained. URLs and status were checked on 2026-08-31.

## What “official C standard” means

There is no ISO universal C indentation, brace, naming, or comment style. ISO/IEC 9899 specifies the C language and its interpretation; project style is a separate engineering convention. This skill therefore combines:

1. the selected ISO C language edition and implementation contract;
2. secure-coding rules and publicly reviewable security guidance;
3. the selected platform/profile requirements;
4. repository-local organization and style;
5. conservative fallback conventions only where the project is silent.

## Primary language sources

- [ISO/IEC 9899:2024 — Programming languages — C](https://www.iso.org/standard/82075.html): the current fifth edition, published in 2024 and commonly called C23. It defines language syntax, semantics, implementation limits, and portability concerns; it is not a style guide.
- [ISO/IEC JTC 1/SC 22/WG14](https://open-std.org/jtc1/sc22/wg14/): the official C working group, with project status, public drafts, defect/issue records, and reports. Public drafts help interpretation but are not a substitute for the final published edition.
- [WG14 C issues](https://www.open-std.org/jtc1/sc22/wg14/issues/): language and technical-specification issue records. Check the selected edition because behavior and optional features differ across C90, C99, C11, C17, and C23.

The repository's declared edition governs the code. “Current standard is C23” is not permission to upgrade an older supported codebase.

## Security and high-assurance sources

- [ISO/IEC TS 17961:2013 — C secure coding rules](https://www.iso.org/standard/61134.html) and [Cor 1:2016](https://www.iso.org/standard/72086.html): ISO secure-coding rules and diagnostic examples. The specification explicitly does not prescribe coding style.
- [SEI CERT C Coding Standard](https://wiki.sei.cmu.edu/confluence/display/c): public, community-maintained rules and recommendations grouped around preprocessor, declarations, expressions, integers, floating point, arrays, strings, memory, I/O, environment, signals, errors, APIs, concurrency, and platform topics. Use current leaf pages when an exact CERT mapping is required.
- [How the SEI CERT C standard is organized](https://wiki.sei.cmu.edu/confluence/display/c/How%2Bthis%2BCoding%2BStandard%2Bis%2BOrganized): distinction between normative rules and recommendations, rule identifiers, examples, risk assessment, and related guidance.
- [MISRA C:2025](https://misra.org.uk/product/misra-c2025/): current licensed industry guidance for critical systems. The text and formal compliance process are proprietary/licensed. This skill does not reproduce its rule text and cannot establish MISRA compliance. A real MISRA claim requires the selected edition, licensed rules, project classification, tool mapping, deviations, and assurance evidence.

CERT, TS 17961, and MISRA are not interchangeable with ISO C language conformance. Use their exact identifiers only after consulting the authoritative edition; do not invent mappings from this skill's internal rule IDs.

## Platform and style sources

- [Linux kernel coding style](https://kernel.org/doc/html/latest/process/coding-style.html): authoritative for Linux kernel contributions. Its 8-column tabs, kernel APIs/types, GNU extensions, and other conventions are a kernel profile, not universal C style. This skill adopts broadly useful rationales—reviewable control flow, cohesive functions, intentional comments, and avoiding tricky expressions—without imposing kernel layout elsewhere.
- [GNU Coding Standards](https://www.gnu.org/prep/standards/standards.html) and [Standard C guidance](https://www.gnu.org/prep/standards/html_node/Standard-C.html): authoritative for GNU packages and useful portability rationale. GNU brace/indentation choices and extension policy are project conventions, not ISO requirements.
- [POSIX.1-2024](https://pubs.opengroup.org/onlinepubs/9799919799/): authoritative API and environment contract when a project targets POSIX. It does not govern freestanding, Windows, kernel, or arbitrary embedded targets.

The disagreement between Linux and GNU formatting is useful evidence: style must be selected by project, not presented as one official universal answer.

## Tool documentation

- GCC: [warning options](https://gcc.gnu.org/onlinedocs/gcc/Warning-Options.html), [static analyzer options](https://gcc.gnu.org/onlinedocs/gcc/Static-Analyzer-Options.html), and [instrumentation/sanitizers](https://gcc.gnu.org/onlinedocs/gcc/Instrumentation-Options.html).
- Clang/LLVM: [Static Analyzer](https://clang.llvm.org/docs/ClangStaticAnalyzer.html), [AddressSanitizer](https://clang.llvm.org/docs/AddressSanitizer.html), [UndefinedBehaviorSanitizer](https://clang.llvm.org/docs/UndefinedBehaviorSanitizer.html), [MemorySanitizer](https://clang.llvm.org/docs/MemorySanitizer.html), [ThreadSanitizer](https://clang.llvm.org/docs/ThreadSanitizer.html), and [clang-format options](https://clang.llvm.org/docs/ClangFormatStyleOptions.html).

Tool behavior changes by version and target. Prefer project-pinned documentation and configuration. Static analysis and sanitizers detect classes of defects; none proves correctness or complete absence of undefined behavior.

## Secondary-source handling

Historical, organizational, and proprietary guides are non-authoritative unless the current project explicitly adopts them. Use them only to discover candidate concerns, then retain a rule only when it is independently supported by the selected language, platform, security profile, or project evidence. Do not store private-source provenance, reproduce proprietary text or examples, or turn organization-specific naming, tools, approvals, or numeric thresholds into universal requirements.

## Conflict resolution

| Question | Governing source |
|---|---|
| Is the construct valid and what does it mean? | Selected ISO C edition plus compiler/implementation documentation |
| Is an implementation/ABI assumption supported? | Target compiler, ABI, hardware, OS, and build evidence |
| What security rule applies? | Required project profile, then TS 17961/CERT; MISRA only with licensed project scope |
| What style should the patch use? | Repository instructions, formatter, and neighboring maintained code |
| What should kernel code do? | Current kernel tree documentation and subsystem rules |
| What should POSIX code do? | Declared POSIX edition and platform documentation |
| Which diagnostics/checks are valid? | Project configuration and the exact tool version's official documentation |

When a secondary guide conflicts with language semantics or the actual target contract, follow the language/target evidence and record the deviation from the secondary guide.

## Maintenance rules

- Recheck edition/status links before changing a standards claim.
- Prefer primary publisher, standards-body, project, and compiler documentation over summaries.
- Do not copy paywalled or proprietary rule text into the skill.
- Add a rule only when it changes implementation/review decisions and has a clear applicability boundary.
- Preserve the distinction among language correctness, security, profile policy, style, and verification evidence.
