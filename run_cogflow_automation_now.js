/**
 * COGflow - Automated Browser Creator with Interactive Credentials
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getCredentials() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   COGflow - Browser Automation                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const email = await question('Enter your Zoom admin email: ');
  const password = await question('Enter your Zoom admin password: ');

  rl.close();

  return { email: email.trim(), password: password.trim() };
}

async function runAutomation(credentials) {
  console.log('\n🚀 Starting browser automation...\n');

  try {
    // Try to load puppeteer
    const puppeteer = require('puppeteer');

    console.log('✅ Puppeteer loaded\n');
    console.log('🌐 Launching Chrome browser...\n');

    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized', '--no-sandbox']
    });

    const page = await browser.newPage();

    console.log('✅ Browser launched\n');
    console.log('🔐 Logging into Zoom...\n');

    // Navigate to Zoom login
    await page.goto('https://zoom.us/signin', { waitUntil: 'networkidle2' });

    // Wait a bit for page to load
    await page.waitForTimeout(2000);

    // Try to find and fill email
    try {
      await page.waitForSelector('input[type="email"], input[name="email"], input#email', { timeout: 5000 });
      await page.type('input[type="email"], input[name="email"], input#email', credentials.email, { delay: 100 });
      console.log('   ✓ Email entered');
    } catch (_e) {
      console.log('   ⚠️  Could not auto-fill email, please enter manually');
    }

    await page.waitForTimeout(1000);

    // Click sign in or continue button
    try {
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && (text.toLowerCase().includes('sign in') || text.toLowerCase().includes('continue'))) {
          await button.click();
          console.log('   ✓ Clicked Sign In');
          break;
        }
      }
    } catch (_e) {
      console.log('   ⚠️  Please click Sign In button manually');
    }

    await page.waitForTimeout(2000);

    // Try to fill password
    try {
      await page.waitForSelector('input[type="password"]', { timeout: 5000 });
      await page.type('input[type="password"]', credentials.password, { delay: 100 });
      console.log('   ✓ Password entered');
    } catch (_e) {
      console.log('   ⚠️  Could not auto-fill password, please enter manually');
    }

    await page.waitForTimeout(1000);

    // Click final sign in
    try {
      const buttons = await page.$$('button[type="submit"], button.btn-login');
      if (buttons.length > 0) {
        await buttons[0].click();
        console.log('   ✓ Submitted login form');
      }
    } catch (_e) {
      console.log('   ⚠️  Please click Sign In button manually');
    }

    console.log('\n⏳ Waiting for login to complete...\n');
    await page.waitForTimeout(5000);

    console.log('✅ Login process completed\n');
    console.log('📍 Navigating to Flow Builder...\n');

    // Navigate to Contact Center Flows
    await page.goto('https://zoom.us/admin/contact-center/flows', { waitUntil: 'networkidle2' });

    console.log('✅ Navigated to Flow Builder\n');
    console.log('📝 Attempting to create new flow...\n');

    await page.waitForTimeout(3000);

    // Try to click Create Flow button
    try {
      const buttons = await page.$$('button, a');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.toLowerCase().includes('create')) {
          await button.click();
          console.log('   ✓ Clicked Create Flow button');
          break;
        }
      }
    } catch (_e) {
      console.log('   ⚠️  Please click "Create Flow" button manually');
    }

    await page.waitForTimeout(3000);

    // Try to fill flow name
    try {
      const inputs = await page.$$('input[type="text"]');
      if (inputs.length > 0) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].type('COG33', { delay: 100 });
        console.log('   ✓ Entered flow name: COG33');
      }
    } catch (_e) {
      console.log('   ⚠️  Please enter flow name "COG33" manually');
    }

    await page.waitForTimeout(1000);

    // Try to select Voice channel
    try {
      const radios = await page.$$('input[type="radio"]');
      for (const radio of radios) {
        const value = await page.evaluate(el => el.value, radio);
        if (value === 'voice') {
          await radio.click();
          console.log('   ✓ Selected Voice channel');
          break;
        }
      }
    } catch (_e) {
      console.log('   ⚠️  Please select "Voice" channel manually');
    }

    await page.waitForTimeout(1000);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║   MANUAL FLOW BUILDING REQUIRED                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    console.log('The browser is now open and positioned at the flow builder.\n');
    console.log('Please complete these steps manually:\n');
    console.log('1. Click "Create" or "Submit" to create the flow');
    console.log('2. Build the flow nodes following the guide:');
    console.log('   - Open COGflow_Complete_Guide.html for instructions');
    console.log('3. Save and Publish the flow when done');
    console.log('4. Assign phone number (970) 351-5311 to flow COG33\n');

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('The browser will remain open for you to work.\n');
    console.log('Press Ctrl+C in this terminal when you\'re finished.\n');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Keep the browser open indefinitely
    await new Promise(() => {});

  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.error('\n❌ Puppeteer is not installed!\n');
      console.log('Installing Puppeteer now...\n');

      const { exec } = require('child_process');
      const { promisify } = require('util');
      const execAsync = promisify(exec);

      try {
        console.log('Running: npm install puppeteer --legacy-peer-deps\n');
        await execAsync('npm install puppeteer --legacy-peer-deps');
        console.log('\n✅ Puppeteer installed successfully!\n');
        console.log('Please run this script again:\n');
        console.log('  node run_cogflow_automation_now.js\n');
      } catch (_installError) {
        console.error('❌ Failed to install Puppeteer automatically\n');
        console.log('Please install manually:\n');
        console.log('  npm install puppeteer\n');
        console.log('Then run this script again.\n');
      }
    } else {
      console.error('\n❌ Error:', error.message);
      console.error('\nFull error:', error);
    }
  }
}

async function main() {
  const credentials = await getCredentials();

  if (!credentials.email || !credentials.password) {
    console.log('\n❌ Credentials are required. Exiting...\n');
    process.exit(1);
  }

  await runAutomation(credentials);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
