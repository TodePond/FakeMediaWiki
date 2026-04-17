# VisualEditor Suggestion Types Report

## Scope

This report explains how VisualEditor (VE) computes the suggestion badge count and summarizes the implementation logic for each known suggestion-capable edit check type.

The focus is the VE edit-check system (not GrowthExperiments structured-task UI counts).

Prototype scope for this repository:

- English Wikipedia only (`enwiki`).
- Off-wiki simulation focused on editor-open behavior.

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

For prototype parity with VE, treat every type in terms of **editor-open suggestions**: what can appear right after VE loads and suggestion-mode checks run.

Cross-check preconditions from code:

- Suggestions are only generated when suggestion mode is actually visible (`controller.suggestionsVisible`).
- During initial setup, controller runs `refresh()` on load and executes mid-edit listeners (`onDocumentChange`, `onBranchNodeChange`).
- Suggestion passes call checks with `includeSuggestions=true`, which changes "modified range" logic to be broad (often whole-document scope), so many checks can surface immediately on open.

### Add Reference (`addReference`)

- Detects added/modified content ranges that appear to need citation support.
- In suggestion mode, can evaluate broader content ranges than strict "new insertion only" paths.
- Produces actions prompting citation insertion.

File:

- `public/ve/editcheck/modules/editchecks/checks/AddReferenceEditCheck.js`

Prototype notes:

- **Listener path:** `onBranchNodeChange` (mid-edit suggestion path) delegates to `onBeforeSave` when suggestions are visible.
- **Candidate selection details:** `findAddedContent()` starts from `getAddedContentRanges()` (which becomes broad in suggestion mode), then removes ranges that already contain references (`mwReference`, excluding placeholders; or template refs where `attributes.mw.name === 'ref'`) and ranges covered by `citationNeeded` detections.
- **Lead/section paragraph rules:** range must be inside a root content branch (or section-edit root), not a heading, not nested contexts like image captions/table cells; section allow/deny is handled by shared config gates (`ignoreLeadSection`, `ignoreSections`, `includeSections`).
- **enwiki config detail:** current enwiki config sets `ignoreLeadSection: true` and ignores sections like references/external-links/see-also style sections, so add-reference candidates are intentionally article-body focused.
- **Threshold/config gates:** `minimumCharacters` default is `50` and is enforced in `isRangeValid`; default also ignores disambiguation pages.
- **Editor open behavior:** with `includeSuggestions=true`, modified/additional range logic broadens enough that existing uncited ranges can appear on load.
- **Off-wiki implementation (enwiki-only):** build paragraph candidates from parsed article body sections only (exclude lead and ignored section titles), discard non-root/non-paragraph contexts, require text length `>= 50`, then keep only paragraphs without `<ref>`/reference-template signals and without citation-needed-priority overlaps.

### Tone (`tone`)

- Runs an async model inference call (`edit-check:predict`) for candidate text.
- Uses a probability threshold to decide whether to produce a suggestion action.
- Suggestion appears when model confidence crosses configured threshold.

How candidate fragments are selected (code path):

1. On editor open, controller `refresh()` runs both mid-edit listeners: `onDocumentChange` and `onBranchNodeChange`.
2. `ToneCheck` inherits `AsyncTextCheck` and implements `onBranchNodeChange` / `onBeforeSave` (not `onDocumentChange`).
3. `AsyncTextCheck.handleListener()` asks `BaseEditCheck.getModifiedContentBranchNodes()`.
4. In suggestion mode (`includeSuggestions=true`), `BaseEditCheck.getModifiedRanges()` treats all top-level content branch node ranges as modified (excluding internal list).
5. For each resulting branch node, tone sends plain text from `documentModel.data.getText( true, node.getRange() )` to inference.
6. Dismissed ranges are skipped (except explicit `onCheckAll` paths).
7. Async requests are batched (up to 100 instances/request), then filtered by `prediction && probability >= predictionThreshold` (default `0.8`).

Runtime gates that must pass:

