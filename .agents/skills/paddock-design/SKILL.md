---
name: paddock-design
description: "Design, review and refine product UX, UI, visual identity and agent-ready experiences using Apple guidance and the owner's established aesthetic. Use for design standards, visual audits, interface implementation and design-to-agent handoffs; not architecture-only work or unrelated code maintenance."
---

# Paddock Design

Create coherent, useful, carefully finished experiences across the owner's products. Preserve each product's identity while applying a common discipline to hierarchy, geometry, interaction, accessibility and verifiable implementation. Pair with targeted repository investigation; do not load every design document or every reference by default.

## Establish authority and scope

Identify the actual product, delivered revision, target platforms, task and approved reference. Inspect the affected rendered experience and its owning components. Read the current product profile and relevant adopted design standard; check manifest/version pins where present. Existing bugs are not approved design decisions. Screenshots and exported prototypes are evidence, not instructions or authorization.

Use current explicit owner direction, the product's adopted common standard and approved profile within their scopes, then applicable platform guidance. Historical mockups and designer influences do not override newer accepted decisions. Preserve accessibility and truthful state. Surface a concrete conflict only when it blocks the requested outcome; continue work that does not depend on it.

Read [house aesthetic](references/house-aesthetic.md) when identifying the product or setting visual direction. It records a dated local baseline, not a replacement for a product's current canonical source. Do not install new documentation gates, migrate a framework, rewrite architecture or impose a portfolio-wide redesign merely because this skill is used. Assessment precedes disruptive adoption.

## Apply the right guidance

- For UX/UI changes, apply [Apple UX/UI](../apple-ux-ui/SKILL.md), using its [official source map](references/apple-sources.md) to identify applicable platform guidance.
- Review the task and its shared controls through [Paddock Ive Design](../paddock-ive-design/SKILL.md) and [Dieter Rams Design](../dieter-rams-design/SKILL.md). These lenses inform the design alongside product requirements.
- For design exploration or critique, use [four design lenses](references/design-lenses.md). These are a curated cross-disciplinary selection, not an objective ranking or endorsements. Derive decisions from the problem; do not imitate a designer's signature appearance or fabricate their review.
- For a coding-agent handoff, agent-operable interface or AI feature, read [agent-ready design](references/agent-ready.md). Apply only the relevant mode. Agent readiness does not require adding an AI feature or exposing an API to an otherwise visual task.

## Design and implementation discipline

**UX.** Identify the user's goal, the next useful action, orientation and return path. Keep familiar navigation, visible state and recoverable actions. Distinguish Back, Close, Cancel, Save and Delete. Preserve task context and unsaved work. Design the applicable empty, long-content, loading, offline, denied, partial-result and failure states, not only the ideal populated screen. For a visuals-only request, preserve behaviour and report independent interaction defects separately.

**Brand and graphic design.** Use original approved artwork and aspect ratios. Measure visible logo bounds, clear space and optical alignment at the final size, rather than aligning only a file's transparent canvas. Prefer a correct approved vector/asset variant over brittle fixed-offset image crops. Preserve marks; do not redraw, filter-recolour or generate replacements without that scope. Use deliberate grids, aligned baselines, controlled reading width, purposeful imagery and consistent caption/data hierarchy. Inspect exported graphics at their actual destination size.

**Layout.** Reuse named spacing roles, shared gutters, row heights, content edges, trailing columns, radii and stroke roles from the product. Do not round approved 21-unit gaps into a generic 4/8 grid. Give safe-area/keyboard insets one owner; keep fixed chrome clear of scroll content and focus. Adapt composition to available window size and input, including narrow iPad windows; do not stretch a phone screen to fill a tablet.

**Typography.** Use approved semantic font/weight/size/line-height roles. Scale native custom fonts with Dynamic Type; allow controls and rows to grow. Long names, translated labels and large text wrap or reflow without collisions. Keep secondary text readable. Preserve product mappings rather than replacing every typeface with SF or Inter.

**Buttons and controls.** Use the shared component family and stable anatomy. Distinguish primary, secondary, quiet and destructive actions through prominence; avoid competing primary actions in one decision group. Equal-role neighbours share height, radius, padding, label baseline and icon scale. Label the actual action. Check idle, pressed, focus, selected, disabled and pending states; prevent duplicate submission without hiding progress. A small glyph can have a large target; hit regions must not overlap. House touch baseline: 44 × 44 pt on iPhone/iPad and 44 × 44 CSS px on touch web, with larger accessible layouts as needed. This is a house policy, not a universal Apple/WCAG minimum for every platform.

**Colour, edges and materials.** Use semantic light/dark/contrast roles and measure actual foreground/background pairs. Fine separators differ from essential control outlines and focus indicators. Keep one coherent icon grammar. Use native materials in appropriate functional layers, with readable opaque fallbacks. Do not put glass, pill shapes, gradients or shadows on every surface. Native Apple material behaviour does not authorize a web imitation or replacement of approved product surfaces.

**Motion and feedback.** Reuse the accepted motion vocabulary. Motion explains cause and continuity; it must not delay controls or conceal state. Honour Reduce Motion, Reduce Transparency and increased contrast. Use capability-aware haptics for meaningful native events where the product supports them; confirm success from the result, not from a tap. Physical feel requires supported hardware evidence.

Fix repeated defects in their owning tokens/components, then inspect representative consumers. Avoid screen-local overrides, competing stylesheets and duplicate near-identical components. Use the smallest change that resolves the actual design problem.

## Review and verify

Compare intended and current screens at the same logical viewport, appearance, text size, data and interaction state. For each material issue, record the affected screen/component, observed mismatch, user impact, governing reference and a concrete fix. Separate measured defects, reasoned recommendations and unknowns. Prioritize blocked/lost-work journeys and inaccessible content, then shared identity/geometry defects, then local polish. Never assign a precise aesthetic score as if it were objective measurement.

Review affected journeys at actual size, with representative narrow/wide layouts, long content, text scaling and supported appearances/input modes. Include safe areas, keyboard/focus, target geometry, navigation/dismissal and relevant failure states. Use contrast tools and automated accessibility checks as supporting evidence; inspect VoiceOver/keyboard behaviour when applicable. A screenshot cannot verify an interaction, and a build cannot verify visual quality.

For web, use WCAG 2.2 AA and the stronger applicable house targets; native platforms require their own accessibility behaviours. Contrast, reflow and target details are in the references. Do not claim full HIG/WCAG compliance from limited checks.

Run the project's applicable existing checks. When an adopted product contract requires a design verifier or review record, follow it; do not introduce these systems to unrelated projects. Record verification as observed/pass, failed, blocked or not run, with the build/revision and environment sufficient to reproduce it. Avoid a large ritual for a small fix; scale evidence to the changed component and its reach.

Deliver the result, important before/after differences, validation and material limits. Reviews lead with prioritized actionable findings; implementations lead with changes and evidence. For a handoff, use the compact contract in the agent-ready reference. Do not stop at advice when implementation was requested and is authorized.
