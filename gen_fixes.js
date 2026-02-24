const fixes = [];

// Helper to add a file fix
function add(fname, ops) { fixes.push([fname, ops]); }

add('add_dtmf_collection_complete.js', [['rename_func',80,'function deleteFlow(','function _deleteFlow(']]);
add('add_india_decision_via_api.js', [['rename_catch',20,'e','_e'],['rename_catch',294,'error','_error']]);
add('add_india_routing_decision.js', [['rename_catch',19,'e','_e'],['rename_func',71,'function checkoutFlow(','function _checkoutFlow('],['rename_func',88,'function updateFlow(','function _updateFlow('],['rename_var',93,'const mainActions','const _mainActions'],['rename_var',98,'const decisionAction','const _decisionAction']]);
add('auto_complete_geo_routing.js', [['rename_catch',37,'e','_e'],['rename_var',43,'const flowWithConfig','const _flowWithConfig'],['rename_catch',131,'archyError','_archyError']]);
add('auto_create_cogflow_browser.js', [['rename_var',18,'const FLOW_CONFIG','const _FLOW_CONFIG'],['rename_var',195,'const createButtonSelector','const _createButtonSelector'],['rename_catch',248,'error','_error']]);
add('auto_publish_all_flows.js', [['delete_line',3],['strip_assign',51,'result'],['rename_catch',55,'err','_err'],['strip_assign',60,'version'],['rename_catch',64,'err2','_err2'],['strip_assign',96,'result'],['rename_catch',100,'err','_err'],['strip_assign',104,'version'],['rename_catch',108,'err2','_err2'],['strip_assign',140,'result'],['rename_catch',144,'err','_err'],['strip_assign',148,'version'],['rename_catch',152,'err2','_err2'],['strip_assign',211,'result'],['rename_catch',215,'err','_err'],['strip_assign',219,'version'],['rename_catch',223,'err2','_err2']]);
add('auto_publish_browser.js', [['rename_catch',162,'e','_e']]);
add('automate_flow_config.js', [['rename_catch',21,'e','_e']]);
add('build_claude_cars32_complete.js', [['rename_catch',73,'deleteError','_deleteError']]);
add('check_flow_api.js', [['rename_catch',31,'e','_e'],['rename_catch',73,'error','_error']]);
add('claude_cars_complete_setup.js', [['rename_catch',35,'e','_e'],['rename_catch',81,'e','_e']]);
add('complete_automation.js', [['delete_line',2],['rename_catch',22,'e','_e'],['rename_func',36,'function authenticate(','function _authenticate('],['rename_func',57,'function deleteFlow(','function _deleteFlow('],['rename_catch',73,'error','_error'],['rename_func',79,'function getDivisionId(','function _getDivisionId('],['rename_func',95,'function createNewFlow(','function _createNewFlow(']]);
add('complete_claude_cars23_flow.js', [['delete_line',2]]);
add('complete_claude_cars32_automation.js', [['delete_line',3],['rename_catch',107,'error','_error']]);
add('complete_flow_setup_final.js', [['rename_catch',35,'e','_e'],['rename_catch',335,'error','_error'],['rename_var',419,'const verifiedFlow','const _verifiedFlow']]);
add('complete_inqueue_publishing.js', [['rename_catch',93,'flows','_flows']]);
add('configure_and_publish_claude_cars.js', [['rename_var',563,'const updatedFlow','const _updatedFlow'],['rename_var',569,'const savedConfig','const _savedConfig']]);
add('configure_and_publish_flow.js', [['rename_catch',19,'e','_e'],['rename_catch',124,'error','_error']]);
add('configure_flow_complete.js', [['rename_catch',19,'e','_e'],['rename_catch',121,'error','_error']]);
add('create_accessible_flow.js', [['rename_catch',21,'e','_e']]);
add('create_and_export_claude_cars.js', [['rename_catch',51,'e','_e'],['rename_catch',62,'e','_e'],['rename_catch',106,'e','_e']]);
add('create_and_publish_claude_cars1.js', [['rename_catch',62,'error','_error'],['rename_var',106,'const currentFlow','const _currentFlow'],['rename_catch',155,'execError','_execError'],['rename_catch',234,'valError','_valError'],['rename_catch',281,'unlockError','_unlockError'],['rename_var',375,'const published','const _published']]);
add('create_and_publish_claude_cars32.js', [['delete_line',2],['rename_func',96,'function createFlowConfig(','function _createFlowConfig('],['rename_catch',430,'queueIds','_queueIds'],['strip_assign',481,'result']]);
add('create_and_publish_claude_cars_api.js', [['delete_line',2],['delete_line',3],['rename_func',169,'function publishFlow(','function _publishFlow('],['rename_catch',227,'error','_error']]);
add('create_claude_cars23_complete.js', [['rename_catch',77,'e','_e'],['rename_catch',121,'e','_e'],['rename_var',388,'const validation','const _validation']]);
add('create_claude_cars23_final.js', [['rename_catch',91,'e','_e']]);
add('create_claude_cars32_direct_api.js', [['rename_catch',566,'deleteError','_deleteError'],['rename_var',571,'const isNewFlow','const _isNewFlow'],['strip_assign',603,'checkinResponse']]);
add('create_claude_cars_complete.js', [['rename_catch',22,'e','_e'],['rename_catch',110,'e','_e'],['rename_catch',155,'e','_e']]);
add('create_claude_cars_flow_complete.js', [['rename_catch',55,'e','_e'],['rename_catch',65,'e','_e']]);
add('create_claude_cars_queues.js', [['rename_catch',18,'e','_e']]);
add('create_claude_flow_with_requirements.js', [['rename_catch',31,'e','_e'],['rename_catch',168,'error','_error']]);
add('create_complete_flow.js', [['rename_catch',87,'e','_e']]);
add('create_complete_working_flow.js', [['rename_catch',37,'e','_e'],['rename_catch',183,'error','_error']]);
add('create_flow_from_yaml.js', [['rename_catch',37,'e','_e'],['rename_catch',104,'error','_error'],['rename_catch',125,'error','_error']]);
add('create_full_flow_properly.js', [['rename_catch',36,'e','_e'],['rename_catch',168,'error','_error'],['strip_assign',388,'result'],['strip_assign',401,'result']]);
