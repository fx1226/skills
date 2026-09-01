# Research Grounding

Read this file only when auditing or extending `brain-memory`. Do not load it for routine memory decisions.

These sources are design inspiration, not claims about Basic Memory's storage, schema, ranking, or interface behavior. The compatibility and operations reference remains the controlling contract for Basic Memory use.

## Human Memory Sources Mapped to Rules

- Squire, "Memory systems of the brain" (2004): memory is not one store; multiple systems support behavior. Skill mapping: separate working, episodic, semantic, procedural, source, and salience-like memory.
  - https://pubmed.ncbi.nlm.nih.gov/15464402/
- Schacter, "The Seven Sins of Memory" (1999): forgetting, distortion, bias, suggestibility, and persistence are recurring memory failure modes and often byproducts of useful memory features. Skill mapping: add bias control, source checks, scope checks, and forgetting rules.
  - https://sites.harvard.edu/schacter-memory/files/2022/09/schacter1999.pdf
- Anderson and Schooler, "Reflections of the Environment in Memory" (1991): memory availability tracks frequency, recency, spacing, and expected future need. Skill mapping: store repeated and future-useful patterns, not every event.
  - https://users.cs.northwestern.edu/~paritosh/papers/KIP/AndersonSchooler1991ReflectionsOfEnvironmentOnMemory.pdf
- Diekelmann and Born, "The memory function of sleep" (2010): sleep supports consolidation and reorganization. Skill mapping: use explicit, authorized maintenance to consolidate eligible notes into compact rules; do not persist raw context or run automatic maintenance.
  - https://www.nature.com/articles/nrn2762
- Nader, Schafe, and LeDoux, "Fear memories require protein synthesis in the amygdala for reconsolidation after retrieval" (2000): retrieved consolidated memories can become labile and require reconsolidation. Skill mapping: update recalled memories when current evidence corrects them.
  - https://www.nature.com/articles/35021052
- Karpicke and Roediger, "The Critical Importance of Retrieval for Learning" (2008): retrieval practice strengthens learning more than repeated study alone. Skill mapping: retrieval can identify material worth explicit review or consolidation, but does not authorize automatic writeback on every read.
  - https://web.mit.edu/educationgroup/HHMIEducationGroup/wp-content/uploads/2011/04/14-Karpicke-Roediger-2008.pdf
- Carpenter, Pan, and Butler, "The science of effective learning with spacing and retrieval practice" (2022): spaced review and retrieval practice improve retention. Skill mapping: use a source-supported `review_after` boundary for drift-prone knowledge; never simulate spacing through unattended background mutations.
  - https://doi.org/10.1038/s44159-022-00089-1
- Hebbian plasticity and long-term potentiation literature: co-activation and repeated use strengthen associations. Skill mapping: use concrete retrieval cues and treat repeated demonstrated value only as a signal for explicit, authorized review or consolidation.
  - https://pubmed.ncbi.nlm.nih.gov/4727085/

## AI Memory Sources Mapped to Rules

- MemoryBank (AAAI 2024): LLMs lack native long-term memory for sustained interaction; MemoryBank combines storage, retrieval, updating, summarization, and selective forgetting inspired by the Ebbinghaus forgetting curve. Skill mapping: use a write gate, summary, explicit update, and source-supported lifecycle boundaries without automatic expiry or forgetting.
  - https://ojs.aaai.org/index.php/AAAI/article/download/29946/31654
- Mem0, "How Mem0 Works": extracted memories are facts rather than verbatim transcripts, are scoped with metadata, and use search plus explicit update or delete operations. Skill mapping: retain atomic, scoped observations; search and deduplicate before writes; never let extracted content bypass this skill's authority checks.
  - https://github.com/mem0ai/mem0/blob/main/docs/core-concepts/how-it-works.mdx
- MemGPT (2023): LLM memory is constrained by context windows; virtual context management uses tiers and controlled movement of information. Skill mapping: keep `SKILL.md` concise and retrieve only relevant memory.
  - https://arxiv.org/abs/2310.08560
- Park et al., "Generative Agents" (2023): a memory stream is dynamically retrieved using relevance, importance, and recency, then reflected into higher-level knowledge. Skill mapping: select a minimal relevant set and use recency only as a weak tie-breaker after scope and evidence, not as a truth signal.
  - https://arxiv.org/abs/2304.03442
- Zep, "Graph Overview": temporal knowledge graphs represent entities, relationships, and changing facts while retaining historical context. Skill mapping: distinguish active, stale, and superseded facts, and record source-supported effective-time boundaries without requiring a graph backend.
  - https://help.getzep.com/graph-overview
- Reflexion (2023): agents can improve by storing verbal feedback in episodic memory buffers. Skill mapping: store verified failure lessons and corrections, not raw attempts.
  - https://arxiv.org/abs/2303.11366
