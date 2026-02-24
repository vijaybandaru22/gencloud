const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');

const client = platformClient.ApiClient.instance;
client.setEnvironment('https://api.usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

async function finalSetup() {
    try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('        CLAUDE_CARS FLOW - CONFIGURATION STATUS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log('🔐 Authenticating...');
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);
        console.log('✓ Authenticated\n');

        const architectApi = new platformClient.ArchitectApi();
        const routingApi = new platformClient.RoutingApi();

        // Get flow
        const flows = await architectApi.getFlows({
            type: 'inboundcall',
            name: 'Claude_cars'
        });

        if (!flows.entities || flows.entities.length === 0) {
            throw new Error('Claude_cars flow not found');
        }

        const flow = flows.entities[0];
        const flowDetails = await architectApi.getFlow(flow.id);

        // Get queues
        const usQueueResp = await routingApi.getRoutingQueues({ name: 'US_Queue' });
        const indiaQueueResp = await routingApi.getRoutingQueues({ name: 'India_Queue' });

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                     CURRENT STATUS');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('FLOW INFORMATION:');
        console.log(`  Name: ${flow.name}`);
        console.log(`  ID: ${flow.id}`);
        console.log(`  Type: ${flow.type}`);
        console.log(`  Division: ${flowDetails.division ? flowDetails.division.name : 'Home'}`);
        console.log(`  Status: ${flowDetails.publishedVersion ? '✓ PUBLISHED (v' + flowDetails.publishedVersion.version + ')' : '⚠ DRAFT - Needs Configuration'}`);

        console.log('\nQUEUES:');
        console.log(`  US_Queue: ${usQueueResp.entities[0].id}`);
        console.log(`  India_Queue: ${indiaQueueResp.entities[0].id}`);

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                  CONFIGURATION REQUIRED');
        console.log('═══════════════════════════════════════════════════════════════\n');

        console.log('The Claude_cars flow has been created but requires manual');
        console.log('configuration in Genesys Cloud Architect due to platform');
        console.log('limitations for complex flows.\n');

        console.log('WHAT YOU NEED TO DO:');
        console.log('--------------------');
        console.log('1. Open Architect');
        console.log('   URL: https://apps.usw2.pure.cloud');
        console.log('   Path: Admin → Architect → Inbound Call → Claude_cars\n');

        console.log('2. Configure the following components:');
        console.log('   ☐ Variables (4 string variables)');
        console.log('   ☐ Language Selection Menu (English/Spanish)');
        console.log('   ☐ Hold Music Task (30 seconds)');
        console.log('   ☐ Promotional Message (AI car)');
        console.log('   ☐ Service Menu (Sales/Service/New Models)');
        console.log('   ☐ Geographic Routing Decision (+91 → India, other → US)');
        console.log('   ☐ Screen Pop Data (5 fields)');
        console.log('   ☐ Transfer to Queue actions\n');

        console.log('3. Validate, Save, and Publish\n');

        console.log('4. Assign DID and add agents to queues\n');

        console.log('5. Test the complete flow\n');

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                     DETAILED INSTRUCTIONS');
        console.log('═══════════════════════════════════════════════════════════════\n');

        const guide = `
CLAUDE_CARS FLOW - ARCHITECT CONFIGURATION INSTRUCTIONS
========================================================

FLOW ID: ${flow.id}
ACCESS: https://apps.usw2.pure.cloud
PATH: Admin → Architect → Inbound Call → Claude_cars

STEP-BY-STEP CONFIGURATION:
----------------------------

1. VARIABLES
   Go to Data → Variables, add these string variables:
   - Flow.selectedLanguage (Initial: "English")
   - Flow.callerNumber
   - Flow.callerLocation
   - Flow.department

2. LANGUAGE SELECTION MENU
   Menus → Add Menu → "Language Selection"
   Prompt: "Welcome to Claude Cars. For English, press 1. Para Español, presione 2."

   Choice 1 (DTMF: 1):
     - Set Language: en-us
     - Update Data: Flow.selectedLanguage = "English"
     - Call Task: "Hold and Promo"

   Choice 2 (DTMF: 2):
     - Set Language: es
     - Update Data: Flow.selectedLanguage = "Spanish"
     - Call Task: "Hold and Promo"

3. HOLD AND PROMO TASK
   Tasks → Add Task → "Hold and Promo"

   Actions:
     a) Play Audio: "Please hold while we connect your call..."
     b) Wait: 30 seconds
     c) Play Audio: "Thank you for your patience. We are excited to introduce
                      our revolutionary new AI car model. This groundbreaking
                      vehicle has the amazing capability to fly during traffic
                      jams and can even travel in rivers. Experience the future
                      of transportation with Claude Cars."
     d) Call Menu: "Service Menu"

4. SERVICE MENU
   Menus → Add Menu → "Service Menu"
   Prompt: "Please select from the following options. Press 1 for Sales.
            Press 2 for Service. Press 3 for information about New Models."

   Choice 1 (DTMF: 1):
     - Update Data: Flow.department = "Sales"
     - Call Task: "Geographic Routing"

   Choice 2 (DTMF: 2):
     - Update Data: Flow.department = "Service"
     - Call Task: "Geographic Routing"

   Choice 3 (DTMF: 3):
     - Update Data: Flow.department = "New Models"
     - Call Task: "Geographic Routing"

5. GEOGRAPHIC ROUTING TASK
   Tasks → Add Task → "Geographic Routing"

   Actions:
     a) Update Data: Flow.callerNumber = ToString(Call.Ani)

     b) Decision: "Check Location"
        Condition: StartsWith(ToString(Call.Ani), "+91") OR
                   StartsWith(ToString(Call.Ani), "91")

        YES Path (India):
          - Update Data: Flow.callerLocation = "India"
          - Set Screen Pop Data:
            * Queue Name = "India_Queue"
            * Caller Number = Flow.callerNumber
            * Caller Location = "India"
            * Department = Flow.department
            * Language = Flow.selectedLanguage
          - Transfer to ACD: India_Queue
            Pre-transfer: "Please hold while we connect you to our India team."

        NO Path (US):
          - Update Data: Flow.callerLocation = "United States"
          - Set Screen Pop Data:
            * Queue Name = "US_Queue"
            * Caller Number = Flow.callerNumber
            * Caller Location = "United States"
            * Department = Flow.department
            * Language = Flow.selectedLanguage
          - Transfer to ACD: US_Queue
            Pre-transfer: "Please hold while we connect you to our US team."

6. SET START POINT
   - Set flow Start to "Language Selection" menu

7. VALIDATE
   - Click Validate button
   - Fix any errors

8. SAVE
   - Click Save button

9. PUBLISH
   - Click Publish button
   - Confirm publication

AFTER PUBLISHING:
-----------------

ASSIGN DID:
  Admin → Telephony → DIDs
  Select DID → Set Inbound Call Flow: Claude_cars → Save

ADD AGENTS:
  Admin → Contact Center → Queues
  US_Queue → Members → Add agents
  India_Queue → Members → Add agents

TEST:
  Call the DID and verify:
  ✓ Language selection works
  ✓ Hold music plays (30 sec)
  ✓ Promo message plays
  ✓ Service menu works
  ✓ Routing works correctly
  ✓ Agent sees script data

TROUBLESHOOTING:
----------------
- Validation errors → Check all variables defined
- Can't publish → Ensure all paths have endpoints
- No routing → Check agents assigned to queues
- No script data → Verify Screen Pop Data configured

ESTIMATED TIME: 20-30 minutes for first-time configuration

═══════════════════════════════════════════════════════════════
`;

        fs.writeFileSync('ARCHITECT_CONFIGURATION_INSTRUCTIONS.txt', guide);
        console.log('   ✓ Detailed instructions saved to:');
        console.log('     ARCHITECT_CONFIGURATION_INSTRUCTIONS.txt\n');

        console.log('═══════════════════════════════════════════════════════════════');
        console.log('                         SUMMARY');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('✅ FRAMEWORK COMPLETE:');
        console.log('   • Flow entity created');
        console.log('   • Queues created (US_Queue, India_Queue)');
        console.log('   • Configuration instructions provided\n');

        console.log('⏳ ACTION REQUIRED:');
        console.log('   • Open Architect and configure flow manually');
        console.log('   • Follow instructions in ARCHITECT_CONFIGURATION_INSTRUCTIONS.txt');
        console.log('   • Estimated time: 20-30 minutes\n');

        console.log('📖 DOCUMENTATION CREATED:');
        console.log('   • ARCHITECT_CONFIGURATION_INSTRUCTIONS.txt');
        console.log('   • CLAUDE_CARS_FINAL_SUMMARY.md');
        console.log('   • CLAUDE_CARS_QUICK_START.txt\n');

        console.log('═══════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

finalSetup();
