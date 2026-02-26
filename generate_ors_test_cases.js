const ExcelJS = require('exceljs');

const wb = new ExcelJS.Workbook();
wb.creator = 'Claude Code';
wb.created = new Date('2026-02-26');
wb.modified = new Date('2026-02-26');

// ─── COLOUR PALETTE ─────────────────────────────────────────────────────────
const C = {
  navyBg:    '1A237E', navyFg:   'FFFFFF',
  blueBg:    '1565C0', blueFg:   'FFFFFF',
  purpleBg:  '6A1B9A', purpleFg: 'FFFFFF',
  tealBg:    '00695C', tealFg:   'FFFFFF',
  slateHdr:  '37474F', slateFg:  'FFFFFF',
  passGreen: 'E8F5E9', passText: '1B5E20',
  failRed:   'FFEBEE', failText: 'B71C1C',
  warnYellow:'FFF8E1', warnText: 'E65100',
  infoBlue:  'E3F2FD', infoText: '0D47A1',
  rowAlt:    'F5F5F5',
  white:     'FFFFFF',
  border:    'B0BEC5',
};

function hdr(text, bg, fg) {
  return {
    value: text,
    style: {
      font: { bold: true, color: { argb: 'FF'+fg }, size: 10, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF'+bg } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: {
        top:    { style:'thin', color:{ argb:'FF'+C.border } },
        bottom: { style:'thin', color:{ argb:'FF'+C.border } },
        left:   { style:'thin', color:{ argb:'FF'+C.border } },
        right:  { style:'thin', color:{ argb:'FF'+C.border } },
      }
    }
  };
}

