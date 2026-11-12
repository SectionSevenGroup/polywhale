# Apple guidance: sources, versioning and application

Research baseline: 2026-10-21. Use official Apple sources for Apple claims. HIG pages are living documents, not a single annually frozen standard. Record the URL, relevant section, observed update date if supplied, target OS/SDK and access date for a version-sensitive design decision. If a page needs JavaScript, use its published Markdown link or official session transcript; do not substitute a third-party mirror without disclosing the evidence gap.

## Years versus versions

- **2025:** [Meet Liquid Glass, WWDC25](https://developer.apple.com/videos/play/wwdc2025/219/) and [Build a SwiftUI app with the new design](https://developer.apple.com/videos/play/wwdc2025/323/) establish the new material and platform adoption context.
- **2026:** [Principles of great design, WWDC26](https://developer.apple.com/videos/play/wwdc2026/250/) discusses purpose, agency, responsibility, familiarity, flexibility, simplicity, craft and delight. Apply those through the actual journey, not a visual checklist alone.
- **OS 27:** [Platforms State of the Union, WWDC26](https://developer.apple.com/videos/play/wwdc2026/102/), design segment, documents refinements for the 27 releases: improved material readability/separation, user-adjustable tint and adaptive/resizable experiences. Prefer supported native behaviour; verify API availability before implementation. This is 2026 publication evidence about OS 27, not calendar-year 2027 documentation.
- **Calendar 2027:** Future relative to this baseline. Do not invent or assert a published 2027 standard. When later doing 2027 work, verify official publication and distinguish released guidance from previews. Updating a skill for future publications requires actual later research; this file does not imply an automatic monitor.

New guidance informs a scoped comparison. It does not authorize replacing a product's accepted identity or silently upgrading its deployment target/framework.

## Sources to consult by task

| Task | Primary source | Decision it informs |
| --- | --- | --- |
| Orientation and principles | [HIG](https://developer.apple.com/design/human-interface-guidelines), [WWDC26 principles](https://developer.apple.com/videos/play/wwdc2026/250/) | Make the task understandable and preserve user control; craft includes behaviour and feedback. |
| Materials | [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Liquid Glass overview](https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass) | Reserve Liquid Glass for appropriate functional/navigation layers; ordinary content should not acquire competing glass surfaces. Use it sparingly and respect contrast/transparency settings. |
| Geometry | [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) | Work with safe areas, hierarchy and available space rather than fixed screenshot offsets. |
| Type | [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Scaling fonts automatically](https://developer.apple.com/documentation/uikit/scaling-fonts-automatically) | Keep semantic type roles and accessible scaling, including custom brand fonts. |
| Actions | [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) | Similar role/size for neighbouring actions; prominence identifies the preferred action without inconsistent geometry. |
| Inclusive interaction | [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility) | Usable targets, assistive technology, text scaling, perceivable state and alternatives to sensory-only cues. |
| Intelligent features | [Generative AI](https://developer.apple.com/design/human-interface-guidelines/generative-ai) | Identify AI use, preserve agency, offer refinement/recovery and honest progress, account for privacy and availability. The inspected change log lists updates on 9 June 2025 and 8 June 2026. |
| Structured native actions | [App Intents](https://developer.apple.com/documentation/AppIntents), [Getting started](https://developer.apple.com/documentation/appintents/getting-started-with-the-app-intents-framework) | Model actual actions and entities for system discoverability where integration is in scope. Do not claim accessibility labels alone make an app Siri-integrated. |

The house font, spacing, radii, line weights, colours and motion timings belong to product profiles. Do not attribute them to Apple. Native points, CSS pixels and physical pixels are distinct; do not transfer numerical rules between platforms without deliberate mapping. Use native platform controls where appropriate; on web, honour browser semantics/history and the approved brand rather than imitating iOS indiscriminately.

## Accessibility measurements

Use [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for web acceptance alongside native platform guidance. The house 44-unit touch baseline is deliberately stronger than WCAG 2.2 AA's 24 × 24 CSS-pixel target criterion with exceptions. Do not call 44 pt the universal current Apple minimum: the inspected Apple accessibility table distinguishes platform default and minimum sizes.

For web, measure normal-text contrast at 4.5:1, qualifying large text at 3:1, and meaningful control/graphic contrast at 3:1 where the criteria apply. WCAG large text is 24 CSS px regular or approximately 18.67 CSS px bold. Test text resize to 200% and general content reflow at 320 CSS px; handle essential two-dimensional content with its appropriate exceptions/alternatives. Check keyboard focus visibility, order, modal focus restoration, labels, state announcements and non-drag paths. Native Dynamic Type and VoiceOver need their own review; a web resize check is not a substitute.

These are scoped acceptance checks, not a claim of complete conformance. Verify actual content and states, including complex backgrounds and accessibility appearances. Record what was observed and what remains untested.
