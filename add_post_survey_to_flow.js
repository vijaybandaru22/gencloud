const a = require('purecloud-flow-scripting-api-sdk-javascript');
const session = a.environment.archSession;
const archFactoryFlows = a.factories.archFactoryFlows;
const archFactoryActions = a.factories.archFactoryActions;

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';

const MAIN_FLOW_ID = '5796d427-8c0b-455f-8471-38db03907764'; // Claude_cars32
const VOICE_SURVEY_FLOW_ID = 'a0c88d4e-570a-40a6-8feb-8090869df003'; // Claude_Cars_Voice_Survey

console.log('Starting session...');

session.startWithClientIdAndSecret(
  'prod_us_west_2',
  async () => {
    try {
      console.log('Session started. Loading Claude_cars32...');

      // Check out and load the existing flow
      const flow = await archFactoryFlows.checkoutAndLoadFlowByFlowIdAsync(MAIN_FLOW_ID, 'inboundcall', true);
      console.log('Flow loaded:', flow.name, '| Type:', flow.displayTypeName);

      // Get the startup task/state
      const startObj = flow.startUpObject;
      console.log('Startup object type:', startObj && startObj.displayTypeName);

      // List current actions in the startup object
      console.log('\nLooking for transferToAcd action...');
      let transferAction = null;
      let firstAction = null;

      const traverse = a.viewModels.traverse;
      if (traverse && traverse.archTraversal) {
        // Use traversal to find actions
        console.log('Traversal available');
      }

      // Try to get actions via the startUpObject's actions property
      if (startObj && startObj.actions) {
        const actionList = startObj.actions;
        console.log('Actions count:', actionList.length || 'N/A');
        if (actionList.length) {
          firstAction = actionList[0];
          console.log('First action:', firstAction.displayTypeName, '|', firstAction.name);
          // Look for transferToAcd
          for (let i = 0; i < actionList.length; i++) {
            const act = actionList[i];
            if (act.displayTypeName && act.displayTypeName.toLowerCase().includes('transfertoacd')) {
              transferAction = act;
              console.log('Found transferToAcd at index', i, ':', act.name);
              break;
            }
          }
        }
      }

      // Load the voice survey flow info for setPostFlow
      console.log('\nLoading voice survey flow info...');
      const surveyFlowInfo = await archFactoryFlows.getFlowInfoByFlowIdAsync(VOICE_SURVEY_FLOW_ID, 'voicesurvey');
      console.log('Survey flow info:', surveyFlowInfo && surveyFlowInfo.name);

      // Add setPostFlow action BEFORE the transferToAcd (or at beginning if not found)
      const insertBefore = transferAction || null;
      const postFlowAction = archFactoryActions.addActionSetPostFlow(startObj, 'Set Voice Survey', insertBefore);
      console.log('setPostFlow action added');

      // Configure the action
      postFlowAction.actionType.setLiteralString('voiceSurveyFlow');
      console.log('actionType set to voiceSurveyFlow');

      postFlowAction.target.setLiteralString('caller');
      console.log('target set to caller');

      // Set the target flow
      await postFlowAction.setTargetFlowInfoAsync(surveyFlowInfo);
      console.log('Target flow set to Claude_Cars_Voice_Survey');

      // Save and publish
      console.log('\nSaving flow...');
      await flow.saveAsync();
      console.log('Saved. Publishing...');
      await flow.publishAsync();

      console.log('\n=== SUCCESS ===');
      console.log('Claude_cars32 updated with post-call voice survey!');
      console.log('After agent disconnects, customer will hear the voice survey.');

    } catch (err) {
      console.error('Error:', err.message || err);
      process.exit(1);
    }
  },
  CLIENT_ID,
  CLIENT_SECRET,
  null,
  true
);
