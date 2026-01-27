# Sentence Case Rule

**CRITICAL: All headings, titles, and prototype names MUST use sentence case. No exceptions.**

## What is Sentence Case?

Sentence case means:
- **First letter of the first word is capitalized**
- **All other words are lowercase** (unless they are proper nouns, acronyms, or brand names)

## Examples

✅ **Correct:**
- "Page feed"
- "Search titles"
- "Page metadata"
- "On this day"
- "Hello world"
- "Utility methods"
- "Common tokens"

❌ **Incorrect:**
- "Page Feed" (Title Case)
- "Search Titles" (Title Case)
- "Page Metadata" (Title Case)
- "On This Day" (Title Case)
- "Hello World" (Title Case)
- "Utility Methods" (Title Case)
- "Common Tokens" (Title Case)

## Special Cases

- **Acronyms stay uppercase**: "API", "HTML", "REST", "CSS"
  - ✅ "Page HTML"
  - ✅ "API types"
  - ✅ "REST API"
  
- **Proper nouns and brand names stay capitalized**: "MediaWiki", "Wikipedia", "Codex"
  - ✅ "MediaWiki REST API"
  - ✅ "Codex design system reference"

- **Single words**: Can be capitalized if they're headings (e.g., "Stack", "Usage", "Files")

## Where This Applies

1. **Prototype names** in `src/prototypes/prototypes.ts`
2. **Category names** in `src/prototypes/prototypes.ts`
3. **All markdown headings** (h1, h2, h3, etc.) in `.md` files
4. **UI titles and headings** displayed to users
5. **Any text that appears as a heading or title in the application**

## Enforcement

- **Always** use sentence case when creating or editing:
  - Prototype definitions
  - Markdown documentation
  - UI headings and titles
  - Category names and descriptions

- **Never** use Title Case (capitalizing every major word) unless it's a proper noun or acronym.

## AI Agent Instructions

When working on this codebase:
1. Check all headings and titles for sentence case compliance
2. Fix any Title Case headings to sentence case
3. Preserve acronyms and proper nouns as uppercase
4. Apply this rule consistently across all files
