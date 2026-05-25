#!/usr/bin/env node
/**
 * tests/lint-tests.js
 *
 * Static lint for the Playwright test suite. Forbids the patterns that the
 * refactor plan (TESTS.md) declares anti-patterns:
 *
 *  - `waitForTimeout(` outside tests/utils/wait.js
 *  - silent swallow `.catch(() => {})` / `.catch(() => false)` etc. outside utils/
 *  - hardcoded localhost ports (`http://localhost:5173`, `:5174` etc.) — must use BASE_URL
 *  - headless violations (`headless: false`, `--headed`, `PWDEBUG`, `devtools: true`, `slowMo`)
 *  - `test.skip(true,` / `test.skip('...'` without an issue URL in the reason
 *
 * Modes:
 *   --mode=warn   (default) print findings, exit 0
 *   --mode=error  print findings, exit 1 if any
 *
 * Scope (paths under tests/):
 *   By default: every *.spec.js and every utils/* file (some rules don't apply
 *   to utils — see RULES below).
 *
 * Usage:
 *   node tests/lint-tests.js              # warn (CI-safe during migration)
 *   node tests/lint-tests.js --mode=error # enforce (CI gate after Phase 5)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TESTS_DIR = __dirname;
const REPO_ROOT = path.resolve(TESTS_DIR, '..');

const args = process.argv.slice(2);
const MODE = (args.find((a) => a.startsWith('--mode=')) || '--mode=warn').slice(7);

/* ── Allowlists ─────────────────────────────────────────────────────────── */

// Phase 11: skip allowlist removed — ALL test.skip / test.fixme are now banned.

/* ── Rules ──────────────────────────────────────────────────────────────── */

/** A rule is checked per source line. `applies(file)` filters where it runs. */
const RULES = [
  {
    id: 'no-waitForTimeout',
    reason: 'Use a real signal (waitForFunction/waitForSelector/waitForResponse). '
          + 'Sleeps only allowed inside utils/wait.js with a justification comment.',
    pattern: /\bwaitForTimeout\s*\(/,
    applies: (file) => !file.includes('/utils/wait.js'),
  },
  {
    id: 'no-silent-catch',
    reason: 'Silent `.catch(() => …)` swallows failures. Use explicit checks '
          + '(isVisible/isAttached) or assert preconditions with expect().',
    pattern: /\.catch\(\s*\(\s*\)\s*=>\s*(?:\{\s*\}|false|true|null|undefined|0)\s*\)/,
    applies: (file) =>
      !file.includes('/utils/') &&
      !file.endsWith('/tests/utils.js') && // legacy shim — deleted at end of Phase 4
      !file.endsWith('/lint-tests.js') &&
      !file.endsWith('/_coverage.js'),
  },
  {
    id: 'no-hardcoded-localhost',
    reason: 'Use BASE_URL from utils/env.js — never hardcode a port.',
    pattern: /['"`]https?:\/\/localhost:\d+/,
    applies: (file) =>
      !file.endsWith('/utils/env.js') &&
      !file.endsWith('/lint-tests.js'),
  },
  {
    id: 'no-headless-false',
    reason: 'Headless is mandatory (CLAUDE.md). Never set headless:false.',
    pattern: /headless\s*:\s*false/,
    applies: () => true,
  },
  {
    id: 'no-headed-flag',
    reason: 'Never invoke Playwright with --headed.',
    pattern: /--headed\b/,
    applies: (file) => !file.endsWith('/lint-tests.js'),
  },
  {
    id: 'no-pwdebug',
    reason: 'PWDEBUG / PWHEADED open an inspector window. Use traces instead.',
    pattern: /\b(?:PWDEBUG|PWHEADED)\s*=/,
    applies: (file) => !file.endsWith('/lint-tests.js') && !file.endsWith('/utils/env.js'),
  },
  {
    id: 'no-devtools-true',
    reason: 'devtools:true forces headed mode.',
    pattern: /devtools\s*:\s*true/,
    applies: () => true,
  },
  {
    id: 'no-slowmo',
    reason: 'slowMo is a debugging knob; tests must run at full speed headless.',
    pattern: /\bslowMo\s*:/,
    applies: () => true,
  },
  {
    id: 'no-test-skip',
    reason: 'Phase 11: test.skip and test.fixme are banned. Convert preconditions '
          + 'into explicit assertions (expect/throw) so failures surface loudly.',
    pattern: /\btest\.(?:skip|fixme)\s*\(/,
    applies: (file) => file.endsWith('.spec.js'),
  },
  {
    id: 'no-todo-comment',
    reason: 'Phase 11: TODO comments in tests must be tracked as issues, not comments. '
          + 'Reword to "Future:" or open an issue and link it.',
    pattern: /\bTODO\b/,
    applies: (file) =>
      (file.endsWith('.spec.js') || file.includes('/utils/')) &&
      !file.endsWith('/lint-tests.js'),
  },
];

/* ── Walker ─────────────────────────────────────────────────────────────── */

/** Recursively list all .js files under dir, skipping node_modules / .auth /
 *  _scratch. `_scratch/` holds capture+debug specs that are testIgnore'd in
 *  every Playwright project; they're tracked technical debt, not part of the
 *  suite's lint surface. */
function listJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.auth' || entry.name === '_scratch' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsFiles(full));
    else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) out.push(full);
  }
  return out;
}

