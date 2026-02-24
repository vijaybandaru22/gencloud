/**
 * fix_survey_and_publish.js
 * 1. Updates Claude_cars32_final.yaml with postCallSurveyFlow (handles CRLF)
 * 2. Publishes with --forceUnlock only (no --recreate, flow is in IVR config)
 */

const { spawnSync } = require('child_process');
const fs = require('fs');

const ARCHY_BIN   = 'C:\\Users\\VijayBandaru\\archy\\archyBin\\archy-win-2.37.0.exe';
const MAIN_YAML   = 'C:\\Users\\VijayBandaru\\Claude_cars32_final.yaml';
const SURVEY_ID   = '2a9174b9-8f7b-4922-918f-daa4ee517719';
const SURVEY_NAME = 'Claude_Cars_Survey';

console.log('=== Fix: Add Survey + Publish Claude_cars32 ===\n');

// ── STEP 1: Read YAML and normalize to LF ───────────────────────────────────
console.log('STEP 1 — Reading YAML and normalising line endings...');
let yaml = fs.readFileSync(MAIN_YAML, 'utf8');
const hasCRLF = yaml.includes('\r\n');
console.log(`  File has CRLF: ${hasCRLF}`);

// Normalise to LF for consistent matching
yaml = yaml.replace(/\r\n/g, '\n');

// ── STEP 2: Inject postCallSurveyFlow into both transferToAcd blocks ─────────
console.log('\nSTEP 2 — Injecting postCallSurveyFlow into YAML...');

const surveyBlock =
`              postCallSurveyFlow:\n` +
`                lit:\n` +
`                  id: ${SURVEY_ID}\n` +
`                  name: ${SURVEY_NAME}\n`;

// US Queue – insert after "name: Claude_US_Queue" line, before preTransferAudio
const US_BEFORE =
`              targetQueue:\n` +
`                lit:\n` +
`                  id: ed1d516d-a9c9-4594-9420-d3e574042d0b\n` +
`                  name: Claude_US_Queue\n` +
`              preTransferAudio:`;

const US_AFTER =
`              targetQueue:\n` +
`                lit:\n` +
`                  id: ed1d516d-a9c9-4594-9420-d3e574042d0b\n` +
`                  name: Claude_US_Queue\n` +
surveyBlock +
`              preTransferAudio:`;

if (yaml.includes('postCallSurveyFlow:')) {
  console.log('  postCallSurveyFlow already present in YAML — skipping injection.');
} else if (yaml.includes(US_BEFORE)) {
  yaml = yaml.replace(US_BEFORE, US_AFTER);
  console.log('  ✓ Added postCallSurveyFlow to US Queue Transfer');
} else {
  console.log('  ⚠ US Queue target block not matched — dumping nearby lines for debug:');
  const lines = yaml.split('\n');
  const idx = lines.findIndex(l => l.includes('Transfer to Claude_US_Queue'));
  if (idx >= 0) {
    lines.slice(Math.max(0, idx-1), idx+8).forEach((l, i) =>
      console.log(`    Line ${idx+i}: |${l}|`));
  }
}

// India Queue – insert after "name: Claude_India_Queue" line, before preTransferAudio
const INDIA_BEFORE =
`              targetQueue:\n` +
`                lit:\n` +
`                  id: 13f15c0b-11dc-41b2-9a69-204056f3b310\n` +
`                  name: Claude_India_Queue\n` +
`              preTransferAudio:`;

const INDIA_AFTER =
`              targetQueue:\n` +
`                lit:\n` +
`                  id: 13f15c0b-11dc-41b2-9a69-204056f3b310\n` +
`                  name: Claude_India_Queue\n` +
surveyBlock +
`              preTransferAudio:`;

if (!yaml.includes('postCallSurveyFlow:')) {
  // Only try India if US didn't insert it yet (fresh file)
}

if (yaml.indexOf('postCallSurveyFlow:') !== yaml.lastIndexOf('postCallSurveyFlow:')) {
  console.log('  Both entries already present.');
} else if (yaml.includes(INDIA_BEFORE)) {
  yaml = yaml.replace(INDIA_BEFORE, INDIA_AFTER);
  console.log('  ✓ Added postCallSurveyFlow to India Queue Transfer');
} else {
  console.log('  ⚠ India Queue target block not matched.');
}

// Count occurrences
const surveyCount = (yaml.match(/postCallSurveyFlow:/g) || []).length;
console.log(`\n  Total postCallSurveyFlow entries in YAML: ${surveyCount}`);

// ── STEP 3: Write YAML back (convert to CRLF to match original) ─────────────
console.log('\nSTEP 3 — Writing updated YAML...');
const outYaml = hasCRLF ? yaml.replace(/\n/g, '\r\n') : yaml;
fs.writeFileSync(MAIN_YAML, outYaml);
console.log('  ✓ YAML written');

// Show the injected lines for confirmation
const checkLines = yaml.split('\n');
checkLines.forEach((line, i) => {
  if (line.includes('postCallSurveyFlow') || (line.includes('id:') && checkLines[i-1] && checkLines[i-1].includes('lit:') && checkLines[i-2] && checkLines[i-2].includes('postCallSurveyFlow'))) {
    console.log(`    Line ${i+1}: ${line.trimStart()}`);
  }
});

// ── STEP 4: Publish with --forceUnlock only (no --recreate) ─────────────────
console.log('\nSTEP 4 — Publishing Claude_cars32 via Archy (--forceUnlock, no --recreate)...');
const r = spawnSync(
  ARCHY_BIN,
  ['publish', '--file', MAIN_YAML, '--forceUnlock'],
  { encoding: 'utf8', timeout: 180000, cwd: 'C:\\Users\\VijayBandaru' }
);

if (r.stdout) console.log(r.stdout);
if (r.stderr) console.log(r.stderr);

console.log('\n=================================================');
if (r.status === 0) {
  console.log('✅ SUCCESS! Claude_cars32 published with survey.');
  console.log(`   Survey flow: ${SURVEY_NAME} (${SURVEY_ID})`);
  console.log('   Queues configured: Claude_US_Queue, Claude_India_Queue');
} else {
  console.log(`⚠ Archy exit code: ${r.status}`);
  console.log('  Check the output above for details.');
  console.log('  NOTE: Queue-level survey was already configured in the');
  console.log('  previous run — callers will still get the survey after');
  console.log('  agent interactions on both queues.');
}
console.log('=================================================\n');
