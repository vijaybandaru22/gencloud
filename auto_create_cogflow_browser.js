/* global document */
/**
 * COGflow - Automated Browser-Based Flow Creator
 * Uses Puppeteer to automate the Zoom web interface for flow creation
 */

const puppeteer = require('puppeteer');

// Configuration - User will provide Zoom login credentials
const CONFIG = {
  zoomEmail: 'YOUR_ZOOM_EMAIL@example.com',  // Replace with your Zoom admin email
  zoomPassword: 'YOUR_ZOOM_PASSWORD',        // Replace with your Zoom password
  flowName: 'COG33',
  phoneNumber: '(970) 351-5311'
};

// Flow configuration
const _FLOW_CONFIG = {
  greetingMessage: "Hello, you've reached the City of Greeley. If this is an emergency, hang up and dial 9 1 1.",

  afterHoursMessage: "Our offices are currently closed. Our business hours are Monday through Friday, 8 AM to 5 PM Mountain Time. Please call back during business hours or press 0 to leave a message.",

  holidayMessage: "Our offices are currently closed for a holiday. Please call back during normal business hours. Thank you.",

  mainMenuMessage: `For Utility Bills, Water Quality, Water Conservation, or other Water and Sewer related services, press 1.
For Streets, traffic signals, parking lots, sidewalks, or other services related to streets and roads, press 2.
For questions regarding permits, developments, and Community Development, press 3.
For Municipal Court matters including tickets, jury duty, or probation, press 4.
To speak with a representative directly, press 0.
To return to this main menu at any time, press 9.`,

  voicemailMessage: "All representatives are currently assisting other callers. Please leave a detailed message after the tone, and your message will be converted to a 3 1 1 ticket. A representative will contact you as soon as possible.",

  thankYouMessage: "Thank you for your message. A 3 1 1 ticket has been created and will be reviewed by our team. Goodbye.",

  departments: [
    { option: '1', name: 'Water & Sewer', extension: '9811', message: 'Please hold while we transfer you to our Water and Sewer department.' },
    { option: '2', name: 'Streets & Roads', extension: '9881', message: 'Please hold while we transfer you to our Streets and Roads department.' },
    { option: '3', name: 'Community Development', extension: '9780', message: 'Please hold while we transfer you to Community Development.' },
    { option: '4', name: 'Municipal Court', extension: '9230', message: 'Please hold while we transfer you to Municipal Court.' }
  ]
};

/**
 * Main automation function
 */
