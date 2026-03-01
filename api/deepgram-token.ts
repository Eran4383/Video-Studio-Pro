
// Helper to get Project ID
async function getProjectId(apiKey: string): Promise<string> {
  if (process.env.DEEPGRAM_PROJECT_ID) {
    return process.env.DEEPGRAM_PROJECT_ID;
  }

  const response = await fetch('https://api.deepgram.com/v1/projects', {
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Deepgram projects');
  }

  const data = await response.json();
  if (data.projects && data.projects.length > 0) {
    return data.projects[0].project_id;
  }

  throw new Error('No Deepgram projects found');
}

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Deepgram API Key is missing on server' });
    }

    const projectId = await getProjectId(apiKey);

    // Create a temporary key that expires in 15 minutes
    // Note: Deepgram expects expiration_date in ISO format
    const expirationDate = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const response = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        comment: 'Temporary key for direct upload',
        scopes: ['usage:write'], // Basic scope, usually sufficient for transcription if member role is implied or added
        expiration_date: expirationDate,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create temporary key: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    res.status(200).json({ key: data.key });

  } catch (error: any) {
    console.error('Token generation error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
