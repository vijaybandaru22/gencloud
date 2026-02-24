/**
 * COGflow - Interactive Flow Creator
 * Guides you through creating the flow step-by-step
 */

const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   COGflow - Interactive Setup Wizard                     ║');
  console.log('║   City of Greeley Call Flow Creator                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('This wizard will guide you through creating the COGflow.\n');

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('⚠️  IMPORTANT NOTICE\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('Zoom Contact Center does NOT support automated flow creation');
  console.log('via API or command-line tools.\n');
  console.log('Flows MUST be created manually using the Zoom web interface.\n');
  console.log('═══════════════════════════════════════════════════════════\n\n');

  const choice = await question('Would you like to:\n  1. View step-by-step manual instructions\n  2. Open Zoom admin in browser\n  3. Export flow configuration for reference\n  4. Exit\n\nEnter choice (1-4): ');

  switch(choice.trim()) {
    case '1':
      await showInstructions();
      break;
    case '2':
      await openZoomAdmin();
      break;
    case '3':
      await exportConfig();
      break;
    case '4':
      console.log('\nExiting...\n');
      process.exit(0);
      // falls through
    default:
      console.log('\nInvalid choice. Exiting...\n');
      process.exit(1);
  }

  rl.close();
}

async function showInstructions() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   COGflow - Step-by-Step Manual Instructions             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('STEP 1: LOGIN TO ZOOM\n');
  console.log('  1. Open browser and go to: https://zoom.us/admin');
  console.log('  2. Login with your Zoom admin credentials\n');

  console.log('STEP 2: NAVIGATE TO FLOW BUILDER\n');
  console.log('  1. Click on "Contact Center" in the left menu');
  console.log('  2. Click on "Flows"');
  console.log('  3. Click "+ Create Flow" button\n');

  console.log('STEP 3: CREATE FLOW\n');
  console.log('  1. Flow Name: COG33');
  console.log('  2. Description: City of Greeley main line (970) 351-5311');
  console.log('  3. Channel: Voice');
  console.log('  4. Click "Create"\n');

  console.log('STEP 4: BUILD FLOW NODES\n');
  console.log('  Add the following nodes in order:\n');

  console.log('  NODE 1: Play Message (Greeting)');
  console.log('    Message: "Hello, you\'ve reached the City of Greeley.');
  console.log('             If this is an emergency, hang up and dial 9 1 1."\n');

  console.log('  NODE 2: Business Hours Check');
  console.log('    Schedule: COG Business Hours (Mon-Fri, 8AM-5PM MT)\n');

  console.log('  NODE 3: Get Input (Main Menu)');
  console.log('    Valid Digits: 0, 1, 2, 3, 4, 9');
  console.log('    Timeout: 10 seconds\n');

  console.log('  NODES 4-7: Transfers');
  console.log('    Option 1 → Extension 9811 (Water & Sewer)');
  console.log('    Option 2 → Extension 9881 (Streets & Roads)');
  console.log('    Option 3 → Extension 9780 (Community Development)');
  console.log('    Option 4 → Extension 9230 (Municipal Court)\n');

  console.log('  NODE 8: Voicemail (Option 0)');
  console.log('    Email: 311@greeleygov.com\n');

  console.log('STEP 5: SAVE AND PUBLISH\n');
  console.log('  1. Click "Save"');
  console.log('  2. Click "Publish"');
  console.log('  3. Add version notes if prompted\n');

  console.log('STEP 6: ASSIGN PHONE NUMBER\n');
  console.log('  1. Go to Contact Center → Phone Numbers');
  console.log('  2. Find: (970) 351-5311');
  console.log('  3. Assign to flow: COG33\n');

  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📖 For detailed instructions, open:\n');
  console.log('   COGflow_Complete_Guide.html (in Microsoft Word)\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  await question('Press ENTER to continue...');
}

async function openZoomAdmin() {
  console.log('\n📍 Opening Zoom Admin in browser...\n');

  const { exec } = require('child_process');

  // Try to open browser
  const url = 'https://zoom.us/admin/contact-center/flows';

  if (process.platform === 'win32') {
    exec(`start ${url}`);
  } else if (process.platform === 'darwin') {
    exec(`open ${url}`);
  } else {
    exec(`xdg-open ${url}`);
  }

  console.log('✅ Browser opened to Zoom Contact Center Flows\n');
  console.log('Please login and create the flow manually.\n');

  await question('Press ENTER when done...');
}

async function exportConfig() {
  console.log('\n📄 Exporting flow configuration...\n');

  const config = {
    flow_name: 'COG33',
    description: 'City of Greeley main line (970) 351-5311',
    phone_number: '(970) 351-5311',

    messages: {
      greeting: "Hello, you've reached the City of Greeley. If this is an emergency, hang up and dial 9 1 1.",

      main_menu: "For Utility Bills, Water Quality, Water Conservation, or other Water and Sewer related services, press 1. For Streets, traffic signals, parking lots, sidewalks, or other services related to streets and roads, press 2. For questions regarding permits, developments, and Community Development, press 3. For Municipal Court matters including tickets, jury duty, or probation, press 4. To speak with a representative directly, press 0. To return to this main menu at any time, press 9.",

      after_hours: "Our offices are currently closed. Our business hours are Monday through Friday, 8 AM to 5 PM Mountain Time. Please call back during business hours or press 0 to leave a message.",

      holiday: "Our offices are currently closed for a holiday. Please call back during normal business hours. Thank you.",

      voicemail: "All representatives are currently assisting other callers. Please leave a detailed message after the tone, and your message will be converted to a 3 1 1 ticket. A representative will contact you as soon as possible.",

      thank_you: "Thank you for your message. A 3 1 1 ticket has been created and will be reviewed by our team. Goodbye."
    },

    departments: [
      { option: 1, name: 'Water & Sewer', extension: '9811', message: 'Please hold while we transfer you to our Water and Sewer department.' },
      { option: 2, name: 'Streets & Roads', extension: '9881', message: 'Please hold while we transfer you to our Streets and Roads department.' },
      { option: 3, name: 'Community Development', extension: '9780', message: 'Please hold while we transfer you to Community Development.' },
      { option: 4, name: 'Municipal Court', extension: '9230', message: 'Please hold while we transfer you to Municipal Court.' }
    ],

    schedules: {
      business_hours: {
        name: 'COG Business Hours',
        timezone: 'America/Denver',
        hours: {
          monday: '8:00 AM - 5:00 PM',
          tuesday: '8:00 AM - 5:00 PM',
          wednesday: '8:00 AM - 5:00 PM',
          thursday: '8:00 AM - 5:00 PM',
          friday: '8:00 AM - 5:00 PM',
          saturday: 'Closed',
          sunday: 'Closed'
        }
      },
      holidays: {
        name: 'COG Holidays',
        holidays: [
          'New Year\'s Day',
          'Memorial Day',
          'Independence Day',
          'Labor Day',
          'Thanksgiving',
          'Christmas'
        ]
      }
    },

    integrations: {
      voicemail_email: '311@greeleygov.com',
      ticket_system: '311 Ticketing'
    }
  };

  const filename = 'COGflow_Configuration.json';
  fs.writeFileSync(filename, JSON.stringify(config, null, 2));

  console.log(`✅ Configuration exported to: ${filename}\n`);
  console.log('You can use this file as a reference when building the flow manually.\n');

  await question('Press ENTER to continue...');
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
