---
name: apple-ux-ui
description: Apply current official Apple Human Interface Guidelines to app UX/UI, interaction, accessibility, native controls, materials, and AI flows. Use when app work changes what people see or do.
---

# Apple UX/UI

Read [Apple's Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles/) and the current HIG sections that govern the changed interaction. Use the [official source map](../paddock-design/references/apple-sources.md) to select relevant sections. Compare the guidance with the delivered screen and the approved product profile before implementation. Confirm platform and SDK availability for version-sensitive choices.

## Review the interaction

| Apple principle | Check in the affected journey |
| --- | --- |
| Purpose | Identify the user task and make its next meaningful action easy to find. |
| Agency | Preserve choice, a clear way back, and a way to recover. Make state and consequences visible. |
| Responsibility | Communicate privacy, permissions, real capabilities, and the result of consequential actions. |
| Familiarity | Reuse platform conventions and the product's established control semantics. |
| Flexibility | Adapt to screen size, input methods, content length, text scaling, and accessibility settings. |
| Simplicity | Clarify hierarchy and reduce decisions that do not advance the task. |
| Craft | Inspect alignment, affordance, transition continuity, and feedback in the actual implementation. |
| Delight | Use moments of character where they help the experience and respect user settings. |

Prefer native patterns where available. Preserve the product's approved visual identity. On the web, use semantic controls, keyboard access and browser navigation alongside applicable WCAG guidance. Keep visible focus, semantic labels and states, an alternative to essential gesture-only actions, and readable content under relevant motion, transparency, and contrast settings.

For AI or agentic flows, also consult [Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai), [App Intents](https://developer.apple.com/documentation/appintents), and [Apple's agentic feature security guidance](https://developer.apple.com/videos/play/wwdc2026/347/). Make capabilities, proposed effects, and the point of commitment clear. Give users control over consequential actions and a recovery path when available.

Verify the changed interaction in the rendered preview with representative data and accessibility settings. Record device-specific behavior only after testing it on the applicable platform and hardware.
