const https = require('https');

const config = {
  clientId: 'c710e83c-7d3d-4910-bdf5-b6d4f634c959',
  clientSecret: '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM',
  region: 'usw2.pure.cloud'
};

// Get OAuth token
function getToken() {
  return new Promise((resolve, reject) => {
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
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data).access_token);
        } else {
          reject(new Error(`Token request failed: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Create the flow
async function createFlow() {
  try {
    console.log('Getting OAuth token...');
    const token = await getToken();
    console.log('Token obtained successfully');
    
    const flowDefinition = {
      name: 'Claude_cars',
      description: 'Claude Cars inbound call flow with language selection, hold music, AI announcement, and geographic routing',
      type: 'INBOUNDCALL',
      division: {
        id: '10cf32a1-d7b9-4ce5-888b-5c357f6ceede'
      }
    };
    
    const postData = JSON.stringify(flowDefinition);
    
    const options = {
      hostname: `api.${config.region}`,
      path: '/api/v2/flows',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': postData.length
      }
    };
    
    console.log('Creating flow...');
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        const response = JSON.parse(data);
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('\n✓ Flow created successfully!');
          console.log(`Flow ID: ${response.id}`);
          console.log(`Flow Name: ${response.name}`);
          console.log(`\nNext Steps:`);
          console.log(`1. Open Genesys Cloud Architect`);
          console.log(`2. Navigate to Inbound Call Flows`);
          console.log(`3. Find and open flow: Claude_cars`);
          console.log(`4. Configure the flow in the Architect UI with:`);
          console.log(`   - Language selection (English/Spanish)`);
          console.log(`   - 30 second hold music`);
          console.log(`   - AI car announcement message`);
          console.log(`   - Department menu (Sales, Service, New Models)`);
          console.log(`   - Geographic routing (US_Queue for +1, India_Queue for +91)`);
          console.log(`   - Script data: Queue Name, Caller Number, Caller Location, Department`);
          console.log(`5. Publish the flow`);
        } else {
          console.error('\n✗ Flow creation failed');
          console.error('Response:', JSON.stringify(response, null, 2));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error creating flow:', error.message);
    });
    
    req.write(postData);
    req.end();
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createFlow();
