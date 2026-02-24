const { execSync } = require('child_process');

const FLOW_NAME = 'Claude_cars1';
const FLOW_ID = 'ef3d104a-b29c-41a8-ab19-8b74437853cf';
const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('='.repeat(60));
console.log('PUBLISHING CLAUDE_CARS1 FLOW');
console.log('='.repeat(60) + '\n');

// Method 1: Try archy publish without verbose flag
console.log('Method 1: Publishing with archy (corrected command)...\n');

try {
    const publishCmd = `archy publish --file ${FLOW_NAME}.yaml --clientId ${CLIENT_ID} --clientSecret ${CLIENT_SECRET} --location usw2 --forceUnlock`;

    console.log(`Running: ${publishCmd}\n`);

    const _output = execSync(publishCmd, {
        encoding: 'utf8',
        stdio: 'inherit'
    });

    console.log('\n✅ Flow published successfully with archy!\n');
    process.exit(0);

} catch (_error) {
    console.log('\n⚠️  Archy publish method 1 failed. Trying method 2...\n');
}

// Method 2: Try archy publish with results flag
console.log('Method 2: Publishing with archy (using --results flag)...\n');

try {
    const publishCmd = `archy publish --file ${FLOW_NAME}.yaml --clientId ${CLIENT_ID} --clientSecret ${CLIENT_SECRET} --location usw2 --forceUnlock --results`;

    console.log(`Running: ${publishCmd}\n`);

    const _output = execSync(publishCmd, {
        encoding: 'utf8',
        stdio: 'inherit'
    });

    console.log('\n✅ Flow published successfully with archy!\n');
    process.exit(0);

} catch (_error) {
    console.log('\n⚠️  Archy publish method 2 failed. Trying method 3...\n');
}

// Method 3: Use archy with flowId directly
console.log('Method 3: Using archy with flow ID...\n');

try {
    const publishCmd = `archy publish --flowId ${FLOW_ID} --clientId ${CLIENT_ID} --clientSecret ${CLIENT_SECRET} --location usw2 --forceUnlock`;

    console.log(`Running: ${publishCmd}\n`);

    const _output = execSync(publishCmd, {
        encoding: 'utf8',
        stdio: 'inherit'
    });

    console.log('\n✅ Flow published successfully with archy!\n');
    process.exit(0);

} catch (_error) {
    console.log('\n⚠️  All archy methods failed.\n');
}

console.log('Please manually publish the flow in Architect at:');
console.log(`https://apps.usw2.pure.cloud/architect/#/call/inboundcall/${FLOW_ID}/latest\n`);
