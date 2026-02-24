#!/usr/bin/env node
/**
 * Genesys Cloud Flow Creator
 * Creates a flow in Genesys Cloud Architect using the Platform API
 */

const https = require('https');

class GenesysFlowCreator {
    constructor(clientId, clientSecret, region = 'usw2.pure.cloud') {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.region = region;
        this.baseUrl = `api.${region}`;
        this.accessToken = null;
    }

    /**
     * Make an HTTPS request
     */
    async makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try {
                            resolve(JSON.parse(data));
                        } catch (_e) {
                            resolve(data);
                        }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (postData) {
                req.write(postData);
            }

            req.end();
        });
    }

    /**
     * Authenticate using OAuth2 client credentials flow
     */
    async authenticate() {
        console.log('Authenticating with Genesys Cloud...');

        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        const postData = 'grant_type=client_credentials';

        const options = {
            hostname: `login.${this.region}`,
            port: 443,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        try {
            const response = await this.makeRequest(options, postData);
            this.accessToken = response.access_token;
            console.log('✓ Authentication successful');
            return true;
        } catch (error) {
            console.error('✗ Authentication failed:', error.message);
            return false;
        }
    }

    /**
     * Get division ID by name
     */
    async getDivisionId(divisionName) {
        console.log(`Looking up division: ${divisionName}...`);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/api/v2/authorization/divisions',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        try {
            const response = await this.makeRequest(options);
            const divisions = response.entities || [];

            const division = divisions.find(d => d.name === divisionName);

            if (division) {
                console.log(`✓ Found division: ${divisionName} (ID: ${division.id})`);
                return division.id;
            }

            console.log(`✗ Division '${divisionName}' not found`);
            console.log('Available divisions:');
            divisions.forEach(d => {
                console.log(`  - ${d.name} (ID: ${d.id})`);
            });
            return null;
        } catch (error) {
            console.error('✗ Error fetching divisions:', error.message);
            return null;
        }
    }

    /**
     * Create a new flow in Genesys Cloud Architect
     */
    async createFlow(flowName, divisionId = null) {
        console.log(`Creating flow: ${flowName}...`);

        const flowData = {
            name: flowName,
            description: `Flow created via API - ${flowName}`,
            type: 'inboundcall',
            startUpRef: './menus/menu[Default Menu_10]',
            initialGreeting: {
                type: 'initialGreeting',
                actions: {
                    disconnect: []
                }
            },
            menus: [
                {
                    type: 'menu',
                    name: 'Default Menu',
                    refId: 'Default Menu_10',
                    actions: {
                        disconnect: []
                    }
                }
            ],
            settingsInboundCall: {
                type: 'inboundCallSettings'
            }
        };

        if (divisionId) {
            flowData.division = { id: divisionId };
        }

        const postData = JSON.stringify(flowData);

        const options = {
            hostname: this.baseUrl,
            port: 443,
            path: '/api/v2/flows',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        try {
            const createdFlow = await this.makeRequest(options, postData);
            console.log('✓ Flow created successfully!');
            console.log(`  Flow Name: ${createdFlow.name}`);
            console.log(`  Flow ID: ${createdFlow.id}`);
            console.log(`  Flow Type: ${createdFlow.type}`);

            const architectUrl = `https://apps.${this.region}/architect/#/flows/${createdFlow.id}/edit`;
            console.log(`  Architect URL: ${architectUrl}`);

            return createdFlow;
        } catch (error) {
            console.error('✗ Error creating flow:', error.message);
            return null;
        }
    }
}

async function main() {
    // Configuration from user request
    const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
    const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
    const REGION = 'usw2.pure.cloud'; // US WEST 2
    const FLOW_NAME = 'Testflow_vj12345';
    const DIVISION_NAME = 'Claude_Exploration_Vijay';

    console.log('='.repeat(60));
    console.log('Genesys Cloud Flow Creator');
    console.log('='.repeat(60));
    console.log();

    const creator = new GenesysFlowCreator(CLIENT_ID, CLIENT_SECRET, REGION);

    // Step 1: Authenticate
    if (!await creator.authenticate()) {
        console.log('\nAuthentication failed. Please check your credentials.');
        process.exit(1);
    }

    console.log();

    // Step 2: Get division ID
    const divisionId = await creator.getDivisionId(DIVISION_NAME);
    if (!divisionId) {
        console.log(`\nWarning: Could not find division '${DIVISION_NAME}'`);
        console.log('Creating flow in the default division...');
    }

    console.log();

    // Step 3: Create flow
    const flow = await creator.createFlow(FLOW_NAME, divisionId);

    if (flow) {
        console.log('\n' + '='.repeat(60));
        console.log('SUCCESS! Flow has been created.');
        console.log('='.repeat(60));
    } else {
        console.log('\n' + '='.repeat(60));
        console.log('FAILED! Could not create flow.');
        console.log('='.repeat(60));
        process.exit(1);
    }
}

// Run the script
main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
});
