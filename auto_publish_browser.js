/* global document */
const platformClient = require('purecloud-platform-client-v2');
const puppeteer = require('puppeteer');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

console.log('🤖 AUTOMATED BROWSER PUBLISHING\n');
console.log('This will use browser automation to publish flows automatically\n');

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Step 1: Get OAuth token
const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

console.log('Step 1: Authenticating with Genesys Cloud API...');

client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET)
  .then(() => {
    console.log('✅ Authenticated\n');

    const architectApi = new platformClient.ArchitectApi();
    const accessToken = client.authData.accessToken;

    console.log('Step 2: Getting flow information...');

    // First, let's create a simple working flow via import
    return architectApi.getFlows({
      name: 'Sample_Flow_Auto',
      type: 'INBOUNDCALL'
    })
    .then((flows) => {
      if (!flows.entities || flows.entities.length === 0) {
        console.log('Creating new sample flow...');

        // Create via YAML import which gives us a configured flow
        const simpleYaml = `inboundCall:
  name: Sample_Flow_Auto
  division: Home
  description: Auto-published sample flow

  startUpRef: "/inboundCall/states/state[Initial]"

  defaultLanguage: en-us
  supportedLanguages:
    en-us:
      defaultLanguageSkill:
        noValue: true
      language: en-us

  settingsInboundCallFlow:
    settingsErrorHandling:
      errorHandling:
        disconnect:
          none: true

  initialGreeting:
    tts:
      en-us: Thank you for calling.

  states:
    state[Initial]:
      name: Initial
      actions:
        - disconnect:
            name: End Call`;

        // Create the flow
        return architectApi.postFlows({
          name: 'Sample_Flow_Auto',
          description: 'Sample flow for auto-publish',
          type: 'INBOUNDCALL',
          division: { name: 'Home' }
        })
        .then((newFlow) => {
          console.log(`✅ Flow created: ${newFlow.id}\n`);

          // Apply configuration
          return architectApi.postFlowsActionsPublish(newFlow.id, { yaml: simpleYaml })
            .then(() => {
              console.log('✅ Configuration applied\n');
              return wait(2000).then(() => newFlow.id);
            })
            .catch(() => {
              console.log('⚠️  Config may not be applied, continuing...\n');
              return newFlow.id;
            });
        });
      } else {
        console.log(`✅ Found existing flow: ${flows.entities[0].id}\n`);
        return flows.entities[0].id;
      }
    })
    .then((flowId) => {
      console.log('Step 3: Launching automated browser...\n');

      // Launch Puppeteer browser
      return puppeteer.launch({
        headless: false, // Show browser so you can see what's happening
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process'
        ]
      })
      .then((browser) => {
        console.log('✅ Browser launched\n');

        return browser.newPage()
          .then((page) => {
            console.log('Step 4: Setting up authentication...\n');

            // Set up authentication by injecting token
            return page.evaluateOnNewDocument((token, region) => {
              localStorage.setItem('gc_region', region);
              localStorage.setItem('gc_access_token', token);
            }, accessToken, REGION)
            .then(() => {
              console.log('✅ Authentication configured\n');

              console.log('Step 5: Navigating to Architect...\n');

              const architectUrl = `https://apps.${REGION}/architect/#/flows/inboundCall/${flowId}`;
              console.log(`Opening: ${architectUrl}\n`);

              return page.goto(architectUrl, {
                waitUntil: 'networkidle2',
                timeout: 60000
              });
            })
            .then(() => {
              console.log('✅ Page loaded\n');

              console.log('Step 6: Waiting for flow to load...\n');
              return wait(5000);
            })
            .then(() => {
              console.log('Step 7: Looking for Publish button...\n');

              // Try to find and click Publish button
              return page.evaluate(() => {
                // Look for Publish button with various selectors
                const publishSelectors = [
                  'button[title="Publish"]',
                  'button:contains("Publish")',
                  'button[aria-label="Publish"]',
                  '.publish-button',
                  '[data-test-id="publish-button"]'
                ];

                for (const selector of publishSelectors) {
                  try {
  
                  const button = document.querySelector(selector);
                    if (button && !button.disabled) {
                      button.click();
                      return { success: true, method: selector };
                    }
                  } catch (_e) { /* ignore */ }
                }

                // Also try finding by text content

                const buttons = Array.from(document.querySelectorAll('button'));
                const publishBtn = buttons.find(btn =>
                  btn.textContent.trim().toLowerCase() === 'publish' ||
                  btn.textContent.trim().toLowerCase().includes('publish')
                );

                if (publishBtn && !publishBtn.disabled) {
                  publishBtn.click();
                  return { success: true, method: 'text-search' };
                }

                return { success: false, error: 'Publish button not found' };
              })
              .then((result) => {
                if (result.success) {
                  console.log(`✅ Publish button clicked! (method: ${result.method})\n`);

                  console.log('Step 8: Waiting for publish to complete...\n');
                  return wait(5000);
                } else {
                  console.log(`⚠️  ${result.error}\n`);
                  console.log('The flow may need manual validation first.\n');
                  return wait(2000);
                }
              });
            })
            .then(() => {
              console.log('Step 9: Verifying publish status via API...\n');

              return architectApi.getFlow(flowId, { includeConfiguration: false });
            })
            .then((flow) => {
              console.log('='.repeat(60));
              console.log('FINAL RESULT');
              console.log('='.repeat(60) + '\n');

              if (flow.publishedVersion) {
                console.log('🎉 SUCCESS! FLOW IS PUBLISHED!\n');
                console.log(`Flow Name: ${flow.name}`);
                console.log(`Flow ID: ${flowId}`);
                console.log(`Published Version: ${flow.publishedVersion.version}`);
                console.log(`\nFlow URL: https://apps.${REGION}/architect/#/flows/inboundCall/${flowId}\n`);
                console.log('✅ Automatic publishing completed successfully!\n');
              } else {
                console.log('⚠️  Flow not yet published\n');
                console.log('The browser is still open. You can see the Architect UI.');
                console.log('The flow may need validation before publishing.');
                console.log('Click the Validate button, then Publish button in the browser.\n');
              }

              console.log('Browser will remain open for 30 seconds...');
              return wait(30000);
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
    });
  })
  .catch((err) => {
    console.error('\n❌ Error:\n');
    console.error(err.message || err);
    if (err.stack) {
      console.error('\nStack:', err.stack);
    }
  });