function stripLineComments(line) {
  // crude — but enough to skip "// no-waitForTimeout: legacy" style suppressions
  const idx = line.indexOf('//');
  return idx === -1 ? line : line.slice(0, idx);
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const findings = []; // { file, line, rule, snippet }

for (const file of listJsFiles(TESTS_DIR)) {
  const rel = path.relative(path.resolve(TESTS_DIR, '..'), file);
  // The lint file itself contains every banned pattern as a string literal.
  if (file === __filename) continue;
  const source = fs.readFileSync(file, 'utf-8');
  const lines = source.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const code = stripLineComments(raw);

    for (const rule of RULES) {
      if (!rule.applies(file)) continue;
      const m = code.match(rule.pattern);
      if (!m) continue;
      if (rule.customValidate && !rule.customValidate(m)) continue;
      findings.push({
        file: rel,
        line: i + 1,
        rule: rule.id,
        reason: rule.reason,
        snippet: raw.trim().slice(0, 160),
      });
    }
  }
}

/* ── Report ─────────────────────────────────────────────────────────────── */

const byRule = new Map();
for (const f of findings) {
  if (!byRule.has(f.rule)) byRule.set(f.rule, []);
  byRule.get(f.rule).push(f);
}

const total = findings.length;
const header = MODE === 'error' ? '\x1b[31mlint-tests\x1b[0m' : '\x1b[33mlint-tests\x1b[0m';
console.log(`${header}: ${total} finding(s) across ${byRule.size} rule(s) [mode=${MODE}]\n`);

for (const [ruleId, items] of [...byRule.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const rule = RULES.find((r) => r.id === ruleId);
  console.log(`\x1b[1m${ruleId}\x1b[0m  (${items.length} occurrence${items.length === 1 ? '' : 's'})`);
  console.log(`  ${rule.reason}`);
  // Group by file for readability
  const byFile = new Map();
  for (const it of items) {
    if (!byFile.has(it.file)) byFile.set(it.file, []);
    byFile.get(it.file).push(it);
  }
  for (const [file, fileItems] of byFile) {
    console.log(`  ${file}`);
    for (const it of fileItems.slice(0, 10)) {
      console.log(`    L${it.line.toString().padStart(4, ' ')}  ${it.snippet}`);
    }
    if (fileItems.length > 10) {
      console.log(`    … (${fileItems.length - 10} more in this file)`);
    }
  }
  console.log('');
}

if (MODE === 'error' && total > 0) {
  console.log(`\x1b[31mFAIL\x1b[0m  ${total} lint finding(s) — see above.`);
  process.exit(1);
} else if (total > 0) {
  console.log(`\x1b[33mWARN\x1b[0m  ${total} lint finding(s). Run with --mode=error to gate CI.`);
} else {
  console.log(`\x1b[32mOK\x1b[0m  no lint findings.`);
}
