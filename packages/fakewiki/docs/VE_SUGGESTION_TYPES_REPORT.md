# VisualEditor Suggestion Types Report

## Scope

This report explains how VisualEditor (VE) computes the suggestion badge count and summarizes the high-level logic for each known suggestion-capable edit check type.

The focus is the VE edit-check system (not GrowthExperiments structured-task UI counts).

## How the VE Suggestion Badge Count Is Calculated

High-level flow:

1. VE initializes the edit-check controller.
2. On edit-related listeners (primarily `onDocumentChange` and `onBranchNodeChange`), VE asks the edit-check factory for actions.
3. VE creates both:
   - regular check actions, and
   - suggestion actions (when suggestion mode is enabled/visible).
4. VE deduplicates overlapping check/suggestion actions where needed.
5. VE filters current actions to only suggestion actions (`action.isSuggestion()`).
6. Badge count is set to the number of those suggestion actions.
7. Badge display is capped to `9+` (internal count can still be greater).

Important behavior notes:

- The count is live and session-dependent, not a static server-side page metric.
- The count changes as user edits, cursor context changes, async checks resolve, or actions are dismissed/resolved.
- Suggestion visibility toggle affects whether suggestion actions are included in active actions.

Primary implementation locations:

- `public/ve/editcheck/modules/controller.js`
- `public/ve/editcheck/modules/EditCheckFactory.js`
- `public/ve/editcheck/modules/EditCheckSuggestionsTool.js`
- `public/ve/editcheck/modules/init.js`

## How Suggestion Types Are Enabled

Whether a check can appear as a suggestion is config-driven.

- Base behavior comes from each check's `defaultConfig` (`showAsCheck`, `showAsSuggestion`).
- Wiki/site config is merged in from:
  - `VisualEditorEditCheckDefaultConfig`
  - `MediaWiki:Editcheck-config.json`
- Effective config then determines if a check runs in suggestion mode.

Primary implementation locations:

- `public/ve/editcheck/modules/editchecks/BaseEditCheck.js`
- `public/ve/editcheck/includes/ResourceLoaderData.php`

## Suggestion Type Summaries

Below are the high-level behaviors for suggestion-capable checks that commonly contribute to the VE suggestion badge count.

### Add Reference (`addReference`)

- Detects added/modified content ranges that appear to need citation support.
- In suggestion mode, can evaluate broader content ranges than strict "new insertion only" paths.
- Produces actions prompting citation insertion.

File:

- `public/ve/editcheck/modules/editchecks/checks/AddReferenceEditCheck.js`

### Tone (`tone`)

- Runs an async model inference call (`edit-check:predict`) for candidate text.
- Uses a probability threshold to decide whether to produce a suggestion action.
- Suggestion appears when model confidence crosses configured threshold.

File:

- `public/ve/editcheck/modules/editchecks/checks/ToneCheck.js`

### External Link (`externalLink`)

- Detects modified external links in article body.
- Excludes interwiki-like links.
- Suggests removing or converting link usage as appropriate.

File:

- `public/ve/editcheck/modules/editchecks/checks/ExternalLinkEditCheck.js`

### Duplicate Link (`duplicateLink`)

- Detects repeated internal links within configured scope (`paragraph` or `section`).
- Excludes the first occurrence and surfaces duplicates for cleanup.

File:

- `public/ve/editcheck/modules/editchecks/checks/DuplicateLinkEditCheck.js`

### Disambiguation Link (`disambiguation`)

- Uses link metadata lookup to detect links pointing to disambiguation pages.
- Suggests replacing with a more specific target.

File:

- `public/ve/editcheck/modules/editchecks/checks/DisambiguationEditCheck.js`

### Heading Level (`headingLevel`)

- Detects heading-level jumps (for example, skipped hierarchy levels).
- Triggers when changed heading regions meet mismatch condition.

File:

- `public/ve/editcheck/modules/editchecks/checks/HeadingLevelEditCheck.js`

### Image Caption (`imageCaption`)

- Detects newly added thumbnail images without meaningful caption content.
- Suggests adding an explanatory caption.

File:

- `public/ve/editcheck/modules/editchecks/checks/ImageCaptionEditCheck.js`

### Convert Reference (`convertReference`)

- Detects reference structures that are eligible for conversion into citation template workflow.
- Suggests conversion when strictness criteria are met.

File:

- `public/ve/editcheck/modules/editchecks/checks/ConvertReferenceEditCheck.js`

### Year Link (`yearLink`)

- Detects mismatch between year in link label text and year in link target page.
- Suggests aligning one side with the other.

File:

- `public/ve/editcheck/modules/editchecks/checks/YearLinkEditCheck.js`

### Text Match (`textMatch`)

- Rule-based matcher over configured terms/patterns.
- Can emit replace/delete/info-style actions depending on per-rule configuration.
- Potentially high-volume contributor depending on configured match items.

File:

- `public/ve/editcheck/modules/editchecks/checks/TextMatchEditCheck.js`

## Additional Checks Seen in EditCheck Modules

These checks are present in the EditCheck module set and can be enabled/disabled through config.
For the entries below, defaults are based on each check class `defaultConfig`.

### Citation Needed (`citationNeeded`)

- Detects newly added inline transclusions compatible with the citation-needed context item.
- Produces actions for those transclusion ranges and offers an "add citation" flow.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/CitationNeededEditCheck.js`

### Paste (`paste`)

- Detects pasted content via imported-data annotations grouped by paste event id.
- Filters trusted sources (internal/word processor/plain-text categories), minimum paste length, and validity checks.
- Produces keep/remove actions with feedback capture on keep.
- Default behavior: check-oriented; `showAsSuggestion: false`.

File:

- `public/ve/editcheck/modules/editchecks/checks/PasteCheck.js`

### Double Bold (`doubleBold`)

- Detects bold annotation where formatting is usually redundant:
  - subheadings (`level >= 3`),
  - table header cells,
  - definition-list terms.
- Produces a remove-bold action for matching ranges.
- Default behavior: `showAsCheck: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/DoubleBoldEditCheck.js`

### Fake Heading (`fakeHeading`)

- Detects bold text used like headings in root paragraphs.
- Looks for fully covered modified content ranges containing bold annotation, then suggests converting to real heading nodes.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (experimental/off by default).

File:

- `public/ve/editcheck/modules/editchecks/checks/FakeHeadingEditCheck.js`

### Required Template Param (`requiredTemplateParam`)

- Detects edited transclusions missing required parameters.
- Loads TemplateData for component templates and checks required params for missing/empty values.
- Produces an action to open the transclusion editor.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/RequiredTemplateParamEditCheck.js`

### Redirect (`redirect`)

- Detects modified internal links whose targets are redirects (via link cache metadata).
- Excludes cases where label/target matching suggests intentional compact-wikitext forms.
- On fix action, resolves and rewrites link to final target using API query with redirects enabled.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/RedirectEditCheck.js`

### Suggested Link (`suggestedLink`)

- Fetches link recommendations from the link-recommendation service.
- Maps recommendation contexts to document ranges, applies score threshold, ensures text still matches and is unlinked, and requires relevant modification touch.
- Produces accept/dismiss actions; accept annotates the suggested internal link.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/SuggestedLinkEditCheck.js`

Directory for all checks:

- `public/ve/editcheck/modules/editchecks/checks/`

## Key Caveats

- Badge count is an action count, not a page quality score.
- Async checks (notably tone) can update the badge after initial UI render.
- Dismissal/review state affects active action list and therefore count.
- Suggestion mode toggle and wiki config materially change which types contribute.

