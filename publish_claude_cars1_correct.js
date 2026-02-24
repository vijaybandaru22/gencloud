const { execSync } = require('child_process');
const fs = require('fs');

const FLOW_NAME = 'Claude_cars1';
const FLOW_ID = 'ef3d104a-b29c-41a8-ab19-8b74437853cf';
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const ARCHY_PATH = 'C:\\Users\\VijayBandaru\\AppData\\Local\\Archy\\archy.bat';

console.log('='.repeat(60));
console.log('PUBLISHING CLAUDE_CARS1 FLOW WITH ARCHY');
console.log('='.repeat(60) + '\n');

// Check if YAML file exists
if (!fs.existsSync(`${FLOW_NAME}.yaml`)) {
    console.error(`❌ Error: ${FLOW_NAME}.yaml not found!`);
    process.exit(1);
}

console.log(`📄 Using YAML file: ${FLOW_NAME}.yaml`);
console.log(`🔧 Using Archy: ${ARCHY_PATH}`);
console.log(`🌐 Region: usw2.pure.cloud\n`);

try {
    const publishCmd = `"${ARCHY_PATH}" publish --file ${FLOW_NAME}.yaml --clientId ${CLIENT_ID} --clientSecret ${CLIENT_SECRET} --location usw2.pure.cloud --forceUnlock`;

    console.log(`🚀 Publishing flow...\n`);
    console.log(`Command: ${publishCmd}\n`);
    console.log('-'.repeat(60) + '\n');

    const _output = execSync(publishCmd, {
        encoding: 'utf8',
        stdio: 'inherit'
    });

    console.log('\n' + '-'.repeat(60));
    console.log('✅ FLOW PUBLISHED SUCCESSFULLY!\n');
    console.log(`Flow Name: ${FLOW_NAME}`);
    console.log(`Flow ID: ${FLOW_ID}`);
    console.log(`\n🌐 View in Architect:`);
    console.log(`https://apps.usw2.pure.cloud/architect/#/call/inboundcall/${FLOW_ID}/latest\n`);
    console.log('='.repeat(60));

} catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ PUBLISHING FAILED');
    console.error('='.repeat(60));
    console.error(`\nError: ${error.message}\n`);

    if (error.stdout) {
        console.log('Output:', error.stdout);
    }
    if (error.stderr) {
        console.error('Error details:', error.stderr);
    }

    console.log('\nTroubleshooting steps:');
    console.log('1. Check if the YAML file is valid');
    console.log('2. Verify OAuth credentials have sufficient permissions');
    console.log('3. Ensure the flow is not locked by another user');
    console.log(`4. Try manually publishing in Architect:`);
    console.log(`   https://apps.usw2.pure.cloud/architect/#/call/inboundcall/${FLOW_ID}/latest\n`);

    process.exit(1);
}
