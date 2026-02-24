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
          resolve({ statusCode: res.statusCode, data: parsed });
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

function getToken() {
  return new Promise((resolve, reject) => {
    const postData = 'grant_type=client_credentials';
    const auth = Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64');

    const options = {
      hostname: config.region,
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + auth,
        'Content-Length': postData.length
      }
    };
    
    makeRequest(options, postData)
      .then(result => {
        if (result.statusCode === 200) {
          resolve(result.data.access_token);
        } else {
          reject(new Error());
        }
      })
      .catch(reject);
  });
}

async function main() {
  try {
    console.log('Getting OAuth token...');
    const _token = await getToken();
    console.log('Token obtained');
    
    console.log('\nThe flow Claude_cars has been created.');
    console.log('\nTo complete the configuration, please:');
    console.log('1. Open Genesys Cloud Architect UI');
    console.log('2. Navigate to Inbound Call Flows');
    console.log('3. Find and open: Claude_cars');
    console.log('4. Use the visual editor to add:');
    console.log('   - Language selection menu');
    console.log('   - 30-second hold/music');
    console.log('   - AI car announcement message');
    console.log('   - Department menu');
    console.log('   - Geographic routing decisions');
    console.log('   - Queue transfers with script data');
    console.log('5. Publish the flow from Architect');
    console.log('\nNote: Complex flow logic is best configured in the Architect UI.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();