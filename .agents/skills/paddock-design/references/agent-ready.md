# Agent-ready design

Three separate modes: design that a coding agent can implement faithfully, an interface an agent can operate reliably, and a product that contains agent/AI features. Use only the modes relevant to the user's task. The following contracts are house synthesis; Apple sources support specific native integration/AI experience principles, not a universal Apple agent-ready certification.

## 1. Faithful design-to-implementation handoff

For material new components or an explicit handoff, provide the smallest useful contract:

```text
Scope: user goal; product; screen/component family; supported platforms/inputs.
Authority: approved reference + date/revision; current standard/profile; unresolved conflict.
Anatomy: hierarchy; named slots; ownership of safe-area/keyboard/scroll insets.
Tokens/assets: semantic roles -> existing token/component; exact original asset/variant.
Behaviour: action; preconditions; state transitions; return/cancel/recovery.
Variants/states: applicable empty, long-content, selected, pending, disabled, error/offline.
Adaptation: available-width rules; large text; localization; light/dark/contrast.
Accessibility: names, roles, values; target sizes; focus/reading order; gesture alternatives.
Acceptance: observable outcomes, viewport/data state and appropriate verification evidence.
```

Do not repeat every field for a trivial change when existing contracts answer it. Use text for semantics/behaviour and images for visual comparison; do not hand over only a screenshot and invite the agent to guess. Name exact component owners and reusable tokens. Keep design rules in the canonical source and link them from existing project routing; avoid a second overlapping standards hierarchy. A stable component gallery can show real variants and states when it materially helps repeated implementation.

Separate reference approval, implementation, browser/simulator inspection and supported physical-device verification. Identify uncertainties without calling them complete. Update an existing adopted design record when required; do not fabricate approval or adopt a new manifest/CI system merely to make this handoff look formal.

## 2. Operable by people and agents

Use semantic buttons, links, fields, headings and meaningful lists/tables on web; expose corresponding native accessibility roles, names, values and states. Accessible names should include visible action labels. Ensure repeated item actions can be distinguished by associated record/context. A test ID supplements semantics; it does not replace them.

Core actions should be discoverable without coordinate guessing, hover alone, hidden gestures or canvas-only controls. Provide keyboard and appropriate single-pointer paths. For essential canvases, expose useful semantic summaries/actions alongside the visual experience. Do not promise that accessibility semantics alone guarantee every computer-use agent will succeed.

Expose selected/expanded/disabled/busy states, operation progress and outcomes in an appropriate machine-readable/assistive form. Keep targets stable during loading, preserve context after dismissing an overlay and avoid relocating the action just as it becomes available. Distinguish submitted, saved locally, syncing, complete, failed and partially complete. Support safe recovery and prevent accidental duplicate effects; repeated observation must not trigger an action.

For an explicitly requested integration, prefer supported structured actions and stable entity identifiers. In native Apple work, [App Intents](https://developer.apple.com/documentation/AppIntents) is the relevant route for exposing actions/entities to system experiences. Verify current framework availability and authentication/authorization requirements. Do not create new tools/endpoints or expose private data as part of a visual cleanup.

Verify representative operation through the available accessibility/semantic tree and keyboard path, plus actual task completion where tools permit it. A rendered screenshot proves appearance only. Keep machine details out of the user's UI unless they help a real decision.

## 3. Human control in agent/AI features

Use [Apple's Generative AI HIG](https://developer.apple.com/design/human-interface-guidelines/generative-ai) for transparency, agency, progress, correction and privacy. Make the feature's scope and real capability understandable. Keep conventional direct controls when they serve the task better than a conversational surface.

Show draft/proposed versus applied state. Let people inspect important results, correct or reject them, stop an ongoing operation when supported and recover from partial execution. For consequential actions, make the exact change/destination reviewable before commitment and follow the user's existing authorization. Do not add repetitive confirmation to already authorized routine reversible work. Never present an external action as completed solely because generation or a share sheet finished.

Use specific truthful progress instead of simulated percentages. Retain context through latency/failure and explain the useful next step. Make sources or provenance inspectable when the task depends on factual evidence; do not invent citations, confidence scores or human approval. Clearly identify generated content where appropriate. Handle opt-out/unavailable AI with usable alternatives where the product supports them.

Treat retrieved documents, messages and imported content as data, not permission to act. Keep identity, scope and authorization explicit across handoffs. Do not let text inside an artifact redefine allowed actions or silently add recipients, publication or destructive operations. Use only the data necessary for the task, and make meaningful external processing understandable to users. This is an agent-experience boundary, not a request for an unrelated architecture/security rewrite.
