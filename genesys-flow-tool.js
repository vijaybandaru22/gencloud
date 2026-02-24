#!/usr/bin/env node
/**
 * Custom Genesys Flow Tool - Archy replacement
 * Usage: node genesys-flow-tool.js publish <yaml-file>
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');

class GenesysFlowTool {
    constructor() {
        this.config = this.loadConfig();
        this.accessToken = null;
    }

    loadConfig() {
        const configPath = path.join(process.env.USERPROFILE || process.env.HOME, '.genesys-flow-tool.json');

        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        return {
            clientId: null,
            clientSecret: null,
            region: 'usw2.pure.cloud'
        };
    }

    saveConfig() {
        const configPath = path.join(process.env.USERPROFILE || process.env.HOME, '.genesys-flow-tool.json');
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
        console.log(`✓ Configuration saved to: ${configPath}`);
    }

    generateUUID() {
        return crypto.randomUUID();
    }

    async makeRequest(options, postData = null) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
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
            req.on('error', (error) => { reject(error); });
            if (postData) req.write(postData);
            req.end();
        });
    }

    async authenticate() {
        if (!this.config.clientId || !this.config.clientSecret) {
            throw new Error('Not configured. Run: node genesys-flow-tool.js config');
        }

        const credentials = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
        const postData = 'grant_type=client_credentials';

        const options = {
            hostname: `login.${this.config.region}`,
            port: 443,
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const response = await this.makeRequest(options, postData);
        this.accessToken = response.access_token;
    }

    async getDivisionId(divisionName) {
        const options = {
            hostname: `api.${this.config.region}`,
            port: 443,
            path: '/api/v2/authorization/divisions',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await this.makeRequest(options);
        const divisions = response.entities || [];
        const division = divisions.find(d => d.name === divisionName);
        return division ? division.id : null;
    }

    async getQueueId(queueName) {
        const options = {
            hostname: `api.${this.config.region}`,
            port: 443,
            path: `/api/v2/routing/queues?name=${encodeURIComponent(queueName)}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await this.makeRequest(options);
        const queues = response.entities || [];
        return queues.length > 0 ? queues[0].id : null;
    }

    async publishFlow(yamlFile) {
        console.log('='.repeat(70));
        console.log('Genesys Flow Tool - Publishing Flow');
        console.log('='.repeat(70));
        console.log();

        // Authenticate
        console.log('Authenticating...');
        await this.authenticate();
        console.log('✓ Authenticated\n');

        // Read YAML
        console.log(`Reading flow file: ${yamlFile}...`);
        const yamlContent = fs.readFileSync(yamlFile, 'utf8');
        const flowData = yaml.load(yamlContent);
        const inboundCall = flowData.inboundCall;
        console.log('✓ File loaded\n');

        console.log(`Flow Name: ${inboundCall.name}`);
        console.log(`Division: ${inboundCall.division}`);

        // Get division and queue
        console.log('\nLooking up division and queue...');
        const divisionId = await this.getDivisionId(inboundCall.division);
        if (!divisionId) {
            throw new Error(`Division '${inboundCall.division}' not found`);
        }

        // Extract queue name from YAML
        const queueName = 'VJ_TEST_NEW'; // Parse from YAML if needed
        const queueId = await this.getQueueId(queueName);
        if (!queueId) {
            throw new Error(`Queue '${queueName}' not found`);
        }
        console.log('✓ Division and queue found\n');

        // Create flow
        console.log('Creating flow...');
        const flowConfig = {
            name: inboundCall.name,
            description: inboundCall.description,
            type: 'inboundcall',
            division: { id: divisionId }
        };

        const postData = JSON.stringify(flowConfig);
        const options = {
            hostname: `api.${this.config.region}`,
            port: 443,
            path: '/api/v2/flows',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const flow = await this.makeRequest(options, postData);
        console.log('✓ Flow created\n');

        console.log('='.repeat(70));
        console.log('Flow Published Successfully!');
        console.log('='.repeat(70));
        console.log(`Flow ID: ${flow.id}`);
        console.log(`Flow Name: ${flow.name}`);
        console.log(`Architect URL: https://apps.${this.config.region}/architect/#/flows/${flow.id}/edit`);
        console.log();
        console.log('NOTE: Flow configuration must be completed in Architect.');
        console.log('The YAML file contains the configuration blueprint.');
        console.log('='.repeat(70));

        return flow;
    }

    configure(clientId, clientSecret, region) {
        this.config.clientId = clientId;
        this.config.clientSecret = clientSecret;
        if (region) this.config.region = region;
        this.saveConfig();

        console.log('='.repeat(70));
        console.log('Genesys Flow Tool - Configuration');
        console.log('='.repeat(70));
        console.log('✓ Client ID configured');
        console.log('✓ Client Secret configured');
        console.log(`✓ Region: ${this.config.region}`);
        console.log('='.repeat(70));
        console.log('\nYou can now publish flows with:');
        console.log('  node genesys-flow-tool.js publish <yaml-file>');
    }

    showHelp() {
        console.log('Genesys Flow Tool - Archy Replacement');
        console.log();
        console.log('Usage:');
        console.log('  node genesys-flow-tool.js config <clientId> <clientSecret> [region]');
        console.log('  node genesys-flow-tool.js publish <yaml-file>');
        console.log();
        console.log('Examples:');
        console.log('  node genesys-flow-tool.js config abc123 secret456 usw2.pure.cloud');
        console.log('  node genesys-flow-tool.js publish Testflow_vj12345.yaml');
    }
}

// CLI Handler
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const tool = new GenesysFlowTool();

    try {
        if (command === 'config') {
            const clientId = args[1];
            const clientSecret = args[2];
            const region = args[3] || 'usw2.pure.cloud';

            if (!clientId || !clientSecret) {
                console.error('Error: Client ID and Secret required');
                tool.showHelp();
                process.exit(1);
            }

            tool.configure(clientId, clientSecret, region);

        } else if (command === 'publish') {
            const yamlFile = args[1];

            if (!yamlFile) {
                console.error('Error: YAML file required');
                tool.showHelp();
                process.exit(1);
            }

            await tool.publishFlow(yamlFile);

        } else {
            tool.showHelp();
        }
    } catch (error) {
        console.error('\n✗ Error:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
