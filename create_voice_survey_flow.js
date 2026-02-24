const a = require('purecloud-flow-scripting-api-sdk-javascript');
const session = a.environment.archSession;
const archFactoryFlows = a.factories.archFactoryFlows;
const archFactoryActions = a.factories.archFactoryActions;

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const SURVEY_FORM_ID = '76a9fbea-17b4-4fca-90bc-45fde3df3699';

// Question IDs from Claude_Cars_Quality_Survey
const Q_AGENT_RATING = '1f290801-c4a9-4946-a110-7ec84909d2e9';
const Q_SATISFACTION = '818923ba-9b72-462f-8880-a6c38842f2dc';
const Q_RECOMMEND    = '1ce6ff92-af07-44c1-b67e-b21bc8127f22';

console.log('Starting Architect Scripting session...');

session.startWithClientIdAndSecret(
  'prod_us_west_2',
  async () => {
    try {
      console.log('Session started. Creating voice survey flow...');

      const flow = await archFactoryFlows.createFlowVoiceSurveyAsync(
        'Claude_Cars_Voice_Survey',
        'Post-call voice survey for Claude Cars',
        null,           // defaultLanguage (will default to en-us)
        null,           // callback
        null,           // division (uses default Claude_Exploration_Vijay)
        null,           // creationData
        null,           // surveyFormName
        SURVEY_FORM_ID, // surveyFormId
        true,           // createNluFromSurveyForm
        false           // configureFlowFromSurveyForm (we configure manually)
      );

      console.log('Flow created. Startup object type:', flow.startUpObject && flow.startUpObject.displayTypeName);

      const state = flow.startUpObject;

      // Question 1 - Agent rating
      const q1 = archFactoryActions.addActionAskSurveyQuestion(state, 'Agent Rating');
      q1.configureFromQuestionId(Q_AGENT_RATING);
      console.log('Agent rating question added');

      // Question 2 - Overall satisfaction
      const q2 = archFactoryActions.addActionAskSurveyQuestion(state, 'Overall Satisfaction');
      q2.configureFromQuestionId(Q_SATISFACTION);
      console.log('Overall satisfaction question added');

      // Question 3 - Recommend
      const q3 = archFactoryActions.addActionAskSurveyQuestion(state, 'Recommend');
      q3.configureFromQuestionId(Q_RECOMMEND);
      console.log('Recommend question added');

      // Disconnect
      archFactoryActions.addActionDisconnect(state, 'End Survey');
      console.log('Disconnect action added');

      // Save
      console.log('Saving flow...');
      await flow.saveAsync();
      console.log('Flow saved.');

      // Publish
      console.log('Publishing flow...');
      await flow.publishAsync();

      console.log('\n=== SUCCESS ===');
      console.log('Flow Name:', flow.name);
      console.log('Flow ID:', flow.id);

    } catch (err) {
      console.error('Error:', err.message || err);
      process.exit(1);
    }
  },
  CLIENT_ID,
  CLIENT_SECRET,
  null,   // callbackFunctionEnd
  true    // isClientCredentialsOAuthClient
);
