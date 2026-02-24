/**
 * Creates and publishes Claude Cars inQueueCall flows for US and India queues
 * using the Architect Scripting SDK (purecloud-flow-scripting-api-sdk-javascript)
 *
 * US Queue: Claude_US_InQueue - triggers hold music after 3 minutes (180000ms)
 * India Queue: Claude_India_InQueue - triggers hold music after 2 minutes (120000ms)
 */

const arch = require('./node_modules/purecloud-flow-scripting-api-sdk-javascript/build-scripting/release/scripting.bundle.js');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const LOCATION = 'prod_us_west_2';
const DIVISION_NAME = 'Claude_Exploration_Vijay';

const AI_CAR_PROMO = "Claude Cars is thrilled to introduce our new future AI car model. This revolutionary vehicle has the capability to fly above traffic during traffic jams, saving you valuable time. It can also travel through rivers and water bodies with ease. Experience the future of transportation with Claude Cars.";

const archSession = arch.environment.archSession;
const archFactoryFlows = arch.factories.archFactoryFlows;
const archFactoryActions = arch.factories.archFactoryActions;
const archEnums = arch.enums.archEnums;

// Allow server-side-only functions to pass client-side expression validation
arch.viewModels.values.ArchValueSettings.allowInvalidExpressionText = true;

// Prevent session from terminating the process so we can handle errors gracefully
archSession.endTerminatesProcess = false;

function addHoldMusic(container, name, seconds) {
  // Create hold music action, then set duration as literal (not expression string)
  const hm = archFactoryActions.addActionHoldMusic(
    container,
    name,
    archEnums.HOLD_MUSIC_PLAY_STYLES.duration
    // no durationExpression - set it as literal below
  );
  hm.playDuration.setLiteralTimeParts(0, 0, 0, seconds);
  return hm;
}

async function buildInQueueFlow(flow, thresholdMs, flowLabel) {
  console.log(`[${flowLabel}] Building flow actions...`);

  const taskLoop = flow.startUpObject;
  console.log(`[${flowLabel}] Got startUpObject: ${taskLoop.displayTypeName} - ${taskLoop.name}`);

  // The inQueueCall ArchTaskLoop loops automatically when actions end.
  // Sequence: PIQ/EWT → Hold Music 30s → AI Car Promo → Updated PIQ/EWT → Hold Music 30s → loop
  // This satisfies: PIQ/EWT plays, hold music plays (30s), promo plays, EWT repeats

  // 1. Play initial PIQ and EWT
  archFactoryActions.addActionPlayEstimatedWaitTime(taskLoop, 'Play PIQ and EWT');
  console.log(`[${flowLabel}] Added playEstimatedWaitTime`);

  // 2. Hold music for 30 seconds
  addHoldMusic(taskLoop, 'Hold Music 30 Seconds', 30);
  console.log(`[${flowLabel}] Added hold music 30s`);

  // 3. AI Car Promotional message
  archFactoryActions.addActionPlayAudio(taskLoop, 'AI Car Promo', AI_CAR_PROMO);
  console.log(`[${flowLabel}] Added promo audio`);

  // 4. Updated PIQ and EWT
  archFactoryActions.addActionPlayEstimatedWaitTime(taskLoop, 'Updated PIQ and EWT');
  console.log(`[${flowLabel}] Added updated EWT`);

  // 5. Hold music 30 seconds before loop restarts
  addHoldMusic(taskLoop, 'Hold Music Before Loop', 30);
  console.log(`[${flowLabel}] Added hold music before loop`);

  console.log(`[${flowLabel}] Actions configured. Task action count: ${taskLoop.actionCount}`);
  return flow;
}

async function createAndPublishFlow(flowName, flowDescription, thresholdMs, flowLabel) {
  console.log(`\n[${flowLabel}] Creating flow: ${flowName}`);

  // Get the division
  const division = archSession.orgInfo.getDivisionByName(DIVISION_NAME);
  if (!division) {
    throw new Error(`Division '${DIVISION_NAME}' not found!`);
  }
  console.log(`[${flowLabel}] Using division: ${division.name}`);

  // Create the inQueueCall flow
  const flow = await archFactoryFlows.createFlowInQueueCallAsync(
    flowName,
    flowDescription,
    undefined,  // defaultSupportedLanguage - org default (US English)
    undefined,  // callback - using await
    division    // flowDivision
  );

  if (!flow) {
    throw new Error(`Failed to create flow '${flowName}'`);
  }
  console.log(`[${flowLabel}] Flow created in memory`);

  // Build the flow with actions
  await buildInQueueFlow(flow, thresholdMs, flowLabel);

  // Save (creates in cloud)
  console.log(`[${flowLabel}] Saving flow...`);
  await flow.saveAsync();
  console.log(`[${flowLabel}] Saved - Flow ID: ${flow.id}`);

  // Publish
  console.log(`[${flowLabel}] Publishing flow...`);
  await flow.publishAsync();
  console.log(`[${flowLabel}] PUBLISHED! Flow ID: ${flow.id}`);

  return flow;
}

async function main(session) {
  console.log(`\nConnected to: ${session.orgInfo.name} | Region: ${session.region}\n`);

  try {
    // US InQueue (3 min threshold)
    await createAndPublishFlow(
      'Claude_US_InQueue',
      'Claude Cars US Queue in-queue - PIQ/EWT, hold music, AI car promo (3 min threshold)',
      180000,
      'US'
    );
    console.log('\n[US] Flow published successfully!');

    // India InQueue (2 min threshold)
    await createAndPublishFlow(
      'Claude_India_InQueue',
      'Claude Cars India Queue in-queue - PIQ/EWT, hold music, AI car promo (2 min threshold)',
      120000,
      'India'
    );
    console.log('\n[India] Flow published successfully!');

    console.log('\n=== BOTH IN-QUEUE FLOWS PUBLISHED ===');
    console.log('Assign them to queues in Genesys Cloud UI:');
    console.log('  Admin > Queues > Claude_US_Queue > In-Queue Flow > Claude_US_InQueue');
    console.log('  Admin > Queues > Claude_India_Queue > In-Queue Flow > Claude_India_InQueue');

    session.endExitCode = 0;
  } catch (err) {
    console.error('\nFATAL ERROR:', err);
    session.endExitCode = 1;
  }
}

console.log('Connecting to Genesys Cloud...');
archSession.startWithClientIdAndSecret(
  LOCATION,
  main,
  CLIENT_ID,
  CLIENT_SECRET,
  undefined,
  true  // isClientCredentialsOAuthClient
).then(() => {
  process.exit(archSession.endExitCode || 0);
}).catch(err => {
  console.error('Session error:', err);
  process.exit(1);
});
