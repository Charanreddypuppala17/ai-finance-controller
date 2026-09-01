const { GET } = require('../app/api/runs/route.ts');

async function testRoute() {
  try {
    // Create a mock request with the user ID header
    const req = {
      headers: {
        get: (headerName) => {
          if (headerName === 'x-user-id') return '4c571345-3e85-4044-9d41-c1a738ce70e0';
          return null;
        }
      }
    };

    console.log('Sending mock GET request to /api/runs...');
    const response = await GET(req);
    const body = await response.json();
    console.log('Response Status:', response.status);
    console.log('Response Body:', JSON.stringify(body, null, 2));
  } catch (error) {
    console.error('Crash in /api/runs endpoint:', error);
  }
}

testRoute();
