# VisualEditor vendored assets

This directory is served at `/ve/` and must contain the built VisualEditor assets so the Visual Editor and Visual Diff components work.

## Refresh procedure (no local VE repo required)

**Option A – npm script (recommended)**

From the FakeMediaWiki repo root:

```bash
npm run update-ve
```

This clones VisualEditor into a temp directory, builds it, copies `dist/`, `lib/`, and `i18n/` into `public/ve/`, then removes the temp clone.

To use an existing VisualEditor clone instead of cloning:

```bash
npm run update-ve -- /path/to/VisualEditor
```

**Option B – manual steps**

1. Clone the VisualEditor repo somewhere (e.g. a temp directory):
   ```bash
   git clone https://github.com/wikimedia/VisualEditor.git /tmp/VisualEditor
   cd /tmp/VisualEditor
   ```

2. Install dependencies and build:
   ```bash
   npm install
   npx grunt build
   ```

3. From the **FakeMediaWiki** repo root, copy the built output into this directory:
   ```bash
   # Clear existing (if any) and copy
   rm -rf public/ve/dist public/ve/lib public/ve/i18n
   cp -R /tmp/VisualEditor/dist public/ve/
   cp -R /tmp/VisualEditor/lib public/ve/
   cp -R /tmp/VisualEditor/i18n public/ve/
   ```

4. Commit the updated `public/ve/` contents.

After this, the app will load `/ve/dist/visualEditor.js`, `/ve/lib/...`, etc. from this tree. No dependency on a local VisualEditor clone.

## Template diff sidebar ("Template parameters changed")

The right-hand sidebar that lists template parameter changes (instead of showing full old/new template blocks) is implemented by the **MediaWiki VisualEditor extension**, not by core VisualEditor. The extension registers a handler with `ve.ui.metaListDiffRegistry` and provides node types that put templates in the document's meta list.

The build from the VisualEditor repo (steps above) is core-only, so template changes appear as full blocks. To get the sidebar behavior you would need a bundle that includes the MediaWiki extension (e.g. building from a MediaWiki installation's `extensions/VisualEditor` and its dependencies, or a custom combined build). The core diff component supports it; the missing piece is the extension code that registers the handler and populates the meta list for templates.
