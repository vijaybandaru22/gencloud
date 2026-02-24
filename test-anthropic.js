const Anthropic = require('@anthropic-ai/sdk');

// Initialize the client with your API key
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // Make sure to set this environment variable
});

async function testClaude() {
  try {
    console.log('Sending request to Claude...\n');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Latest Sonnet 4.5 model
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello! Can you tell me a short joke about programming?'
        }
      ],
    });

    console.log('Response from Claude:');
    console.log('-------------------');
    console.log(message.content[0].text);
    console.log('-------------------\n');

    console.log('Model used:', message.model);
    console.log('Tokens used:', message.usage);

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('api_key')) {
      console.error('\nMake sure to set your ANTHROPIC_API_KEY environment variable:');
      console.error('  export ANTHROPIC_API_KEY="your-api-key-here"');
      console.error('Or on Windows:');
      console.error('  set ANTHROPIC_API_KEY=your-api-key-here');
    }
  }
}

// Run the test
testClaude();