- Check must be enabled for suggestion mode by effective config (`showAsSuggestion` path).
- Content language must be one of `en`, `es`, `fr`, `ja`, `pt` (`allowedContentLanguages`).
- Usual range validity filters still apply (section includes/excludes, quoted-content ignore rules, etc.).

File:

- `public/ve/editcheck/modules/editchecks/checks/ToneCheck.js`

Prototype notes:

- **Editor open:** yes, if suggestion-mode `tone` is enabled and language gate passes.
- **Production model call:** `POST https://api.wikimedia.org/service/lw/inference/v1/models/edit-check:predict` with batched instances (`modified_text`, `page_title`, `check_type=tone`, `lang`).
- **Decision rule:** keep actions where `prediction` is truthy and `probability >= predictionThreshold` (`0.8` default).
- **Exactly how candidates are chosen:** candidates are *content branch nodes*, not arbitrary substrings. On open in suggestion mode, VE treats all top-level content branch nodes (excluding internal list) as modified, maps them to content ranges, deduplicates by branch node, and sends each node's full plain text as one model instance.
- **Candidate exclusions:** empty/whitespace text, dismissed ranges, invalid-section ranges, and quoted-content ranges (when `ignoreQuotedContent` is active) are excluded before final action creation.
- **Off-wiki implementation (enwiki-only):**
  1. Parse page content into top-level article-body blocks (paragraph/list-item/blockquote/table-cell text blocks) and use each block as one candidate fragment.
  2. Exclude ignored sections, dismissed fragments, and empty text; preserve stable fragment ids.
  3. Batch-call the same Lift Wing endpoint using `lang=en`.
  4. Return suggestion actions for passing scores, and keep async update behavior (results may land after initial render).
  5. Persist per-fragment dismiss state so repeated loads mimic VE suppression.

### External Link (`externalLink`)

- Detects modified external links in article body.
- Excludes interwiki-like links.
- Suggests removing disallowed external-link markup in article body.

File:

- `public/ve/editcheck/modules/editchecks/checks/ExternalLinkEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Candidate selection:** `getModifiedLinkRanges()` over external-link annotations (`MWExternalLinkAnnotation`), then async filter with `target.isInterwikiUrl(href)`.
- **Allowed vs not allowed:** interwiki-like URLs are explicitly allowed and skipped; non-interwiki external links in candidate ranges are flagged.
- **Action behavior:** this check only offers `remove` (clear external-link annotation) or `dismiss`; it does not auto-convert.
- **Editor open behavior:** in suggestion mode, broad modified-range logic can surface pre-existing external links immediately.
- **Off-wiki implementation (enwiki-only):** parse external links from article content, skip links matching interwiki-like targets, and emit remove-link suggestions for in-body links that pass section/range filters.

### Duplicate Link (`duplicateLink`)

- Detects repeated internal links within configured scope (`paragraph` or `section`).
- Excludes the first occurrence and surfaces duplicates for cleanup.

File:

- `public/ve/editcheck/modules/editchecks/checks/DuplicateLinkEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Core algorithm:** builds all internal links grouped by `normalizedTitle`, computes candidate modified links, then checks duplicates within configured scope (`paragraph` default, or level-2-heading `section` ranges).
- **Allowed vs not allowed (exact):**
  - allowed: first occurrence of a title within the active scope
  - not allowed: second and later root-level occurrences of the same normalized title in that scope
  - ignored: duplicates that only occur in non-root contexts, or titles appearing once in scope
- **Off-wiki implementation (enwiki-only):** build scope buckets (paragraph by default), index links by normalized title, keep first in-scope root occurrence, and emit suggestions only for 2nd+ root occurrences in the same bucket.

### Disambiguation Link (`disambiguation`)

- Uses link metadata lookup to detect links pointing to disambiguation pages.
- Suggests replacing with a more specific target.

File:

