// Use Architect Scripting library directly to create the flow
// This bypasses archy and gives us full control

const scripting = require('purecloud-flow-scripting-api-sdk-javascript');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const ENVIRONMENT = 'usw2.pure.cloud';

async function createFlowWithScripting() {
    try {
        console.log('🚀 Starting Architect Scripting session...\n');

        // Start session with client credentials
        const session = scripting.ArchSession.default;

        console.log('🔐 Authenticating...');
        await session.startWithClientIdAndSecret(CLIENT_ID, CLIENT_SECRET, ENVIRONMENT);

        console.log('✅ Authenticated\n');

        // Get division
        console.log('📋 Looking up division...');
        const divisionByName = await scripting.ArchDivisions.default.getDivisionByName('Claude_Exploration_Vijay');
        console.log(`✅ Found division: ${divisionByName.name}\n`);

        // Create the flow
        console.log('📝 Creating inbound call flow...');
        const flowFactory = scripting.ArchFactoryFlows.default;

        const newFlow = await flowFactory.createFlowAsync(
            'Claude_cars23',
            'Inbound call flow with menu routing',
            scripting.ArchEnums.FLOW_TYPES.INBOUND_CALL,
            divisionByName
        );

        console.log(`✅ Flow created: ${newFlow.id}\n`);

        // Set supported language
        console.log('🌐 Configuring languages...');
        newFlow.setDefaultSupportedLanguageByTag('en-us');

        // Set initial greeting
        console.log('👋 Setting initial greeting...');
        newFlow.settingsInboundCallFlow.initialGreeting.tts.setLiteralByLanguage('en-us', 'Welcome to Claude Cars');

        // Create a state
        console.log('🔨 Adding Welcome state...');
        const stateFactory = scripting.ArchFactoryStates.default;
        const welcomeState = stateFactory.addStateByName(newFlow, 'Welcome');

        // Set as start state
        newFlow.startUpRef = welcomeState;

        // Add Play Audio action
        console.log('🎵 Adding Play Audio action...');
        const playAudioAction = scripting.ArchFactoryActions.default.addActionPlayAudioToFlow(newFlow);
        playAudioAction.name = 'Welcome_Message';
        playAudioAction.audio.tts.setLiteralByLanguage('en-us', 'Thanks for choosing my flow. Please listen to the following options.');

        // Add action to state
        welcomeState.addActionByName('Welcome_Message', playAudioAction);

        // Add Collect Input action
        console.log('📞 Adding menu collection...');
        const collectInputAction = scripting.ArchFactoryActions.default.addActionCollectInput(newFlow);
        collectInputAction.name = 'Main_Menu';
        collectInputAction.inputAudio.tts.setLiteralByLanguage('en-us', 'For Sales, press 1. For Service, press 2. For New Models, press 3.');
        collectInputAction.maxDigits.setLiteral(1);
        collectInputAction.timeout.setLiteralSeconds(10);

        welcomeState.addActionByName('Main_Menu', collectInputAction);

        // Add Transfer to ACD actions for each digit
        console.log('📍 Adding transfer actions...');
        const transferAction1 = scripting.ArchFactoryActions.default.addActionTransferToAcd(newFlow);
        transferAction1.name = 'Transfer_To_US_Queue_Sales';
        transferAction1.targetQueue.setLiteralQueueByName('US_Queue');
        transferAction1.priority.setLiteral(0);

        collectInputAction.addOutputPathForDigit('1', transferAction1);

        // Check in and publish
        console.log('✅ Checking in flow...');
        await newFlow.checkin('Initial version with menu');

        console.log('📤 Publishing flow...');
        await newFlow.publish();

        console.log('\n' + '='.repeat(80));
        console.log('✅ FLOW CREATED AND PUBLISHED SUCCESSFULLY!');
        console.log('='.repeat(80));
        console.log(`\n📋 Flow Information:`);
        console.log(`   Name: ${newFlow.name}`);
        console.log(`   ID: ${newFlow.id}`);
        console.log(`   Type: Inbound Call Flow`);
        console.log(`\n🔗 View in Architect:`);
        console.log(`   https://apps.${ENVIRONMENT}/architect/#/call/inbound/${newFlow.id}\n`);
        console.log('='.repeat(80));

        // End session
        await session.end();

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

createFlowWithScripting();