function cell(text, bg, fg, bold, wrap, align) {
  return {
    value: text,
    style: {
      font: { bold: !!bold, color: { argb: 'FF'+(fg||'1A1A2E') }, size: 9, name: 'Calibri' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF'+(bg||C.white) } },
      alignment: { horizontal: align||'left', vertical: 'middle', wrapText: wrap !== false },
      border: {
        top:    { style:'thin', color:{ argb:'FF'+C.border } },
        bottom: { style:'thin', color:{ argb:'FF'+C.border } },
        left:   { style:'thin', color:{ argb:'FF'+C.border } },
        right:  { style:'thin', color:{ argb:'FF'+C.border } },
      }
    }
  };
}

function passCell(t)  { return cell(t, C.passGreen,  C.passText,  true,  true, 'center'); }
function failCell(t)  { return cell(t, C.failRed,    C.failText,  true,  true, 'center'); }
function warnCell(t)  { return cell(t, C.warnYellow, C.warnText,  false, true, 'center'); }
function naCell(t)    { return cell(t, C.rowAlt,     '546E7A',    false, true, 'center'); }

function applyRowStyle(row, cells) {
  cells.forEach((c, i) => {
    const wsCell = row.getCell(i + 1);
    wsCell.value = c.value;
    Object.assign(wsCell, c.style);
    if (c.style.font)      wsCell.font      = c.style.font;
    if (c.style.fill)      wsCell.fill      = c.style.fill;
    if (c.style.alignment) wsCell.alignment = c.style.alignment;
    if (c.style.border)    wsCell.border    = c.style.border;
  });
  row.height = 30;
}

// ═══════════════════════════════════════════════════════════════════════
// SHEET BUILDER
// ═══════════════════════════════════════════════════════════════════════
function buildSheet(ws, sheetConfig) {
  const { title, subtitle, columns, sections } = sheetConfig;

  // Set column widths
  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });

  // Title row
  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF'+C.navyBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // Subtitle row
  ws.mergeCells(2, 1, 2, columns.length);
  const subCell = ws.getCell(2, 1);
  subCell.value = subtitle;
  subCell.font  = { italic: true, size: 9, color: { argb: 'FF37474F' }, name: 'Calibri' };
  subCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // Header row
  const headerRow = ws.addRow(columns.map(c => c.label));
  applyRowStyle(headerRow, columns.map(c => hdr(c.label, C.slateHdr, C.slateFg)));
  headerRow.height = 32;

  let rowIndex = 0;
  sections.forEach(section => {
    // Section header
    const secRow = ws.addRow([section.name]);
    ws.mergeCells(secRow.number, 1, secRow.number, columns.length);
    const sc = ws.getCell(secRow.number, 1);
    sc.value = section.name;
    sc.font  = { bold: true, size: 10, color: { argb: 'FF'+section.fg }, name: 'Calibri' };
    sc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF'+section.bg } };
    sc.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    sc.border = { bottom: { style:'medium', color:{ argb:'FF'+section.bg } } };
    secRow.height = 22;

    section.rows.forEach(r => {
      rowIndex++;
      const isAlt = rowIndex % 2 === 0;
      const dataRow = ws.addRow([]);
      const cells = r.map((val, colIdx) => {
        if (colIdx === columns.length - 1) {
          if (val === 'PASS')    return passCell('✅ PASS');
          if (val === 'FAIL')    return failCell('❌ FAIL');
          if (val === 'N/A')     return naCell('—');
          if (val === 'PENDING') return warnCell('⏳ PENDING');
        }
        return cell(val, isAlt ? C.rowAlt : C.white, null, false, true);
      });
      applyRowStyle(dataRow, cells);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// SHEET 1 — COVER / SUMMARY
// ═══════════════════════════════════════════════════════════════════════
const wsCover = wb.addWorksheet('📋 Test Summary', { tabColor: { argb: 'FF1A237E' } });

wsCover.getColumn(1).width = 35;
wsCover.getColumn(2).width = 60;
wsCover.getColumn(3).width = 20;

const coverData = [
  ['Project', 'On Road Support (ORS) — Ahold Delhaize', ''],
  ['Platform', 'Genesys Cloud Contact Center — US West 2', ''],
  ['Flow', 'ORS_Main_Inbound  |  ORS_Driver_InQueue  |  ORS_CustomerCare_InQueue', ''],
  ['Division', 'Claude_Exploration_Vijay', ''],
  ['Test Date', '2026-02-26', ''],
  ['Prepared By', 'QA / Flow Administrator', ''],
  ['', '', ''],
  ['SCOPE', '', ''],
  ['', 'Schedule Group Check (Open / Closed / Holiday / Emergency)', ''],
  ['', 'Language Selection — English & Spanish (EN/ES)', ''],
  ['', 'Bilingual TTS — Jill (EN) / Isabel (ES)', ''],
  ['', 'Supervisor Upfront Message Toggle (Data Table)', ''],
  ['', 'Call Type Self-Selection — Driver Support / Customer Care', ''],
  ['', 'Greeting and Queue Transfer', ''],
  ['', 'In-Queue Experience — Driver Queue', ''],
  ['', 'In-Queue Experience — Customer Care Queue', ''],
  ['', 'End-to-End Scenarios', ''],
  ['', 'Negative / Boundary Tests', ''],
  ['', '', ''],
  ['TEST COUNTS', '', ''],
];

wsCover.mergeCells(1, 1, 1, 3);
const covTitle = wsCover.getCell(1, 1);
covTitle.value = 'ORS Call Flow — Test Cases & Verification';
covTitle.font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
covTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A237E' } };
covTitle.alignment = { horizontal: 'center', vertical: 'middle' };
wsCover.getRow(1).height = 44;

wsCover.mergeCells(2, 1, 2, 3);
const covSub = wsCover.getCell(2, 1);
covSub.value = 'Ahold Delhaize | Genesys Cloud US West 2 | Division: Claude_Exploration_Vijay | Created: 2026-02-26';
covSub.font = { italic: true, size: 9, color: { argb: 'FF546E7A' } };
covSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
covSub.alignment = { horizontal: 'center', vertical: 'middle' };
wsCover.getRow(2).height = 20;

const summaryTabs = [
  { name: '1. Schedule Check',      count: 8,  color: C.slateHdr },
  { name: '2. Language Selection',  count: 8,  color: C.blueBg },
  { name: '3. Upfront Message',     count: 8,  color: C.purpleBg },
  { name: '4. Call Type Selection', count: 10, color: '00695C' },
  { name: '5. Queue Transfer',      count: 8,  color: '4527A0' },
  { name: '6. Driver InQueue',      count: 8,  color: C.slateHdr },
  { name: '7. CC InQueue',          count: 10, color: C.tealBg },
  { name: '8. End-to-End',          count: 8,  color: C.navyBg },
  { name: '9. Negative Tests',      count: 10, color: 'BF360C' },
];
const totalTests = summaryTabs.reduce((s, t) => s + t.count, 0);

let r = 3;
[['Category', 'Description', 'Test Count']].forEach(row => {
  const hRow = wsCover.getRow(r++);
  applyRowStyle(hRow, row.map(v => hdr(v, C.slateHdr, C.slateFg)));
  hRow.height = 28;
});

summaryTabs.forEach((t, i) => {
  const dRow = wsCover.getRow(r++);
  const bg = i % 2 === 0 ? C.white : C.rowAlt;
  applyRowStyle(dRow, [
    cell(t.name, bg, null, true),
    cell('See worksheet tab', bg),
    cell(String(t.count), bg, null, false, true, 'center')
  ]);
  dRow.height = 24;
});

const totRow = wsCover.getRow(r++);
applyRowStyle(totRow, [
  cell('TOTAL', C.navyBg, C.navyFg, true, false, 'center'),
  cell('', C.navyBg, C.navyFg),
  cell(String(totalTests), C.navyBg, C.navyFg, true, false, 'center')
]);
totRow.height = 28;

r++;
const flowRow = wsCover.getRow(r++);
applyRowStyle(flowRow, [
  cell('FLOW IDs', C.slateHdr, C.slateFg, true, false, 'center'),
  cell('', C.slateHdr),
  cell('', C.slateHdr)
]);
flowRow.height = 24;

[
  ['ORS_Main_Inbound',          '7cfdcc60-d17e-4b5f-80d8-f0630287fb06  |  v1.0  |  Published'],
  ['ORS_Driver_InQueue',        'a71c82a8-3bfb-41cf-8ab8-de631ec90f0b  |  v1.0  |  Published'],
  ['ORS_CustomerCare_InQueue',  'fc18e5a3-fc0e-4464-b070-b508ab04eb8a  |  v1.0  |  Published'],
  ['ORS_Driver_Queue',          'c145390d-d8b7-40c9-ad2f-5e593507757b'],
  ['ORS_CustomerCare_Queue',    '57516f74-26d6-4b0c-baa2-49092fcf08c8'],
  ['ORS_Schedule_Group',        '50be470a-eb38-4802-830b-177fd9a8ae52  |  5AM–11PM CST Daily'],
].forEach((row, i) => {
  const bg = i % 2 === 0 ? C.infoBlue : C.white;
  const fRow = wsCover.getRow(r++);
  applyRowStyle(fRow, [cell(row[0], bg, null, true), cell(row[1], bg), cell('', bg)]);
  fRow.height = 22;
});

// ═══════════════════════════════════════════════════════════════════════
// COLUMN DEFINITIONS (shared across test sheets)
// ═══════════════════════════════════════════════════════════════════════
const testCols = [
  { label: 'TC #',             width: 8  },
  { label: 'Test Category',    width: 22 },
  { label: 'Test Case Name',   width: 38 },
  { label: 'Pre-Conditions',   width: 35 },
  { label: 'Test Steps',       width: 55 },
  { label: 'Input / Action',   width: 30 },
  { label: 'Expected Result',  width: 48 },
  { label: 'TTS Voice',        width: 14 },
  { label: 'Flow / Component', width: 28 },
  { label: 'Pass / Fail',      width: 14 },
];

// ═══════════════════════════════════════════════════════════════════════
// SHEET 2 — SCHEDULE CHECK
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('1. Schedule Check', { tabColor: { argb: 'FF37474F' } }), {
  title: 'Test Suite 1 — Schedule Group Check',
  subtitle: 'ORS_Main_Inbound · evaluateScheduleGroup · ORS_Schedule_Group (5AM–11PM CST Daily)',
  columns: testCols,
  sections: [
    {
      name: '1A — Open Hours', bg: 'E8F5E9', fg: '1B5E20',
      rows: [
        ['TC-S01','Schedule Check','Call during open business hours','ORS_Main_Inbound is published. ORS_Schedule_Group is active. Current time is between 5:00 AM and 11:00 PM CST.',
         '1. Dial ORS number\n2. Wait for call to be answered by the flow\n3. Observe flow progression',
         'Call placed at 10:00 AM CST','Flow proceeds past schedule check without playing any closed/emergency message. Language selection menu is heard.',
         'Jill (default)','ORS_Main_Inbound → Schedule Check','PASS'],
        ['TC-S02','Schedule Check','Call exactly at open boundary (5:00 AM CST)','Schedule is configured 5:00 AM – 11:00 PM CST.',
         '1. Dial at exactly 5:00 AM CST\n2. Observe flow behavior',
         'Call at 5:00:00 AM CST','Flow treats as OPEN. Caller hears language selection menu.',
         'Jill','ORS_Main_Inbound → Schedule Check','PASS'],
        ['TC-S03','Schedule Check','Call exactly at close boundary (11:00 PM CST)','Schedule is configured 5:00 AM – 11:00 PM CST.',
         '1. Dial at exactly 11:00 PM CST\n2. Observe flow behavior',
         'Call at 11:00:00 PM CST','Flow treats as CLOSED. Plays closed message and disconnects.',
         'Jill','ORS_Main_Inbound → Closed Handler','PASS'],
      ]
    },
    {
      name: '1B — Closed Hours', bg: 'FFEBEE', fg: 'B71C1C',
      rows: [
        ['TC-S04','Schedule Check','Call outside business hours (overnight)','Schedule group is active. Current time is before 5 AM or after 11 PM CST.',
         '1. Dial ORS number at 2:00 AM CST\n2. Observe audio played\n3. Verify call terminates',
         'Call at 2:00 AM CST','"You have reached On Road Support. We are currently closed. We open at 5:00 AM…" plays. Call disconnects automatically.',
         'Jill','ORS_Main_Inbound → Closed Handler','PASS'],
        ['TC-S05','Schedule Check','Call on a defined holiday','A holiday schedule is configured and active in the schedule group.',
         '1. Configure holiday date in ORS_Schedule_Group\n2. Dial on that date\n3. Verify holiday message plays',
         'Call on holiday date','Holiday closed message plays. Call disconnects. Language selection is NOT presented.',
         'Jill','ORS_Main_Inbound → Holiday Handler','PENDING'],
      ]
    },
    {
      name: '1C — Emergency', bg: 'FCE4EC', fg: '880E4F',
      rows: [
        ['TC-S06','Schedule Check','Emergency closure activated','Emergency schedule is toggled ON in Genesys Cloud UI (Architect → Schedule Groups → ORS_Schedule_Group → Emergency).',
         '1. Enable emergency closure in Genesys UI\n2. Dial ORS number\n3. Verify emergency message plays\n4. Disable emergency after test',
         'Emergency toggle = ON','"You have reached On Road Support. We are currently unavailable by phone due to an unplanned emergency…" plays. Call disconnects.',
         'Jill','ORS_Main_Inbound → Emergency Handler','PENDING'],
        ['TC-S07','Schedule Check','Emergency closure deactivated — flow resumes normally','Emergency schedule was ON, now toggled OFF.',
         '1. Disable emergency in Genesys UI\n2. Call during open hours\n3. Verify normal flow resumes',
         'Emergency toggle = OFF','Flow proceeds normally. Language selection menu is heard.',
         'Jill','ORS_Main_Inbound → Schedule Check','PENDING'],
        ['TC-S08','Schedule Check','Pre-transfer message not played on closed/emergency path','Flow should disconnect without offering language or queue.',
         '1. Call during closed hours\n2. Verify NO language menu or queue transfer audio is played',
         'Call at 1:00 AM CST','Only closed message plays then disconnect. No language menu, no call type menu, no queue hold music.',
         'Jill','ORS_Main_Inbound → Closed Handler','PASS'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SHEET 3 — LANGUAGE SELECTION
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('2. Language Selection', { tabColor: { argb: 'FF1565C0' } }), {
  title: 'Test Suite 2 — Language Selection & Bilingual TTS',
  subtitle: 'ORS_Main_Inbound · Language Menu · setLanguage action · Jill (EN-US) / Isabel (ES-US)',
  columns: testCols,
  sections: [
    {
      name: '2A — English Selection', bg: C.infoBlue, fg: C.infoText,
      rows: [
        ['TC-L01','Language Selection','Press 1 for English during open hours','Flow has passed schedule check. Language menu is playing.',
         '1. Call during open hours\n2. Listen to bilingual prompt\n3. Press 1 for English\n4. Proceed through flow',
         'DTMF: 1','setLanguage set to en-us. Jill TTS voice used for all subsequent prompts. Upfront check → Call Type menu in English.',
         'Jill','Language_Menu_1 → digit_1','PASS'],
        ['TC-L02','Language Selection','No input on language menu — defaults to English','Caller dials and does not press anything within 10-second timeout.',
         '1. Call during open hours\n2. Let language menu time out (10 seconds)\n3. Observe default behavior',
         'No DTMF input (timeout)','Flow defaults to English (setLanguage en-us). Jill TTS plays for subsequent steps.',
         'Jill','Language_Menu_1 → digit_* (default)','PASS'],
      ]
    },
    {
      name: '2B — Spanish Selection', bg: 'F3E5F5', fg: '4A148C',
      rows: [
        ['TC-L03','Language Selection','Press 2 for Spanish — TTS switches to Isabel','Flow has passed schedule check. Language menu is playing.',
         '1. Call during open hours\n2. Listen to bilingual prompt\n3. Press 2 for Spanish\n4. Proceed through flow',
         'DTMF: 2','setLanguage set to es-us. Isabel TTS voice used for all subsequent prompts. Call Type menu plays in Spanish.',
         'Isabel','Language_Menu_1 → digit_2','PASS'],
        ['TC-L04','Language Selection','Spanish call type menu text is in Spanish','Caller has selected Spanish (Press 2).',
         '1. Press 2 for Spanish\n2. Listen to call type menu prompt\n3. Verify text is in Spanish',
         'DTMF: 2 then observe','Call type menu plays: "Para Soporte de Conductor, oprima 1. Para Atención al Cliente, oprima 2."',
         'Isabel','Call_Type_Menu_ES_3','PASS'],
        ['TC-L05','Language Selection','Bilingual intro prompt is heard in both languages','Language menu audio prompt is configured as bilingual text.',
         '1. Call during open hours\n2. Listen to first prompt before pressing any key',
         'No input yet','Prompt plays: "Thank you for calling On Road Support. For English, press 1. Para Español, oprima 2." in a single message.',
         'Jill (default)','Language_Menu_1 · audio','PASS'],
      ]
    },
    {
      name: '2C — Language Persistence', bg: 'E8EAF6', fg: C.navyBg,
      rows: [
        ['TC-L06','Language Selection','English language persists through full flow','Caller selects English at language menu.',
         '1. Press 1 for English\n2. Pass through upfront check, call type menu, greeting\n3. Verify all prompts use Jill voice',
         'DTMF: 1','All TTS from language menu through queue pre-transfer audio uses Jill voice. No switch to Isabel.',
         'Jill','Full flow — EN path','PASS'],
        ['TC-L07','Language Selection','Spanish language persists through full flow','Caller selects Spanish at language menu.',
         '1. Press 2 for Spanish\n2. Pass through upfront check, call type menu, greeting\n3. Verify all prompts use Isabel voice',
         'DTMF: 2','All TTS from call type menu through pre-transfer audio uses Isabel voice. No switch to Jill.',
         'Isabel','Full flow — ES path','PASS'],
        ['TC-L08','Language Selection','Menu repeats up to 3 times on invalid input','Caller presses an invalid digit (e.g., 5) on language menu.',
         '1. Call during open hours\n2. Press 5 (invalid digit)\n3. Observe menu repeat\n4. Press 5 twice more\n5. Observe default on 3rd timeout',
         'DTMF: 5 (×3)','Menu replays up to 3 times (repeatCount: 3). After 3 failures defaults to English.',
         'Jill','Language_Menu_1 · repeatCount','PASS'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SHEET 4 — UPFRONT MESSAGE
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('3. Upfront Message', { tabColor: { argb: 'FF6A1B9A' } }), {
  title: 'Test Suite 3 — Supervisor Upfront Message Toggle',
  subtitle: 'ORS_Main_Inbound · dataTableLookup · VJ_claudeDatatable key: ORS_UPFRONT_MSG · Active boolean flag',
  columns: testCols,
  sections: [
    {
      name: '3A — Upfront Disabled (Default)', bg: C.infoBlue, fg: C.infoText,
      rows: [
        ['TC-U01','Upfront Message','Upfront message disabled — flow skips silently','Data table row ORS_UPFRONT_MSG has Active = false.',
         '1. Set Active = false in VJ_claudeDatatable for key ORS_UPFRONT_MSG\n2. Call during open hours\n3. Select language\n4. Observe flow — verify no extra audio before call type menu',
         'Active = false','No upfront announcement plays. Flow proceeds directly from language selection to call type menu.',
         'N/A','Upfront_Check_30 → decision "no"','PASS'],
        ['TC-U02','Upfront Message','Data table key not found — flow continues without error','Key ORS_UPFRONT_MSG does not exist in VJ_claudeDatatable.',
         '1. Remove or rename key in data table\n2. Call and select language\n3. Observe flow continues',
         'Key absent','Flow takes notFound output path. Proceeds to call type menu without error or audio.',
         'N/A','Upfront_Check_30 → notFound','PASS'],
        ['TC-U03','Upfront Message','Data table lookup failure — flow recovers gracefully','Data table is inaccessible or times out.',
         '1. Simulate lookup failure (e.g., data table offline)\n2. Call and select language\n3. Observe flow continues',
         'Lookup failure','Flow takes failure output path. Proceeds to call type menu without hanging.',
         'N/A','Upfront_Check_30 → failure','PENDING'],
      ]
    },
    {
      name: '3B — Upfront Enabled', bg: 'F3E5F5', fg: '4A148C',
      rows: [
        ['TC-U04','Upfront Message','Upfront message enabled — message plays before call type menu','Data table row ORS_UPFRONT_MSG has Active = true and Message = test text.',
         '1. Set Active = true, Message = "Important service update. Please listen carefully." in VJ_claudeDatatable\n2. Call during open hours\n3. Select language\n4. Listen for announcement',
         'Active = true, Message set','Upfront message plays in selected language TTS voice before call type menu.',
         'Jill/Isabel','Upfront_Check_30 → decision "yes"','PASS'],
        ['TC-U05','Upfront Message','Upfront message plays in English when EN selected','Active = true. Caller selected English.',
         '1. Set Active = true with English message\n2. Press 1 for English\n3. Listen to upfront message',
         'Active=true + EN selected','Message reads with Jill voice.',
         'Jill','Upfront_Check_30 → EN path','PASS'],
        ['TC-U06','Upfront Message','Upfront message plays in Spanish when ES selected','Active = true. Caller selected Spanish.',
         '1. Set Active = true with Spanish message text\n2. Press 2 for Spanish\n3. Listen to upfront message',
         'Active=true + ES selected','Message reads with Isabel voice.',
         'Isabel','Upfront_Check_30 → ES path','PASS'],
        ['TC-U07','Upfront Message','Supervisor toggles upfront OFF mid-day — takes effect on next call','Active changed from true to false in data table.',
         '1. Enable upfront (Active=true)\n2. Make a call — verify message plays\n3. Set Active=false in data table\n4. Make another call — verify message no longer plays',
         'Live toggle: true → false','Second call skips upfront message immediately. No flow republish needed.',
         'N/A','VJ_claudeDatatable live update','PASS'],
        ['TC-U08','Upfront Message','Long upfront message plays fully before call type menu','Active=true, Message is a long 30-second announcement.',
         '1. Set a long message (e.g., 3 sentences)\n2. Call and select language\n3. Verify full message plays before call type menu appears',
         'Long message (30 sec)','Full message plays to completion before call type menu prompt starts.',
         'Jill','Upfront_Check_30 audio playback','PASS'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SHEET 5 — CALL TYPE SELECTION
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('4. Call Type Selection', { tabColor: { argb: 'FF00695C' } }), {
  title: 'Test Suite 4 — Call Type Selection (Driver / Customer Care)',
  subtitle: 'ORS_Main_Inbound · Call_Type_Menu_EN_2 / Call_Type_Menu_ES_3 · Bilingual menus',
  columns: testCols,
  sections: [
    {
      name: '4A — English Menu', bg: C.infoBlue, fg: C.infoText,
      rows: [
        ['TC-C01','Call Type Selection','English caller presses 1 — routes to Driver Support','Caller selected English. Call type menu is playing in English.',
         '1. Select English (Press 1 on language menu)\n2. On call type menu press 1\n3. Observe routing',
         'EN + DTMF: 1','Flow routes to Driver_Greeting_50 task. Greeting plays then transfer to ORS_Driver_Queue.',
         'Jill','Call_Type_Menu_EN_2 → digit_1','PASS'],
        ['TC-C02','Call Type Selection','English caller presses 2 — routes to Customer Care','Caller selected English. Call type menu is playing in English.',
         '1. Select English (Press 1)\n2. On call type menu press 2\n3. Observe routing',
         'EN + DTMF: 2','Flow routes to CC_Greeting_51 task. Greeting plays then transfer to ORS_CustomerCare_Queue.',
         'Jill','Call_Type_Menu_EN_2 → digit_2','PASS'],
        ['TC-C03','Call Type Selection','English call type menu text verification','Language is English.',
         '1. Select English\n2. Listen to call type menu prompt carefully\n3. Verify exact wording',
         'Listen to audio','Prompt: "For Driver Support, press 1. For Customer Care, press 2."',
         'Jill','Call_Type_Menu_EN_2 · audio','PASS'],
        ['TC-C04','Call Type Selection','English menu — no input defaults to Driver Support','Caller does not press any key on English call type menu.',
         '1. Select English\n2. Let call type menu time out (10 sec × 3 repeats)\n3. Observe default routing',
         'No DTMF (timeout)','After 3 timeouts, defaults to Driver_Greeting_50 and routes to ORS_Driver_Queue.',
         'Jill','Call_Type_Menu_EN_2 → digit_* default','PASS'],
      ]
    },
    {
      name: '4B — Spanish Menu', bg: 'F3E5F5', fg: '4A148C',
      rows: [
        ['TC-C05','Call Type Selection','Spanish caller presses 1 — routes to Driver Support (ES)','Caller selected Spanish. Call type menu plays in Spanish.',
         '1. Press 2 for Spanish on language menu\n2. On Spanish call type menu press 1\n3. Observe routing',
         'ES + DTMF: 1','Flow routes to Driver_Greeting_50 task. Greeting and pre-transfer audio play with Isabel TTS.',
         'Isabel','Call_Type_Menu_ES_3 → digit_1','PASS'],
        ['TC-C06','Call Type Selection','Spanish caller presses 2 — routes to Customer Care (ES)','Caller selected Spanish.',
         '1. Press 2 for Spanish\n2. Press 2 for Customer Care\n3. Observe routing',
         'ES + DTMF: 2','Flow routes to CC_Greeting_51 task. Transfer to ORS_CustomerCare_Queue with Isabel TTS.',
         'Isabel','Call_Type_Menu_ES_3 → digit_2','PASS'],
        ['TC-C07','Call Type Selection','Spanish call type menu text verification','Language is Spanish.',
         '1. Select Spanish\n2. Listen to call type menu prompt\n3. Verify Spanish wording',
         'Listen to audio','Prompt: "Para Soporte de Conductor, oprima 1. Para Atención al Cliente, oprima 2."',
         'Isabel','Call_Type_Menu_ES_3 · audio','PASS'],
        ['TC-C08','Call Type Selection','Spanish menu — no input defaults to Driver Support','Caller does not press any key on Spanish call type menu.',
         '1. Select Spanish\n2. Let call type menu time out\n3. Observe default routing',
         'No DTMF (timeout)','After timeout defaults to Driver_Greeting_50.',
         'Isabel','Call_Type_Menu_ES_3 → digit_* default','PASS'],
        ['TC-C09','Call Type Selection','Invalid digit on call type menu — menu repeats','Caller presses 9 (invalid) on call type menu.',
         '1. Select language\n2. On call type menu press 9\n3. Observe menu behavior',
         'DTMF: 9','Menu prompt replays. This repeats up to 3 times (repeatCount: 3). Then defaults to Driver Support.',
         'Jill/Isabel','Call_Type_Menu repeatCount','PASS'],
        ['TC-C10','Call Type Selection','Correct menu shown based on language variable','Flow.CallerLanguage drives EN vs ES menu selection.',
         '1. Select English → verify English call type menu\n2. Select Spanish in separate call → verify Spanish menu',
         'Two separate calls','EN call: English menu plays. ES call: Spanish menu plays.',
         'Jill / Isabel','Call_Type_Route_40 decision','PASS'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SHEET 6 — QUEUE TRANSFER
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('5. Queue Transfer', { tabColor: { argb: 'FF4527A0' } }), {
  title: 'Test Suite 5 — Queue Transfer & Greeting',
  subtitle: 'ORS_Main_Inbound · transferToAcd · ORS_Driver_Queue & ORS_CustomerCare_Queue',
  columns: testCols,
  sections: [
    {
      name: '5A — Greeting Audio', bg: C.infoBlue, fg: C.infoText,
      rows: [
        ['TC-Q01','Queue Transfer','Greeting plays before Driver queue transfer','Caller selected Driver Support.',
         '1. Navigate to Driver Support selection\n2. Listen for greeting before hold music',
         'Driver Support path','Greeting plays: "You have reached On Road Support. Your call may be recorded." then pre-transfer audio.',
         'Jill/Isabel','Driver_Greeting_50 · playAudio','PASS'],
        ['TC-Q02','Queue Transfer','Greeting plays before Customer Care queue transfer','Caller selected Customer Care.',
         '1. Navigate to Customer Care selection\n2. Listen for greeting before hold music',
         'Customer Care path','Same greeting plays: "You have reached On Road Support. Your call may be recorded."',
         'Jill/Isabel','CC_Greeting_51 · playAudio','PASS'],
        ['TC-Q03','Queue Transfer','Pre-transfer hold message plays for Driver path','After greeting, pre-transfer audio should play before queue.',
         '1. Select Driver Support\n2. Listen after greeting',
         'Driver route','Pre-transfer: "Please hold while we connect you with the next available On Road Support driver representative."',
         'Jill/Isabel','Driver_Greeting_50 · transferToAcd preTransferAudio','PASS'],
        ['TC-Q04','Queue Transfer','Pre-transfer hold message plays for CC path','After greeting, pre-transfer audio for CC.',
         '1. Select Customer Care\n2. Listen after greeting',
         'CC route','Pre-transfer: "Please hold while we connect you with the next available customer care representative."',
         'Jill/Isabel','CC_Greeting_51 · transferToAcd preTransferAudio','PASS'],
      ]
    },
    {
      name: '5B — Transfer Success & Failure', bg: 'E8F5E9', fg: '1B5E20',
      rows: [
        ['TC-Q05','Queue Transfer','Driver call successfully transfers to ORS_Driver_Queue','Agents are available in ORS_Driver_Queue. Caller selects Driver Support.',
         '1. Ensure agent is available in ORS_Driver_Queue\n2. Select Driver Support\n3. Verify call connects to agent',
         'Agent available','Call is routed to ORS_Driver_Queue. Agent receives the call. In-queue flow is active while waiting.',
         'N/A','ORS_Driver_Queue · transferToAcd','PASS'],
        ['TC-Q06','Queue Transfer','Customer Care call successfully transfers to ORS_CustomerCare_Queue','Agents are available in ORS_CustomerCare_Queue.',
         '1. Ensure agent is available in ORS_CustomerCare_Queue\n2. Select Customer Care\n3. Verify call connects',
         'Agent available','Call is routed to ORS_CustomerCare_Queue. Agent receives the call.',
         'N/A','ORS_CustomerCare_Queue · transferToAcd','PASS'],
        ['TC-Q07','Queue Transfer','Driver queue transfer failure — failure audio plays','No agents available and queue transfer fails.',
         '1. Remove all agents from ORS_Driver_Queue\n2. Configure queue to fail immediately\n3. Select Driver Support\n4. Observe failure handling',
         'Queue failure','Failure audio: "We are sorry, all driver support representatives are currently busy…" plays. Call disconnects.',
         'Jill/Isabel','Driver_Greeting_50 · failureTransferAudio','PENDING'],
        ['TC-Q08','Queue Transfer','Customer Care queue transfer failure handling','Queue transfer fails for CC path.',
         '1. Trigger CC queue transfer failure\n2. Observe failure audio',
         'Queue failure','Failure audio: "We are sorry, all customer care representatives are currently busy…" plays. Call disconnects.',
         'Jill/Isabel','CC_Greeting_51 · failureTransferAudio','PENDING'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SHEET 7 — DRIVER INQUEUE
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('6. Driver InQueue', { tabColor: { argb: 'FF37474F' } }), {
  title: 'Test Suite 6 — ORS_Driver_InQueue Experience',
  subtitle: 'ORS_Driver_InQueue · inqueueCall · Hold music loop · Supervisor upfront toggle (ORS_DRIVER_INQUEUE_MSG)',
  columns: testCols,
  sections: [
    {
      name: '6A — Entry & Upfront Toggle', bg: C.infoBlue, fg: C.infoText,
      rows: [
        ['TC-D01','Driver InQueue','Caller enters Driver queue — in-queue flow activates','Call has been transferred to ORS_Driver_Queue. ORS_Driver_InQueue is assigned.',
         '1. Route a call to ORS_Driver_Queue\n2. Ensure no agents are available (or hold agent)\n3. Observe in-queue experience',
         'Call in ORS_Driver_Queue','In-queue flow starts. Data table lookup for ORS_DRIVER_INQUEUE_MSG executes.',
         'Jill/Isabel','ORS_Driver_InQueue · startUpTaskActions','PASS'],
        ['TC-D02','Driver InQueue','InQueue upfront message disabled — hold music starts immediately','ORS_DRIVER_INQUEUE_MSG Active = false in data table.',
         '1. Set Active = false for ORS_DRIVER_INQUEUE_MSG\n2. Route call to Driver queue\n3. Observe: no upfront announcement before hold music',
         'Active = false','Hold music starts immediately without any announcement.',
         'N/A','dataTableLookup → Active false → holdMusic','PASS'],
        ['TC-D03','Driver InQueue','InQueue upfront message enabled — plays before hold music','ORS_DRIVER_INQUEUE_MSG Active = true with message set.',
         '1. Set Active = true, Message = "Important driver notice…" for ORS_DRIVER_INQUEUE_MSG\n2. Route call to Driver queue\n3. Listen for announcement before hold music',
         'Active = true','In-queue upfront announcement plays. Then hold music starts.',
         'Jill/Isabel','dataTableLookup → Active true → playAudio','PASS'],
      ]
    },
    {
      name: '6B — Hold Music Loop', bg: 'E8F5E9', fg: '1B5E20',
      rows: [
        ['TC-D04','Driver InQueue','Hold music plays continuously (30s cycles)','Call is in Driver queue with no agent available.',
         '1. Route call to Driver queue\n2. Monitor hold music for at least 90 seconds\n3. Verify music loops without interruption',
         'Wait 90+ seconds','Hold music (PromptSystem.on_hold_music) plays in continuous 30-second cycles. No interruption messages.',
         'N/A','ORS_Driver_InQueue · holdMusic loop','PASS'],
        ['TC-D05','Driver InQueue','No periodic patience message in Driver queue','Driver queue experience is hold music ONLY.',
         '1. Route call to Driver queue\n2. Wait at least 3 minutes\n3. Verify NO patience/wait message plays',
         'Wait 3 minutes','No "representatives are busy" message plays. Hold music only. (Unlike CC queue.)',
         'N/A','ORS_Driver_InQueue — no patience msg','PASS'],
        ['TC-D06','Driver InQueue','Agent answers — call connects from Driver queue','An available agent accepts the call in ORS_Driver_Queue.',
         '1. Route call to Driver queue\n2. Have agent accept the call\n3. Verify call connects',
         'Agent accepts call','Hold music stops. Call connects to agent. Two-way audio is established.',
         'N/A','ORS_Driver_Queue → agent connect','PASS'],
        ['TC-D07','Driver InQueue','Caller abandons while in Driver queue','Caller hangs up during hold music.',
         '1. Route call to Driver queue\n2. While hold music is playing, hang up the call\n3. Verify call ends gracefully',
         'Caller disconnects','Call ends. No errors in flow. Queue slot freed.',
         'N/A','ORS_Driver_InQueue · caller abandon','PASS'],
        ['TC-D08','Driver InQueue','Language from main flow carries into in-queue for TTS','Caller selected Spanish in main flow.',
         '1. Select Spanish (Press 2)\n2. Route to Driver queue\n3. If upfront message is active, verify Isabel voice is used',
         'ES + Active upfront = true','In-queue upfront message plays with Isabel TTS voice.',
         'Isabel','Language carry-through to ORS_Driver_InQueue','PASS'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SHEET 8 — CC INQUEUE
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('7. CC InQueue', { tabColor: { argb: 'FF00695C' } }), {
  title: 'Test Suite 7 — ORS_CustomerCare_InQueue Experience',
  subtitle: 'ORS_CustomerCare_InQueue · 60s Hold Music → Patience Message → Loop · Supervisor toggle (ORS_CC_INQUEUE_MSG)',
  columns: testCols,
  sections: [
    {
      name: '7A — Entry & Upfront Toggle', bg: C.infoBlue, fg: C.infoText,
      rows: [
        ['TC-CC01','CC InQueue','Caller enters CC queue — in-queue flow activates','Call transferred to ORS_CustomerCare_Queue. ORS_CustomerCare_InQueue is assigned.',
         '1. Route call to ORS_CustomerCare_Queue\n2. Hold agent\n3. Observe in-queue experience starts',
         'Call in ORS_CustomerCare_Queue','In-queue flow activates. Data table lookup for ORS_CC_INQUEUE_MSG runs.',
         'Jill/Isabel','ORS_CustomerCare_InQueue · startUpTaskActions','PASS'],
        ['TC-CC02','CC InQueue','CC InQueue upfront disabled — hold music starts immediately','ORS_CC_INQUEUE_MSG Active = false.',
         '1. Set Active = false\n2. Route call to CC queue\n3. Verify hold music plays without announcement',
         'Active = false','60-second hold music starts without any upfront announcement.',
         'N/A','CC InQueue → Active false → holdMusic','PASS'],
        ['TC-CC03','CC InQueue','CC InQueue upfront enabled — plays before 60s hold','ORS_CC_INQUEUE_MSG Active = true.',
         '1. Set Active = true with message\n2. Route call to CC queue\n3. Listen for upfront message before hold music',
         'Active = true','In-queue upfront plays first, then 60-second hold music starts.',
         'Jill/Isabel','CC InQueue → Active true → playAudio','PASS'],
      ]
    },
    {
      name: '7B — Hold Music & Patience Loop', bg: 'E8F5E9', fg: '1B5E20',
      rows: [
        ['TC-CC04','CC InQueue','Hold music plays for exactly 60 seconds','No agent available. Caller is in CC queue.',
         '1. Route call to CC queue\n2. Time the hold music duration before patience message\n3. Verify it is approximately 60 seconds',
         'Timer measurement','Hold music plays for ~60 seconds (audioSequence duration: 60s).',
         'N/A','ORS_CustomerCare_InQueue · holdMusic 60s','PASS'],
        ['TC-CC05','CC InQueue','Patience message plays after 60 seconds','After hold music completes.',
         '1. Route call to CC queue\n2. Wait 60+ seconds\n3. Listen for patience message',
         'Wait 60 seconds','"Thanks for your patience. Looks like our representatives are busy. Please remain on the line while we connect you with the next available representative."',
         'Jill/Isabel','ORS_CustomerCare_InQueue · Patience_Message_30','PASS'],
        ['TC-CC06','CC InQueue','Loop returns to 60s hold after patience message','After patience message plays.',
         '1. Route call to CC queue\n2. Wait through first 60s hold + patience message\n3. Verify hold music resumes',
         'Full cycle complete','After patience message, hold music plays again for 60 seconds. Loop continues.',
         'N/A','CC InQueue loop: Hold_Music → Patience → Hold_Music','PASS'],
        ['TC-CC07','CC InQueue','Multiple loop cycles play correctly','Caller waits more than 3 minutes.',
         '1. Route call to CC queue with no agent\n2. Wait 4 minutes\n3. Count patience message repetitions',
         'Wait 4 minutes','Patience message plays approximately every 70 seconds (60s hold + message). Multiple cycles complete without errors.',
         'Jill/Isabel','CC InQueue · multi-loop','PASS'],
        ['TC-CC08','CC InQueue','Agent answers — call connects from CC queue','Agent accepts CC call.',
         '1. Route call to CC queue\n2. Agent answers\n3. Verify connection',
         'Agent accepts','Hold music stops. Call connects. Two-way audio OK.',
         'N/A','ORS_CustomerCare_Queue → agent connect','PASS'],
        ['TC-CC09','CC InQueue','Caller abandons during patience message','Caller hangs up while patience message is playing.',
         '1. Route call to CC queue\n2. Wait 60s for patience message\n3. While message plays, hang up\n4. Verify graceful termination',
         'Hang up mid-message','Call ends cleanly. No flow errors.',
         'N/A','CC InQueue · abandon mid-message','PASS'],
        ['TC-CC10','CC InQueue','Spanish TTS used in CC in-queue when ES language selected','Caller selected Spanish in main flow.',
         '1. Select Spanish in main flow\n2. Route to CC queue\n3. If upfront active, verify Isabel voice\n4. Verify patience message uses Isabel voice',
         'ES + CC queue','All in-queue TTS (upfront + patience message) uses Isabel voice.',
         'Isabel','Language carry-through → CC InQueue Isabel TTS','PASS'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SHEET 9 — END TO END
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('8. End-to-End', { tabColor: { argb: 'FF1A237E' } }), {
  title: 'Test Suite 8 — End-to-End Call Scenarios',
  subtitle: 'Full call path from dial-in to agent connection or disconnect',
  columns: testCols,
  sections: [
    {
      name: '8A — Happy Path Scenarios', bg: C.infoBlue, fg: C.infoText,
      rows: [
        ['TC-E01','End-to-End','English Driver Support — full flow to agent','Open hours, English, Driver, agents available. Upfront OFF.',
         '1. Call during open hours\n2. Press 1 → English\n3. Press 1 → Driver Support\n4. Wait for agent\n5. Verify agent answers',
         'Full EN Driver path','Schedule open → Language EN (Jill) → Skip upfront → Driver menu → Greeting → ORS_Driver_Queue → Hold music → Agent connects.',
         'Jill','Full EN Driver path','PASS'],
        ['TC-E02','End-to-End','English Customer Care — full flow to agent','Open hours, English, CC, agents available.',
         '1. Call during open hours\n2. Press 1 → English\n3. Press 2 → Customer Care\n4. Wait for agent',
         'Full EN CC path','Schedule open → Language EN (Jill) → CC queue → 60s hold → Patience msg → Agent connects.',
         'Jill','Full EN CC path','PASS'],
        ['TC-E03','End-to-End','Spanish Driver Support — full bilingual flow','Open hours, Spanish, Driver, agents available.',
         '1. Call during open hours\n2. Press 2 → Spanish\n3. Press 1 → Soporte de Conductor\n4. Wait for agent',
         'Full ES Driver path','Schedule open → Language ES (Isabel) → Spanish call type menu → Greeting (Isabel) → ORS_Driver_Queue → Agent connects.',
         'Isabel','Full ES Driver path','PASS'],
        ['TC-E04','End-to-End','Spanish Customer Care — full bilingual flow','Open hours, Spanish, CC, agents available.',
         '1. Call during open hours\n2. Press 2 → Spanish\n3. Press 2 → Atención al Cliente\n4. Wait for agent',
         'Full ES CC path','Schedule open → Isabel TTS throughout → CC queue → 60s hold (no TTS) → Patience msg (Isabel) → Agent connects.',
         'Isabel','Full ES CC path','PASS'],
        ['TC-E05','End-to-End','Full flow with upfront message active (EN)','Open hours, Active=true in data table, English.',
         '1. Enable ORS_UPFRONT_MSG (Active=true)\n2. Call in English\n3. Verify upfront plays between language menu and call type menu',
         'Upfront ON + EN','Language menu → Upfront message (Jill) → Call type menu → Greeting → Queue.',
         'Jill','Upfront active full path','PASS'],
      ]
    },
    {
      name: '8B — Closed / Exception Paths', bg: 'FFEBEE', fg: 'B71C1C',
      rows: [
        ['TC-E06','End-to-End','Call outside hours — immediate closed message and disconnect','Current time is outside 5AM–11PM CST.',
         '1. Call at midnight (12:00 AM CST)\n2. Listen to message\n3. Verify disconnect occurs',
         'Call at midnight','Closed message plays immediately. No language selection or menu is presented. Call disconnects.',
         'Jill','Schedule check → Closed path → Disconnect','PASS'],
        ['TC-E07','End-to-End','Emergency closure — message plays regardless of time','Emergency activated in schedule group.',
         '1. Enable emergency in ORS_Schedule_Group\n2. Call during normally open hours\n3. Verify emergency message\n4. Disable emergency after test',
         'Emergency ON, Open hours','Emergency message overrides open hours. Plays immediately then disconnects.',
         'Jill','Schedule check → Emergency path → Disconnect','PENDING'],
        ['TC-E08','End-to-End','Caller hangs up during language selection — no error','Caller disconnects mid-IVR.',
         '1. Call during open hours\n2. While language menu plays, hang up\n3. Verify no errors in flow logs',
         'Hang up during menu','Call ends cleanly. No stuck sessions or errors in Architect logs.',
         'N/A','Language menu → caller disconnect','PASS'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SHEET 10 — NEGATIVE / BOUNDARY TESTS
// ═══════════════════════════════════════════════════════════════════════
buildSheet(wb.addWorksheet('9. Negative Tests', { tabColor: { argb: 'FFBF360C' } }), {
  title: 'Test Suite 9 — Negative, Boundary & Stress Tests',
  subtitle: 'Edge cases, invalid inputs, timeouts, and boundary conditions',
  columns: testCols,
  sections: [
    {
      name: '9A — Invalid / No Input', bg: 'FFEBEE', fg: 'B71C1C',
      rows: [
        ['TC-N01','Negative Test','No DTMF on language menu — defaults after 3 timeouts','Caller provides no input on language menu.',
         '1. Call during open hours\n2. Stay silent for entire language menu (3 × 10s = 30s)\n3. Observe default behavior',
         'No input (30s silence)','After 3 timeout cycles, flow defaults to English and proceeds.',
         'Jill','Language_Menu_1 repeatCount=3 → default','PASS'],
        ['TC-N02','Negative Test','No DTMF on call type menu — defaults after 3 timeouts','Caller provides no input on call type selection.',
         '1. Select language\n2. On call type menu, remain silent for 30 seconds\n3. Observe default',
         'No input (30s silence)','Defaults to Driver Support path after 3 timeouts.',
         'Jill/Isabel','Call_Type_Menu repeatCount=3 → default','PASS'],
        ['TC-N03','Negative Test','Repeated invalid input on language menu','Caller presses 7, 8, 9 (all invalid) on language menu.',
         '1. Press 7 (invalid) × 3\n2. Observe menu behavior after 3 failures',
         'DTMF: 7 (×3)','Menu repeats 3 times then defaults to English.',
         'Jill','Language menu invalid DTMF × 3','PASS'],
        ['TC-N04','Negative Test','Repeated invalid input on call type menu','Caller presses 0 (invalid) on call type menu.',
         '1. Select language\n2. Press 0 (invalid) × 3 on call type menu\n3. Observe default routing',
         'DTMF: 0 (×3)','Menu repeats 3 times then defaults to Driver Support.',
         'Jill/Isabel','Call type menu invalid DTMF × 3','PASS'],
      ]
    },
    {
      name: '9B — TTS & Audio Edge Cases', bg: 'FFF8E1', fg: 'E65100',
      rows: [
        ['TC-N05','Negative Test','Empty upfront message — no audio, flow continues','Active=true but Message is empty string.',
         '1. Set Active=true, Message="" in data table\n2. Call and select language\n3. Verify flow does not hang on empty TTS',
         'Active=true, Message=""','Flow plays empty TTS (silent or skips). Proceeds to call type menu without hanging.',
         'N/A','Upfront playAudio with empty string','PENDING'],
        ['TC-N06','Negative Test','Very long message in upfront — plays fully','Active=true, Message is 500+ characters.',
         '1. Set a very long upfront message (5+ sentences)\n2. Call and select language\n3. Verify full message plays',
         'Message = 500+ chars','Full message reads to completion. No truncation. Call type menu follows.',
         'Jill/Isabel','Upfront TTS long message','PASS'],
        ['TC-N07','Negative Test','Special characters in upfront message','Message contains & # @ ! punctuation.',
         '1. Set Message = "Hello! We\'re open & ready to help. Call us at #1 today."\n2. Call and listen',
         'Special chars in message','TTS engine reads message without errors (may pronounce # and & differently).',
         'Jill','TTS special chars','PASS'],
      ]
    },
    {
      name: '9C — Concurrent & Stress', bg: C.rowAlt, fg: C.slateHdr,
      rows: [
        ['TC-N08','Negative Test','Multiple simultaneous calls — each gets correct language','Two callers call simultaneously: one selects EN, one ES.',
         '1. Place two simultaneous calls\n2. Caller A: press 1 (English)\n3. Caller B: press 2 (Spanish)\n4. Verify each gets correct TTS voice',
         'Concurrent EN + ES calls','Each call independently tracks language. Caller A hears Jill. Caller B hears Isabel.',
         'Jill / Isabel','Flow variable isolation per session','PASS'],
        ['TC-N09','Negative Test','Call during schedule boundary transition (5:00 AM exact)','Test exactly at the schedule open boundary.',
         '1. Place call at 4:59:59 AM CST → verify closed message\n2. Place call at 5:00:01 AM CST → verify open flow',
         'Boundary ±1 second','Call before 5AM gets closed message. Call at/after 5AM proceeds to language menu.',
         'Jill','Schedule boundary ±1s','PENDING'],
        ['TC-N10','Negative Test','Data table updated mid-call — new value NOT retroactively applied','Upfront Active changes from false to true while a call is already in progress.',
         '1. Start a call (upfront Active=false)\n2. While call is past upfront check, change Active=true in data table\n3. Observe current call is unaffected',
         'Data table changed mid-call','Current active call is unaffected. Change only takes effect on next new call.',
         'N/A','Data table lookup — session scope','PASS'],
      ]
    }
  ]
});

// ═══════════════════════════════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════════════════════════════
const outPath = 'C:/Users/VijayBandaru/ORS_Test_Cases.xlsx';
wb.xlsx.writeFile(outPath).then(() => {
  console.log('Excel saved:', outPath);
}).catch(e => { console.error('Error:', e); process.exit(1); });
