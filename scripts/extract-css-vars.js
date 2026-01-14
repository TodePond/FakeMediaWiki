import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read CSS files
const variablesCss = fs.readFileSync(path.join(__dirname, '../reference/color-tokens.css'), 'utf8');
const mainCss = fs.readFileSync(path.join(__dirname, '../reference/colors.css'), 'utf8');

// Combine and extract CSS variables
const combinedCss = variablesCss + mainCss;
const varMatches = combinedCss.matchAll(/--([\w-]+):/g);
const variables = Array.from(varMatches, (match) => match[1]);

// Remove duplicates
const uniqueVars = [...new Set(variables)];

// Create CSS custom data structure
const customData = {
  version: 1.1,
  properties: uniqueVars.map((name) => ({
    name: `--${name}`,
    description: `CSS variable: --${name}`,
  })),
};

// Write to .vscode directory
const outputPath = path.join(__dirname, '../.vscode/css.customData.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(customData, null, 2));

console.log(`Extracted ${uniqueVars.length} unique CSS variables`);
console.log(`Written to ${outputPath}`);
