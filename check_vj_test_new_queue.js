const platformClient = require('purecloud-platform-client-v2');

const CLIENT_ID = 'c710e83c-7d3d-4910-bdf5-b6d4f634c959';
const CLIENT_SECRET = '6QRhz2snkh1y1exmv9unTOP4R8s4z22wOVAYcf_LaoM';
const REGION = 'usw2.pure.cloud';

const client = platformClient.ApiClient.instance;
client.setEnvironment(REGION);

async function checkQueue() {
    try {
        await client.loginClientCredentialsGrant(CLIENT_ID, CLIENT_SECRET);

        const routingApi = new platformClient.RoutingApi();

        console.log('Searching for queue: VJ_TEST_NEW...\n');

        const queues = await routingApi.getRoutingQueues({
            name: 'VJ_TEST_NEW',
            pageSize: 100
        });

        if (queues.entities && queues.entities.length > 0) {
            console.log('✅ Queue found!');
            queues.entities.forEach(queue => {
                console.log(`\nQueue Name: ${queue.name}`);
                console.log(`Queue ID: ${queue.id}`);
                console.log(`Division: ${queue.division ? queue.division.name : 'N/A'}`);
                console.log(`Description: ${queue.description || 'N/A'}`);
            });
        } else {
            console.log('❌ Queue "VJ_TEST_NEW" not found!');
            console.log('\nSearching for similar queues...\n');

            const allQueues = await routingApi.getRoutingQueues({
                pageSize: 100
            });

            const similarQueues = allQueues.entities.filter(q =>
                q.name.toLowerCase().includes('vj') ||
                q.name.toLowerCase().includes('test')
            );

            if (similarQueues.length > 0) {
                console.log('Similar queues found:');
                similarQueues.forEach(q => {
                    console.log(`  - ${q.name} (ID: ${q.id})`);
                });
            } else {
                console.log('No similar queues found. Listing all queues:');
                allQueues.entities.slice(0, 20).forEach(q => {
                    console.log(`  - ${q.name}`);
                });
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkQueue();