- `public/ve/editcheck/modules/editchecks/checks/DisambiguationEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Candidate selection:** modified internal links only, excluding links that intentionally target a fragment (`annotation.getFragment()`).
- **Dependency:** `linkCache.get(lookupTitle).disambiguation` decides if target is a disambiguation page.
- **Allowed vs not allowed (exact):**
  - allowed: links to non-disambiguation targets
  - allowed: links with explicit fragment targets (treated as intentionally specific)
  - not allowed: non-fragment internal links whose target page is marked disambiguation
- **Off-wiki implementation (enwiki-only):** resolve each internal link target via page metadata, skip explicit fragment links, and flag only true disambiguation targets for retargeting.

### Heading Level (`headingLevel`)

- Detects heading-level jumps (for example, skipped hierarchy levels).
- Triggers when changed heading regions meet mismatch condition.

File:

- `public/ve/editcheck/modules/editchecks/checks/HeadingLevelEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Detection rule:** iterate headings in document order, track previous heading level, and flag when `level - previousLevel > 1`.
- **Range gating:** heading must touch modified ranges and not be dismissed.
- **Off-wiki implementation (enwiki-only):** parse heading levels from page structure, detect non-sequential jumps, and emit fix suggestions for each offending heading.

### Image Caption (`imageCaption`)

- Detects newly added thumbnail images without meaningful caption content.
- Suggests adding an explanatory caption.

File:

- `public/ve/editcheck/modules/editchecks/checks/ImageCaptionEditCheck.js`

Prototype notes:

- **Listener path:** `onBranchNodeChange` plus `onBeforeSave` (same implementation).
- **Candidate selection:** `getAddedNodes(document, 'mwBlockImage')`, then filters:
  - image type is `thumb`
  - has `mwImageCaption` child
  - caption is structurally empty (`length === 2` with content-capable child)
- **Editor open behavior:** with suggestion-mode broad added-node logic, existing uncaptured thumbnail images can appear on open.
- **Off-wiki implementation (enwiki-only):** build file candidates from `[[File:...]]` / media blocks, keep only thumbnail-style usages, parse caption payload, and flag candidates where caption is absent/empty placeholder text. (This is the "file" candidate path in prototype terms.)

### Convert Reference (`convertReference`)

- Detects reference structures that are eligible for conversion into citation template workflow.
- Suggests conversion when strictness criteria are met.

File:

- `public/ve/editcheck/modules/editchecks/checks/ConvertReferenceEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Candidate selection:** added `mwReference` nodes only (deduped by index number), then `CitoidReferenceContextItem.getConvertibleHref()` gate.
- **Strictness modes:** `url-only` (default), `covered`, or `any`; each progressively broadens convertibility criteria.
- **Off-wiki implementation (enwiki-only):** detect new `<ref>` nodes and classify convertibility by URL-only/covered logic; emit convert-reference suggestions for candidates.

### Year Link (`yearLink`)

- Detects mismatch between year in link label text and year in link target page.
- Suggests aligning one side with the other.

File:

- `public/ve/editcheck/modules/editchecks/checks/YearLinkEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Detection rule:** for each modified internal link, extract exactly one 3/4-digit year from target and label; if both exist and differ, create action.
- **Action semantics:** exposes two explicit fixes (`useTarget`, `useLabel`) derived from mismatch direction.
- **Off-wiki implementation (enwiki-only):** parse link target+label year tokens and emit mismatch suggestions with both proposed rewrites.

### Text Match (`textMatch`)

- Rule-based matcher over configured terms/patterns.
- Can emit replace/delete/info-style actions depending on per-rule configuration.
- Potentially high-volume contributor depending on configured match items.

What "configured terms" means in practice:

- Terms come from merged match-item config:
  - static defaults (`TextMatchEditCheck.static.matchItems`)
  - plus wiki config (`mw.editcheck.config.textMatch.matchItems`, typically from `MediaWiki:Editcheck-config.json`)
