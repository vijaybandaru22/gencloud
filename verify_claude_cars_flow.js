const https = require('https');

const config = {
  clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
  clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
  region: 'usw2.pure.cloud'
};

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        } catch (_e) {
          resolve({ statusCode: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getToken() {
  const postData = 'grant_type=client_credentials';
  const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  
  const options = {
    hostname: `login.${config.region}`,
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${auth}`,
      'Content-Length': postData.length
    }
  };
  
  const result = await makeRequest(options, postData);
  if (result.statusCode === 200) {
    return result.data.access_token;
  }
  throw new Error(`Authentication failed: ${result.statusCode}`);
}

async function verifyFlow() {
  try {
    console.log('========================================');
    console.log('  Verifying Claude_cars Flow');
    console.log('========================================\n');
    
    console.log('Step 1: Authenticating with Genesys Cloud...');
    const token = await getToken();
    console.log('✓ Authentication successful\n');
    
    console.log('Step 2: Searching for Claude_cars flow...');
    const options = {
      hostname: `api.${config.region}`,
      path: '/api/v2/flows?type=inboundcall&pageSize=100',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    
    const result = await makeRequest(options);
    
    if (result.statusCode === 200) {
      const flows = result.data.entities || [];
      console.log(`✓ Retrieved ${flows.length} inbound call flows\n`);
      
      // Find Claude_cars flow
      const claudeCarsFlow = flows.find(f => f.name === 'Claude_cars');
      
      if (claudeCarsFlow) {
        console.log('========================================');
        console.log('  ✓✓✓ FLOW FOUND! ✓✓✓');
        console.log('========================================\n');
        console.log('Flow Details:');
        console.log(`  Name:              ${claudeCarsFlow.name}`);
        console.log(`  ID:                ${claudeCarsFlow.id}`);
        console.log(`  Type:              ${claudeCarsFlow.type}`);
        console.log(`  Division:          ${claudeCarsFlow.division?.name || 'Home'}`);
        console.log(`  Created:           ${claudeCarsFlow.dateCreated || 'N/A'}`);
        console.log(`  Modified:          ${claudeCarsFlow.dateModified || 'N/A'}`);
        console.log(`  Version:           ${claudeCarsFlow.version || 'N/A'}`);
        console.log(`  Published:         ${claudeCarsFlow.publishedVersion?.version || 'Not published yet'}`);
        console.log(`  Checked Out:       ${claudeCarsFlow.checkedOutVersion?.version || 'No'}`);
        console.log(`  Description:       ${claudeCarsFlow.description || 'None'}`);
        console.log(`  Created By:        ${claudeCarsFlow.createdBy?.name || 'N/A'}`);
        console.log(`  Modified By:       ${claudeCarsFlow.modifiedBy?.name || 'N/A'}`);
        
        console.log('\n========================================');
        console.log('  Direct Edit Link:');
        console.log('========================================');
        console.log(`https://apps.${config.region}/architect/#/flows/inboundcall/${claudeCarsFlow.id}`);
        
        console.log('\n========================================');
        console.log('  Status Summary:');
        console.log('========================================');
        if (claudeCarsFlow.publishedVersion?.version) {
          console.log('✓ Flow is PUBLISHED and active');
          console.log(`✓ Published version: ${claudeCarsFlow.publishedVersion.version}`);
        } else {
          console.log('⚠ Flow exists but is NOT YET PUBLISHED');
          console.log('⚠ You need to configure and publish it in Architect UI');
        }
        
        console.log('\n========================================');
        console.log('  Next Steps:');
        console.log('========================================');
        if (!claudeCarsFlow.publishedVersion?.version) {
          console.log('1. Open the flow in Architect (use link above)');
          console.log('2. Configure all flow logic as per requirements');
          console.log('3. Save the flow');
          console.log('4. Click Publish button');
          console.log('5. Test with a DID number');
        } else {
          console.log('✓ Flow is ready to use!');
          console.log('- Assign a DID number to this flow');
          console.log('- Ensure US_Queue and India_Queue exist');
          console.log('- Test the call flow');
        }
        
        // Get more detailed flow info
        console.log('\n========================================');
        console.log('  Fetching Detailed Configuration...');
        console.log('========================================');
        
        const detailOptions = {
          hostname: `api.${config.region}`,
          path: `/api/v2/flows/${claudeCarsFlow.id}`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        
        const detailResult = await makeRequest(detailOptions);
        if (detailResult.statusCode === 200) {
          const detail = detailResult.data;
          console.log('\nSupported Languages:');
          if (detail.supportedLanguages) {
            Object.keys(detail.supportedLanguages).forEach(lang => {
              console.log(`  - ${lang}`);
            });
          }
        }
        
      } else {
        console.log('========================================');
        console.log('  ✗ FLOW NOT FOUND');
        console.log('========================================\n');
        console.log('The Claude_cars flow does not exist yet.');
        console.log('You need to create it first.\n');
        console.log('Available flows:');
        flows.slice(0, 10).forEach(f => {
          console.log(`  - ${f.name} (${f.id})`);
        });
      }
    } else {
      console.log(`✗ Failed to retrieve flows: ${result.statusCode}`);
      console.log('Response:', JSON.stringify(result.data, null, 2));
    }
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nPossible issues:');
    console.error('- Invalid credentials');
    console.error('- Network connectivity');
    console.error('- Insufficient permissions');
  }
}

verifyFlow();
