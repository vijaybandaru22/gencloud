/**
 * Automated YAML Import Script for Genesys Cloud Architect
 *
 * This script provides instructions and automation for importing
 * Claude_cars32.yaml into Genesys Cloud Architect
 */

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════════════╗');
console.log('║     Automated YAML Import for Claude_cars32                       ║');
console.log('╚════════════════════════════════════════════════════════════════════╝');
console.log('');

// Check if YAML file exists
const yamlFile = 'Claude_cars32.yaml';
const yamlPath = path.resolve(yamlFile);

if (!fs.existsSync(yamlPath)) {
  console.error('❌ YAML file not found:', yamlPath);
  process.exit(1);
}

console.log('✅ YAML file found:', yamlPath);
console.log('');

console.log('📋 YAML IMPORT INSTRUCTIONS');
console.log('═'.repeat(70));
console.log('');

console.log('Genesys Cloud does not support YAML import via API.');
console.log('You must import the YAML file through the Architect UI.');
console.log('');

console.log('🎯 Step-by-Step Instructions:');
console.log('');

console.log('STEP 1: Open Genesys Cloud Architect');
console.log('  → Go to: https://apps.usw2.pure.cloud');
console.log('  → Click: Admin (gear icon)');
console.log('  → Click: Architect → Flows → Inbound Call');
console.log('');

console.log('STEP 2: Import the YAML File');
console.log('  → Click the "Import" button (top right, next to "Create Flow")');
console.log('  → OR: If Claude_cars32 already exists:');
console.log('    • Open Claude_cars32 flow');
console.log('    • Click the gear icon (⚙️) in top right');
console.log('    • Select "Import"');
console.log('');

console.log('STEP 3: Select YAML File');
console.log('  → Click "Choose File" or "Browse"');
console.log('  → Navigate to and select:');
console.log(`     ${yamlPath}`);
console.log('  → Click "Import" or "Open"');
console.log('');

console.log('STEP 4: Review Imported Flow');
console.log('  → Architect will load the flow with all states:');
console.log('    • Initial State (Language Selection)');
console.log('    • Geographic Routing');
console.log('    • US Menu');
console.log('    • India Menu');
console.log('    • US Queue Transfer');
console.log('    • India Queue Transfer');
console.log('    • Thank You and Disconnect');
console.log('');

console.log('STEP 5: Validate the Flow');
console.log('  → Click the "Validate" button (top toolbar)');
console.log('  → Fix any validation errors if they appear');
console.log('  → Verify all states are connected properly');
console.log('');

console.log('STEP 6: Save the Flow');
console.log('  → Click "Save" button');
console.log('  → Wait for save to complete');
console.log('');

console.log('STEP 7: Publish the Flow');
console.log('  → Click "Publish" button');
console.log('  → Add publish notes (optional):');
console.log('     "Initial import with language selection and geographic routing"');
console.log('  → Click "Publish" to confirm');
console.log('  → Wait for publish to complete');
console.log('');

console.log('═'.repeat(70));
console.log('');

console.log('✅ After Import, Your Flow Will Have:');
console.log('');
console.log('  ✓ Language Selection (English/Spanish)');
console.log('    "Welcome to Claude Cars. For English, press 1. Para Español, oprima 2."');
console.log('');
console.log('  ✓ Geographic Routing');
console.log('    • US numbers (+1) → US Menu → US_Queue1');
console.log('    • India numbers (+91) → India Menu → India_Queue1');
console.log('');
console.log('  ✓ Service Menu Options');
console.log('    "For Sales, press 1. For Services, press 2. For New Models, press 3."');
console.log('');
console.log('  ✓ Queue Transfers');
console.log('    • US_Queue1 (21d24c58-7730-4770-95dd-b38931b7ec7b)');
console.log('    • India_Queue1 (d5d178d1-c963-4973-8d83-88b60633f087)');
console.log('');
console.log('  ✓ Thank You Message');
console.log('    "Thanks for choosing my flow. Goodbye."');
console.log('');

console.log('═'.repeat(70));
console.log('');

console.log('🔗 Quick Links:');
console.log('');
console.log('Genesys Cloud Login:');
console.log('  https://apps.usw2.pure.cloud');
console.log('');
console.log('Architect (Direct):');
console.log('  https://apps.usw2.pure.cloud/architect');
console.log('');
console.log('Your Flow (Direct):');
console.log('  https://apps.usw2.pure.cloud/architect/#/call/userprompts/inboundCall/a1002ab0-811e-49c9-9f36-df07c9277244');
console.log('');

console.log('═'.repeat(70));
console.log('');

console.log('⚠️  IMPORTANT NOTES:');
console.log('');
console.log('1. The import will REPLACE the current flow configuration');
console.log('2. Make sure you have the correct YAML file selected');
console.log('3. After import, validate before publishing');
console.log('4. The flow must be published to be active');
console.log('5. Assign a DID number after publishing');
console.log('');

console.log('═'.repeat(70));
console.log('');

console.log('📄 Files Ready for Import:');
console.log('');
console.log('Main YAML File:');
console.log(`  ${yamlPath}`);
console.log('  Size:', fs.statSync(yamlPath).size, 'bytes');
console.log('  Ready: ✅');
console.log('');

console.log('═'.repeat(70));
console.log('');

console.log('🎯 Summary:');
console.log('');
console.log('1. Open Architect UI');
console.log('2. Click Import button');
console.log('3. Select Claude_cars32.yaml');
console.log('4. Validate, Save, and Publish');
console.log('5. Test your flow!');
console.log('');

console.log('═'.repeat(70));
console.log('');

console.log('💡 Tip: Keep this window open for reference while importing!');
console.log('');

// Keep the window open
console.log('Press Ctrl+C to exit this guide...');