- Match items can inline terms in `query` or `import` another MediaWiki JSON page (must be `MediaWiki:*` and end in `.json`).
- Matching is whole-word (`wholeWord: true`) with separate case-sensitive and case-insensitive finder pipelines.
- A hit only becomes an action if it touches modified ranges, passes per-item config gates, and satisfies `minOccurrences` (if set).

Production snapshot (checked live wiki configs):

- `enwiki` currently has `textMatch` enabled with 4 match items:
  - `british-english` via import `MediaWiki:Editcheck-config-textmatch-british-english.json`
  - `LLM-user-comms` (22 phrases, paragraph expansion)
  - `LLM-immediate-indicators` (37 phrases, paragraph expansion)
  - `LLM-multiple-indicators` (74 phrases, paragraph expansion, `minOccurrences: 3`)
- The imported `british-english` list currently contains 464 replacement pairs (e.g., `analyze -> analyse`, `color -> colour`, `center -> centre`).
- Representative LLM-phrase terms in production include:
  - User-comms style: `I hope this helps`, `Of course!`, `Would you like`
  - Immediate indicators: `indelible mark`, `important to note`, `In conclusion`
  - Multi-indicator bucket: `playing a vital role`, `key turning point`, `industry reports`
- Detailed local references in this repo:
  - `packages/fakewiki/docs/ENWIKI_TEXTMATCH_REFERENCE.md`
  - `packages/fakewiki/docs/ENWIKI_TEXTMATCH_LLM_TERMS.json`

Editor-open behavior specifics:

- `TextMatchEditCheck` runs on `onDocumentChange` (and not on `onBeforeSave`).
- On open, controller refresh triggers `onDocumentChange`; in suggestion mode, modified-range logic is broad enough that existing page terms can surface immediately.

File:

- `public/ve/editcheck/modules/editchecks/checks/TextMatchEditCheck.js`

Prototype notes:

- **Listener path:** runs on `onDocumentChange` only (`onBeforeSave` is disabled for this check).
- **Candidate selection:** whole-word term scan over document text, then filter to ranges touching modified content ranges; in suggestion mode those ranges are broad enough to include open-time content.
- **Per-item gates:** `listener` match, `doesConfigMatch` for the item, `isRangeValid`, optional `expand`, and `minOccurrences`.
- **Action modes:** item `mode` determines UI/behavior (`replace`, `delete`, `info`, fallback default).
- **British-English template gate:** yes, this is important. The imported `british-english` item uses `config.hasTemplate` and only activates when one of the configured English-variant templates is present in the page transclusions (checked by `BaseEditCheck.static.doesConfigMatch` template scan).
- **Off-wiki implementation (enwiki-only):**
  1. Load term sets from `ENWIKI_TEXTMATCH_LLM_TERMS.json`.
  2. Resolve `british-english` from the source URL in `ENWIKI_TEXTMATCH_REFERENCE.md` (or cache a local snapshot if needed).
  3. Parse page transclusions and enforce `hasTemplate`/`lacksTemplate` gates before evaluating each item (required for `british-english`).
  4. Run whole-word scans with case-sensitive and insensitive pipelines.
  5. Group by expanded fragment and apply `minOccurrences` semantics.
  6. Emit deterministic action payloads with item id, matched term, mode, and replacement (if present).


### Citation Needed (`citationNeeded`)

- Detects newly added inline transclusions compatible with the citation-needed context item.
- Produces actions for those transclusion ranges and offers an "add citation" flow.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/CitationNeededEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Candidate selection:** added inline transclusion nodes (`mwTransclusionInline`) that satisfy `MWCitationNeededContextItem.isCompatibleWith`.
- **Default state:** disabled by default (`showAsSuggestion: false`) unless explicitly configured on.
- **Off-wiki implementation (enwiki-only):** detect known citation-needed template invocations and expose add-citation actions only when this check is explicitly enabled in prototype config.

### Paste (`paste`)

- Detects pasted content via imported-data annotations grouped by paste event id.
- Filters trusted sources (internal/word processor/plain-text categories), minimum paste length, and validity checks.
- Produces keep/remove actions with feedback capture on keep.
- Default behavior: check-oriented; `showAsSuggestion: false`.

