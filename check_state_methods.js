const a = require('purecloud-flow-scripting-api-sdk-javascript');
const session = a.environment.archSession;
const flows = a.factories.archFactoryFlows;

session.startWithClientIdAndSecret('prod_us_west_2', async () => {
  try {
    const flow = await flows.createFlowVoiceSurveyAsync(
      'tmp_state_check3', null, null, null, null, null, null,
      '76a9fbea-17b4-4fca-90bc-45fde3df3699', true, false
    );
    const state = flow.startUpObject;
    console.log('State type:', state && state.displayTypeName);

    // Walk prototype chain for all methods
    const allMethods = new Set();
    let proto = Object.getPrototypeOf(state);
    while (proto && proto !== Object.prototype) {
      Object.getOwnPropertyNames(proto).forEach(m => {
        if (typeof state[m] === 'function' && m[0] !== '_') allMethods.add(m);
      });
      proto = Object.getPrototypeOf(proto);
    }
    const methods = Array.from(allMethods).sort();
    console.log('\nAll public methods:');
    methods.forEach(m => console.log(' ', m));
  } catch(e) { console.error('Error:', e.message); }
}, 'c710e83c-7d3d-4910-bdf5-b6d4f634c959', '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM', null, true);
