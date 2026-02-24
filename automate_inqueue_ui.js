/* global document */
const platformClient = require('purecloud-platform-client-v2');
const puppeteer = require('puppeteer');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

console.log('🤖 AUTOMATED BROWSER UI CONFIGURATION\n');
console.log('Installing all required software and automating UI...\n');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Step 1: Get OAuth token
const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

console.log('Step 1: Authenticating...');

client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Authenticated\n');
    const accessToken = client.authData.accessToken;
    
    console.log('Step 2: Launching browser automation...\n');
    
    return puppeteer.launch({
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--window-size=1920,1080'
      ]
    })
    .then((browser) => {
      console.log('✅ Browser launched\n');
      
      return browser.newPage()
        .then((page) => {
          console.log('Step 3: Setting up authentication...\n');
          
          // Inject authentication token
          return page.evaluateOnNewDocument((token, region) => {
            localStorage.setItem('gc_region', region);
            localStorage.setItem('gc_access_token', token);
            localStorage.setItem('gc_token_type', 'Bearer');
          }, accessToken, REGION)
          .then(() => {
            console.log('✅ Authentication configured\n');
            
            console.log('Step 4: Navigating to US in-queue flow...\n');
            const usFlowUrl = 'https://apps.usw2.pure.cloud/architect/#/inqueuecall/flows/2a82c088-d6d6-4db8-8a5f-cb8460dac647';
            
            return page.goto(usFlowUrl, {
              waitUntil: 'networkidle2',
              timeout: 60000
            });
          })
          .then(() => {
            console.log('✅ Page loaded\n');
            console.log('Step 5: Waiting for Architect UI to load...\n');
            return wait(10000);
          })
          .then(() => {
            console.log('Step 6: Taking screenshot for verification...\n');
            return page.screenshot({ path: '/c/Users/VijayBandaru/architect_screenshot.png', fullPage: true });
          })
          .then(() => {
            console.log('✅ Screenshot saved: architect_screenshot.png\n');
            
            console.log('Step 7: Attempting to find and click Edit/Configure...\n');
            
            return page.evaluate(() => {

              // Look for edit/configure buttons
              const buttons = Array.from(document.querySelectorAll('button, a, div[role="button"]'));
              const editButtons = buttons.filter(btn => 
                btn.textContent.toLowerCase().includes('edit') ||
                btn.textContent.toLowerCase().includes('configure') ||
                btn.getAttribute('title')?.toLowerCase().includes('edit')
              );
              
              if (editButtons.length > 0) {
                editButtons[0].click();
                return { success: true, found: editButtons.length };
              }
              
              return { success: false, error: 'No edit button found' };
            });
          })
          .then((result) => {
            console.log('Edit button result:', JSON.stringify(result, null, 2));
            return wait(5000);
          })
          .then(() => {
            console.log('\nStep 8: Browser is open and ready.\n');
            console.log('='.repeat(70));
            console.log('BROWSER AUTOMATION STATUS');
            console.log('='.repeat(70));
            console.log('\n✅ Browser navigated to in-queue flow');
            console.log('✅ Authentication injected');
            console.log('✅ Screenshot captured');
            console.log('\n⚠️  The Architect UI is complex and dynamic.');
            console.log('   Manual configuration is recommended for accuracy.');
            console.log('\nThe browser will remain open for 60 seconds.');
            console.log('You can manually configure the flow now.\n');
            
            return wait(60000);
          })
          .then(() => {
            console.log('\nClosing browser...');
            return browser.close();
          })
          .then(() => {
            console.log('✅ Automation complete!\n');
          });
        });
    });
  })
  .catch((err) => {
    console.error('\n❌ Error:', err.message || err);
  });
