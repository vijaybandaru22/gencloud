const archModule = require('./node_modules/purecloud-flow-scripting-api-sdk-javascript/build-scripting/release/scripting.bundle.js');
const factFlows = archModule.factories.archFactoryFlows;
let allMethods = new Set();
let proto = factFlows;
while (proto && proto !== Object.prototype) {
  Object.getOwnPropertyNames(proto).forEach(m => allMethods.add(m));
  proto = Object.getPrototypeOf(proto);
}
const flowMethods = [...allMethods].filter(m => !['constructor', 'logStr', 'displayTypeName', 'isArchFactoryFlows'].includes(m));
console.log('ArchFactoryFlows methods:', flowMethods);
