---
name: paddock-context-governor
description: Select the minimum reliable repository, product, and design context for app work. Use at the start of app tasks and to route UX/UI changes to the shared Apple, Ive, and Rams skills.
---

# Paddock Context Governor

Use minimum sufficient context. Before substantive repository work, identify internally: the exact objective, affected subsystem, minimum documentation and source files, and verification needed. Ask what fact is missing, what smallest file, diff, search, or document can answer it, and whether current context already answers it reliably. Acquire more context selectively when correctness requires it, and explain why.

## Route product and design context

- At the start of portfolio app work, read [Dieter Rams Design](../dieter-rams-design/SKILL.md) and its principles reference. Use the ten principles to inform decisions relevant to the task. For backend, release, or other non-visual work, the useful checks may be honest status, durability, or efficient use of resources.
- For work affecting what people see or do, use [Paddock Design](../paddock-design/SKILL.md), [Apple UX/UI](../apple-ux-ui/SKILL.md), and [Paddock Ive Design](../paddock-ive-design/SKILL.md). Read the affected product profile, the relevant Apple HIG, and the minimum implementation and rendered evidence needed. Treat an attached screenshot as evidence about the screen. Take the requested change from the user's message.
- Use the repo's pinned package when present. Keep adopted product profiles and current owner decisions in the loop. If working from a local installed copy, compare the package revision when an adopted pin exists. Reuse sources within a conversation while they still apply.

Identify the repository from its git remote and current branch. Start with lightweight state where useful: `git status`, relevant recent commits, changed files, relevant diff, and structure only to the needed depth. If `AGENTS.md` exists, use it selectively as a routing document; its references are not instructions to load every document. If it is absent, inspect only files needed for the task; do not scan the repository or create documentation to compensate. No repository needs dedicated context architecture before work begins. Select project documentation by subsystem, including `CURRENT-STATE.md`, `DECISIONS.md`, `ARCHITECTURE.md`, `DESIGN-SYSTEM.md`, `KNOWN-ISSUES.md`, and workflow-specific documents only when relevant.

Prefer targeted file and symbol search, import/dependency tracing, relevant file sections, and `git diff` over broad reads. Never read an entire repository by default, or reread it merely because a new task begins. Do not ingest `node_modules`, build output, generated files, caches, binary assets, vendor directories, or lockfiles unless the task requires them. Avoid rereading unchanged files within a task. If a few files suffice, keep scope there; perform a repository-wide audit only when explicitly requested.

For a requested broad audit, divide the repository into bounded domains, inspect each selectively, retain concise findings, then synthesize. Do not load the whole repository into one context window or spawn multiple agents just for breadth when targeted inspection by one agent suffices. Recommend or create repository-level context routing only for repeated use, large or contradictory documentation, or an explicit user request. Optimize cumulative token use; context infrastructure should cost fewer tokens than it is likely to save.

Treat repository state and canonical documentation as durable memory; consult old chat history only when repository information is insufficient. Recommend a fresh conversation for a materially new objective, and `/compact` when context grows large during the same objective. Never trade correctness for token savings.
