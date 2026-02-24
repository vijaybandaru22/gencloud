const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('us_inqueue_config.json', 'utf8'));
const loop = cfg.flowSequenceItemList[0];
console.log('LoopTask name:', loop.name);
console.log('LoopTask __type:', loop.__type);
console.log('\nActions in loop:');
loop.actionList.forEach(function(a, i) {
  var keys = Object.keys(a).join(', ');
  console.log((i+1) + '. __type: ' + a.__type + ' | keys: ' + keys);
});
console.log('\nSupported action types (inQueueCallFlowSettings):');
console.log(JSON.stringify(cfg.inQueueCallFlowSettings, null, 2));
