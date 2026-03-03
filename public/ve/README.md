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
