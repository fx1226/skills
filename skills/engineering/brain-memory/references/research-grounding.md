# Research Grounding

Read this file only when auditing or extending `brain-memory`. Do not load it for routine memory decisions.

## Human Memory Sources Mapped to Rules

- Squire, "Memory systems of the brain" (2004): memory is not one store; multiple systems support behavior. Skill mapping: separate working, episodic, semantic, procedural, source, and salience-like memory.
  - https://pubmed.ncbi.nlm.nih.gov/15464402/
- Schacter, "The Seven Sins of Memory" (1999): forgetting, distortion, bias, suggestibility, and persistence are recurring memory failure modes and often byproducts of useful memory features. Skill mapping: add bias control, source checks, scope checks, and forgetting rules.
  - https://sites.harvard.edu/schacter-memory/files/2022/09/schacter1999.pdf
- Anderson and Schooler, "Reflections of the Environment in Memory" (1991): memory availability tracks frequency, recency, spacing, and expected future need. Skill mapping: store repeated and future-useful patterns, not every event.
  - https://users.cs.northwestern.edu/~paritosh/papers/KIP/AndersonSchooler1991ReflectionsOfEnvironmentOnMemory.pdf
- Diekelmann and Born, "The memory function of sleep" (2010): sleep supports consolidation and reorganization. Skill mapping: periodically consolidate raw notes into compact rules.
  - https://www.nature.com/articles/nrn2762
- Nader, Schafe, and LeDoux, "Fear memories require protein synthesis in the amygdala for reconsolidation after retrieval" (2000): retrieved consolidated memories can become labile and require reconsolidation. Skill mapping: update recalled memories when current evidence corrects them.
  - https://www.nature.com/articles/35021052
- Karpicke and Roediger, "The Critical Importance of Retrieval for Learning" (2008): retrieval practice strengthens learning more than repeated study alone. Skill mapping: memories that are retrieved and prove useful should be strengthened or consolidated.
  - https://web.mit.edu/educationgroup/HHMIEducationGroup/wp-content/uploads/2011/04/14-Karpicke-Roediger-2008.pdf
- Hebbian plasticity and long-term potentiation literature: co-activation and repeated use strengthen associations. Skill mapping: use concrete retrieval cues and strengthen repeated high-value associations.
  - https://pubmed.ncbi.nlm.nih.gov/4727085/

## AI Memory Sources Mapped to Rules

- MemoryBank (AAAI 2024): LLMs lack native long-term memory for sustained interaction; MemoryBank combines storage, retrieval, updating, summarization, and selective forgetting inspired by the Ebbinghaus forgetting curve. Skill mapping: require write gate, summary, update, and expiration.
  - https://ojs.aaai.org/index.php/AAAI/article/download/29946/31654
- MemGPT (2023): LLM memory is constrained by context windows; virtual context management uses tiers and controlled movement of information. Skill mapping: keep `SKILL.md` concise and retrieve only relevant memory.
  - https://arxiv.org/abs/2310.08560
- Reflexion (2023): agents can improve by storing verbal feedback in episodic memory buffers. Skill mapping: store verified failure lessons and corrections, not raw attempts.
  - https://arxiv.org/abs/2303.11366