File:

- `public/ve/editcheck/modules/editchecks/checks/PasteCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange` (not currently active in `onBeforeSave`).
- **Candidate selection:** `ImportedDataAnnotation` ranges grouped by `eventId`, excluding trusted source categories (`internal`, `wordProcessor`, `plain`).
- **Thresholding:** keeps original paste length per event id and requires at least `minimumCharacters` (default `50`).
- **Editor open behavior:** generally no for snapshot-only simulation; this check is event-state-dependent.
- **Off-wiki implementation (enwiki-only):** mark as unsupported in pure open-time mode (or always empty), unless prototype session model includes captured paste events and source metadata.

### Double Bold (`doubleBold`)

- Detects bold annotation where formatting is usually redundant:
  - subheadings (`level >= 3`),
  - table header cells,
  - definition-list terms.
- Produces a remove-bold action for matching ranges.
- Default behavior: `showAsCheck: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/DoubleBoldEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Candidate selection:** bold annotation ranges that are modified, valid-section, non-dismissed, and located in:
  - heading level >= 3
  - table header cell (`style=header`)
  - definition list term (`style=term`)
- **Off-wiki implementation (enwiki-only):** detect bold spans within those structural contexts and emit remove-bold suggestions.

### Fake Heading (`fakeHeading`)

- Detects bold text used like headings in root paragraphs.
- Looks for fully covered modified content ranges containing bold annotation, then suggests converting to real heading nodes.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (experimental/off by default).

File:

- `public/ve/editcheck/modules/editchecks/checks/FakeHeadingEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Candidate selection:** modified content ranges with `coveredNodesOnly=true`, requires bold annotation and root paragraph node.
- **Default state:** experimental/off by default (`showAsSuggestion: false`).
- **Off-wiki implementation (enwiki-only):** identify fully-bold root paragraphs and emit convert-to-heading suggestions with level heuristic (`>=3` style target).

### Required Template Param (`requiredTemplateParam`)

- Detects edited transclusions missing required parameters.
- Loads TemplateData for component templates and checks required params for missing/empty values.
- Produces an action to open the transclusion editor.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/RequiredTemplateParamEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Candidate selection:** transclusion nodes touching modified ranges and not dismissed.
- **Dependency:** fetch TemplateData per transclusion part; flag when any `required` param is missing or empty.
- **Default state:** off by default (`showAsSuggestion: false`).
- **Off-wiki implementation (enwiki-only):** use TemplateData API for templates in article transclusions, evaluate required params, emit edit-template suggestions where required args are absent.

### Redirect (`redirect`)

- Detects modified internal links whose targets are redirects (via link cache metadata).
- Excludes cases where label/target matching suggests intentional compact-wikitext forms.
- On fix action, resolves and rewrites link to final target using API query with redirects enabled.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/RedirectEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **Candidate selection:** modified internal links only; excludes compact-intent cases where link label title starts with target title.
- **Dependency:** `linkCache.get(lookupTitle).redirect`.
- **Fix behavior:** resolve redirect target via Action API (`query`, `redirects=true`) and rewrite annotation to final title.
- **Off-wiki implementation (enwiki-only):** run redirect-resolution lookup for internal links and emit update-link suggestions unless compact-label exclusion applies.

### Suggested Link (`suggestedLink`)

- Fetches link recommendations from the link-recommendation service.
- Maps recommendation contexts to document ranges, applies score threshold, ensures text still matches and is unlinked, and requires relevant modification touch.
- Produces accept/dismiss actions; accept annotates the suggested internal link.
- Default behavior: `showAsCheck: false`, `showAsSuggestion: false` (off unless configured on).

File:

- `public/ve/editcheck/modules/editchecks/checks/SuggestedLinkEditCheck.js`

Prototype notes:

