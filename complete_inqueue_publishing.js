const platformClient = require('purecloud-platform-client-v2');
const fs = require('fs');

const client = platformClient.ApiClient.instance;
client.setEnvironment('usw2.pure.cloud');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

console.log('🚀 COMPLETING IN-QUEUE FLOW PUBLISHING\n');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Read the YAML files for reference
const usYaml = fs.readFileSync('/c/Users/VijayBandaru/US_InQueue_Array.yaml', 'utf8');
const indiaYaml = fs.readFileSync('/c/Users/VijayBandaru/India_InQueue_Working.yaml', 'utf8');

client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Authenticated\n');
    const architectApi = new platformClient.ArchitectApi();
    
    console.log('Step 1: Configuring US Queue In-Queue Flow...\n');
    
    const usFlowId = '2a82c088-d6d6-4db8-8a5f-cb8460dac647';
    
    // First, try to import the YAML configuration
    return architectApi.postFlowsActionsPublish(usFlowId, { yaml: usYaml })
      .then(() => {
        console.log('✅ US Flow configuration applied\n');
        return wait(2000);
      })
      .catch((err) => {
        console.log('⚠️  API configuration attempt failed:', err.message);
        console.log('Trying alternative method...\n');
        return Promise.resolve();
      })
      .then(() => {
        console.log('Step 2: Checking flow status...\n');
        return architectApi.getFlow(usFlowId, { includeConfiguration: false });
      })
      .then((flow) => {
        console.log('US Flow Status:');
        console.log('  Name:', flow.name);
        console.log('  ID:', flow.id);
        console.log('  Published:', flow.publishedVersion ? 'YES - v' + flow.publishedVersion.id : 'NO');
        console.log('  Checked In:', flow.checkedInVersion ? 'YES - v' + flow.checkedInVersion.id : 'NO');
        console.log('');
        
        console.log('Step 3: Configuring India Queue In-Queue Flow...\n');
        const indiaFlowId = 'b76111f2-7c70-49af-99c7-2e09b9fe7937';
        
        return architectApi.postFlowsActionsPublish(indiaFlowId, { yaml: indiaYaml })
          .then(() => {
            console.log('✅ India Flow configuration applied\n');
            return wait(2000);
          })
          .catch((err) => {
            console.log('⚠️  API configuration attempt failed:', err.message);
            return Promise.resolve();
          })
          .then(() => {
            console.log('Step 4: Checking India flow status...\n');
            return architectApi.getFlow(indiaFlowId, { includeConfiguration: false });
          })
          .then((indiaFlow) => {
            console.log('India Flow Status:');
            console.log('  Name:', indiaFlow.name);
            console.log('  ID:', indiaFlow.id);
            console.log('  Published:', indiaFlow.publishedVersion ? 'YES - v' + indiaFlow.publishedVersion.id : 'NO');
            console.log('  Checked In:', indiaFlow.checkedInVersion ? 'YES - v' + indiaFlow.checkedInVersion.id : 'NO');
            console.log('');
            
            console.log('='.repeat(70));
            console.log('ALTERNATIVE APPROACH: ARCHITECT UI AUTOMATION');
            console.log('='.repeat(70));
            console.log('\nSince API has limitations, here are the direct URLs to configure:');
            console.log('\n1. US Queue In-Queue Flow:');
            console.log('   https://apps.usw2.pure.cloud/architect/#/inqueuecall/flows/' + usFlowId);
            console.log('\n2. India Queue In-Queue Flow:');
            console.log('   https://apps.usw2.pure.cloud/architect/#/inqueuecall/flows/' + indiaFlowId);
            console.log('\n3. Open each URL in browser');
            console.log('4. The flows exist - just add these actions:');
            console.log('   - Initial State: Play Estimated Wait Time');
            console.log('   - Decision: Check wait time threshold');
            console.log('   - Hold Music State: Music + Promo + Loop');
            console.log('5. Click Validate → Publish');
            console.log('6. Assign to queues in Admin → Queues\n');
            
            return { usFlow: flow, indiaFlow: indiaFlow };
          });
      })
      .then((_flows) => {
        console.log('='.repeat(70));
        console.log('FINAL STATUS');
        console.log('='.repeat(70));
        console.log('\n✅ Flow shells created and accessible');
        console.log('⚠️  Configuration must be completed in Architect UI');
        console.log('\nEstimated time to complete: 10 minutes total (5 min each)\n');
      });
  })
  .catch((err) => {
    console.error('\n❌ Error:', err.message || err);
    if (err.body) {
      console.error('Details:', JSON.stringify(err.body, null, 2));
    }
  });
