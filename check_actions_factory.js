const a = require('purecloud-flow-scripting-api-sdk-javascript');
const session = a.environment.archSession;
const flows = a.factories.archFactoryFlows;
const actions = a.factories.archFactoryActions;

session.startWithClientIdAndSecret('prod_us_west_2', async () => {
  try {
    // List all methods on actions factory that relate to survey/ask/play
    const allMethods = new Set();
    let proto = Object.getPrototypeOf(actions);
    while (proto && proto !== Object.prototype) {
      Object.getOwnPropertyNames(proto).forEach(m => {
        if (typeof actions[m] === 'function' && m[0] !== '_') allMethods.add(m);
      });
      proto = Object.getPrototypeOf(proto);
    }
    const methods = Array.from(allMethods).sort();
    console.log('archFactoryActions methods (survey/ask/play/disconnect):');
    methods.filter(m => /survey|ask|play|disconnect|audio/i.test(m)).forEach(m => console.log(' ', m));
    console.log('\nAll archFactoryActions methods:');
    methods.forEach(m => console.log(' ', m));
  } catch(e) { console.error('Error:', e.message); }
}, 'c710e83c-7d3d-4910-bdf5-b6d4f634c959', '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM', null, true);
