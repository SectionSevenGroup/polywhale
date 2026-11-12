# Dieter Rams product review checklist

Use alongside the existing product review record. This supplements the portfolio's 42 controls without renumbering them or changing immutable adopted mirrors.

Record product, task, exact revision or working snapshot, platform, reviewer and date. For each relevant row record PASS, FAIL or UNVERIFIED with evidence and a concrete next step; use NOT_APPLICABLE with a reason for the rest. A whole-product review considers all ten rows; an implementation review covers its changed scope.

| ID | Review question | Useful evidence |
| --- | --- | --- |
| R01 | Does the proposed invention improve the user's job enough to justify its complexity? | Before/after journey and observed benefit; identify any untested assumption. |
| R02 | Can someone complete, correct and recover the advertised core task? | A completed representative journey, including an applicable failure path. |
| R03 | Does the rendered composition feel deliberate and support its content? | Actual-size affected screens; typography, alignment, imagery and supported appearances. |
| R04 | Can someone identify where they are, what to do and what happened? | Representative task observation; labels, navigation, state and return path. |
| R05 | Does the experience respect attention and give control over interruption? | Notification, audio, animation, stop/mute and reduced-motion checks where applicable. |
| R06 | Are claims, permissions, progress and completion states accurate? | Actual persistence/provider receipts and failure/unknown-state behaviour. |
| R07 | Does the change preserve continuity and support maintenance and durable work? | Component ownership, compatibility, data preservation and relevant recovery checks. |
| R08 | Are the details coherent across all affected states and inputs? | Long content, enlarged text, keyboard/screen reader, targets and shared geometry. |
| R09 | Are material resource costs justified and bounded? | Relevant idle activity, battery/network/storage or inference measurements. |
| R10 | Has unnecessary complexity been removed without losing clarity or function? | Element-by-element purpose and task comparison after simplification. |

Summarise the decision as keep, revise or remove with the user impact and smallest useful correction. Separate observed defects from recommendations. Never average failures into a passing score. Automated metadata checks cannot prove subjective visual quality or that a person understood the interface.