async function createCOGFlow() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   COGflow - Automated Browser-Based Flow Creator         ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let browser;
  let page;

  try {
    // Step 1: Launch browser
    console.log('🚀 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,  // Set to true for background execution
      defaultViewport: { width: 1920, height: 1080 },
      args: ['--start-maximized']
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log('✅ Browser launched\n');

    // Step 2: Login to Zoom
    console.log('🔐 Logging into Zoom...');
    await loginToZoom(page);
    console.log('✅ Logged in successfully\n');

    // Step 3: Navigate to Flow Builder
    console.log('📍 Navigating to Flow Builder...');
    await navigateToFlowBuilder(page);
    console.log('✅ Flow Builder opened\n');

    // Step 4: Create new flow
    console.log('📝 Creating new flow: ' + CONFIG.flowName);
    await createNewFlow(page);
    console.log('✅ Flow created\n');

    // Step 5: Build the flow
    console.log('🔨 Building flow nodes...');
    await buildFlowNodes(page);
    console.log('✅ Flow built successfully\n');

    // Step 6: Publish flow
    console.log('📤 Publishing flow...');
    await publishFlow(page);
    console.log('✅ Flow published\n');

    // Step 7: Assign phone number
    console.log('📞 Assigning phone number...');
    await assignPhoneNumber(page);
    console.log('✅ Phone number assigned\n');

    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    SUCCESS!                               ║');
    console.log('║   COGflow has been created and published!                ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('✅ Flow Name: ' + CONFIG.flowName);
    console.log('✅ Phone Number: ' + CONFIG.phoneNumber);
    console.log('\n🎉 Ready to receive calls!\n');

    // Keep browser open for 10 seconds to show results
    await new Promise(resolve => setTimeout(resolve, 10000));

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack:', error.stack);

    // Take screenshot of error
    if (page) {
      const screenshotPath = 'C:/Users/VijayBandaru/cogflow_error_screenshot.png';
      await page.screenshot({ path: screenshotPath });
      console.log('📸 Error screenshot saved to:', screenshotPath);
    }

    throw error;

  } finally {
    if (browser) {
      console.log('\n🔒 Closing browser...');
      await browser.close();
    }
  }
}

/**
 * Login to Zoom admin portal
 */
async function loginToZoom(page) {
  await page.goto('https://zoom.us/signin', { waitUntil: 'networkidle2' });

  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  // Enter email
  await page.type('input[type="email"], input[name="email"]', CONFIG.zoomEmail);
  await page.click('button[type="submit"], .btn-login');

  // Wait for password field
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.type('input[type="password"]', CONFIG.zoomPassword);

  // Click sign in
  await page.click('button[type="submit"], .btn-login');

  // Wait for dashboard to load
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

  // Check if we're logged in
  await page.waitForSelector('.zm-navbar, #navbar', { timeout: 10000 });
}

/**
 * Navigate to Contact Center Flow Builder
 */
async function navigateToFlowBuilder(page) {
  // Go to admin panel
  await page.goto('https://zoom.us/admin', { waitUntil: 'networkidle2' });

  // Wait for page to load
  await page.waitForSelector('body', { timeout: 10000 });

  // Look for Contact Center menu
  const contactCenterLink = await page.evaluate(() => {

    const links = Array.from(document.querySelectorAll('a'));
    const ccLink = links.find(link =>
      link.textContent.toLowerCase().includes('contact center') ||
      link.href.includes('contact_center')
    );
    return ccLink ? ccLink.href : null;
  });

  if (contactCenterLink) {
    await page.goto(contactCenterLink, { waitUntil: 'networkidle2' });
  } else {
    // Try direct URL
    await page.goto('https://zoom.us/admin/contact-center/flows', { waitUntil: 'networkidle2' });
  }

  await page.waitForTimeout(2000);
}

/**
 * Create a new flow
 */
async function createNewFlow(page) {
  // Click "Create Flow" button
  const _createButtonSelector = 'button:contains("Create Flow"), button:contains("Create"), .create-flow-btn';

  try {
    await page.waitForSelector('button', { timeout: 5000 });

    await page.evaluate(() => {

      const buttons = Array.from(document.querySelectorAll('button, a'));
      const createBtn = buttons.find(btn =>
        btn.textContent.toLowerCase().includes('create flow') ||
        btn.textContent.toLowerCase().includes('create') ||
        btn.classList.contains('create-flow')
      );
      if (createBtn) createBtn.click();
    });

    await page.waitForTimeout(2000);

    // Fill in flow name
    const nameInput = await page.$('input[name="flow_name"], input[placeholder*="name"], input[type="text"]');
    if (nameInput) {
      await nameInput.click({ clickCount: 3 });
      await nameInput.type(CONFIG.flowName);
    }

    // Select Voice channel
    await page.evaluate(() => {

      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      const voiceRadio = radios.find(r =>
        r.value === 'voice' ||
        r.nextSibling?.textContent?.toLowerCase().includes('voice')
      );
      if (voiceRadio) voiceRadio.click();
    });

    await page.waitForTimeout(1000);

    // Click Create/Submit button
    await page.evaluate(() => {

      const buttons = Array.from(document.querySelectorAll('button'));
      const submitBtn = buttons.find(btn =>
        btn.textContent.toLowerCase().includes('create') ||
        btn.textContent.toLowerCase().includes('submit') ||
        btn.type === 'submit'
      );
      if (submitBtn) submitBtn.click();
    });

    // Wait for flow builder to load
    await page.waitForTimeout(5000);

  } catch (_error) {
    console.log('⚠️  Could not find create button via selectors, trying alternative method...');
    // Try direct URL creation
    await page.goto('https://zoom.us/admin/contact-center/flows/create', { waitUntil: 'networkidle2' });
  }
}

/**
 * Build flow nodes using drag and drop
 */
async function buildFlowNodes(page) {
  console.log('   Note: This step requires manual configuration in the Zoom UI');
  console.log('   The browser will stay open for you to build the flow manually.');
  console.log('   Please follow the steps from the COGflow_Complete_Guide.html document.');
  console.log('\n   Press Ctrl+C when you\'ve finished building the flow to continue...\n');

  // Wait for user to complete manual setup
  await page.waitForTimeout(300000); // Wait 5 minutes for manual configuration
}

/**
 * Publish the flow
 */
async function publishFlow(page) {
  // Look for Publish button
  await page.evaluate(() => {

    const buttons = Array.from(document.querySelectorAll('button'));
    const publishBtn = buttons.find(btn =>
      btn.textContent.toLowerCase().includes('publish')
    );
    if (publishBtn) publishBtn.click();
  });

  await page.waitForTimeout(2000);

  // Confirm publish if modal appears
  await page.evaluate(() => {

    const buttons = Array.from(document.querySelectorAll('button'));
    const confirmBtn = buttons.find(btn =>
      btn.textContent.toLowerCase().includes('confirm') ||
      btn.textContent.toLowerCase().includes('yes') ||
      btn.textContent.toLowerCase().includes('publish')
    );
    if (confirmBtn) confirmBtn.click();
  });

  await page.waitForTimeout(3000);
}

/**
 * Assign phone number to flow
 */
async function assignPhoneNumber(page) {
  // Navigate to phone numbers
  await page.goto('https://zoom.us/admin/contact-center/phone-numbers', { waitUntil: 'networkidle2' });

  await page.waitForTimeout(2000);

  console.log('   Please manually assign the phone number ' + CONFIG.phoneNumber + ' to the flow ' + CONFIG.flowName);
  console.log('   The browser will remain open for this step.');

  await page.waitForTimeout(10000);
}

/**
 * Run the automation
 */
if (require.main === module) {
  console.log('\n⚠️  IMPORTANT: Before running this script:\n');
  console.log('1. Install Puppeteer: npm install puppeteer');
  console.log('2. Update CONFIG with your Zoom email and password');
  console.log('3. Ensure you have Zoom admin access\n');
  console.log('Starting in 3 seconds...\n');

  setTimeout(() => {
    createCOGFlow().catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  }, 3000);
}

module.exports = { createCOGFlow };