- **Listener path:** `onDocumentChange`.
- **API dependency:** `https://api.wikimedia.org/service/linkrecommendation/v1/linkrecommendations/{project}/{lang}/{title}` with per-surface caching.
- **Hard gate in VE:** only runs on Wikipedia hostnames.
- **Candidate mapping:** uses `context_before + link_text + context_after` and `match_index` to recover target ranges from current document text.
- **Action filters:** score threshold (`predictionThreshold`, default `0.6`), range not collapsed, text unchanged, currently unlinked, touches modified range, not dismissed.
- **Off-wiki implementation (enwiki-only):** call same endpoint for `wikipedia/en`, map contexts to ranges, and emit suggestions only for currently unlinked/high-score matches.

Directory for all checks:

- `public/ve/editcheck/modules/editchecks/checks/`

## FakeWiki Method Mapping (enwiki)

Per-type simulation methods implemented in `FakeWiki`:

- `tone` -> `getVeToneSuggestions(pageTitle, options?)`
- `textMatch` -> `getVeTextMatchSuggestions(pageTitle)`
- `externalLink` -> `getVeExternalLinkSuggestions(pageTitle)`
- `duplicateLink` -> `getVeDuplicateLinkSuggestions(pageTitle, options?)`
- `disambiguation` -> `getVeDisambiguationSuggestions(pageTitle)`
- `addReference` -> `getVeAddReferenceSuggestions(pageTitle)`
- `imageCaption` -> `getVeImageCaptionSuggestions(pageTitle)`
- `yearLink` -> `getVeYearLinkSuggestions(pageTitle)`
- `convertReference` -> `getVeConvertReferenceSuggestions(pageTitle, options?)`
- `citationNeeded` -> `getVeCitationNeededSuggestions(pageTitle)`
- `doubleBold` -> `getVeDoubleBoldSuggestions(pageTitle)`
- `requiredTemplateParam` -> `getVeRequiredTemplateParamSuggestions(pageTitle)`
- `redirect` -> `getVeRedirectSuggestions(pageTitle)`
- `suggestedLink` -> `getVeSuggestedLinkSuggestions(pageTitle, options?)`
- `fakeHeading` -> `getVeFakeHeadingSuggestions(pageTitle)`

All methods return the normalized shape:

- `{ pageTitle, pageId, suggestionType, candidates, suggestions, diagnostics }`

## Playground Default Pages (confirmed)

Confirmed pages with at least one suggestion during implementation testing:

- `getVeToneSuggestions` -> `Artificial intelligence`
- `getVeTextMatchSuggestions` -> `Algorave`
- `getVeExternalLinkSuggestions` -> `Wet Leg`
- `getVeDuplicateLinkSuggestions` -> `Wet Leg`
- `getVeDisambiguationSuggestions` -> `United Kingdom`
- `getVeAddReferenceSuggestions` -> `Wet Leg`
- `getVeYearLinkSuggestions` -> `United States`
- `getVeConvertReferenceSuggestions` -> `Wet Leg`
- `getVeCitationNeededSuggestions` -> `United Kingdom`
- `getVeDoubleBoldSuggestions` -> `Glossary of mathematics`
- `getVeRedirectSuggestions` -> `Wet Leg`
- `getVeSuggestedLinkSuggestions` -> `Algorave`
- `getVeFakeHeadingSuggestions` -> `Wet Leg`

No confirmed page found during this pass:

- `getVeImageCaptionSuggestions`
- `getVeRequiredTemplateParamSuggestions`

These are candidates to drop or rework if we require guaranteed non-empty playground defaults per type.

## Key Caveats

- Badge count is an action count, not a page quality score.
- Async checks (notably tone) can update the badge after initial UI render.
- Dismissal/review state affects active action list and therefore count.
- Suggestion mode toggle and wiki config materially change which types contribute.
- For this repository's prototypes, treat `enwiki` as the only supported wiki target.
- For prototype parity, use an editor-open simulation: run enabled suggestion checks over the loaded page snapshot with suggestion mode enabled and include async results as they resolve.

