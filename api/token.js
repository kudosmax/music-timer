export default async function handler(req, res) {
  const client_id = process.env.VITE_SPOTIFY_CLIENT_ID;
  const client_secret = process.env.VITE_SPOTIFY_CLIENT_SECRET;

  if (!client_id || !client_secret) {
    return res
      .status(500)
      .json({ error: 'Missing Spotify credentials' });
  }

  const authOptions = {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(client_id + ':' + client_secret).toString(
          'base64'
        ),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  };

  try {
    const response = await fetch(
      'https://accounts.spotify.com/api/token',
      authOptions
    );
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch token' });
  }
}
