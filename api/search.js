export default async function handler(req, res) {
  const { q, type, limit, offset } = req.query;
  const token = req.headers.authorization;

  if (!token) {
    return res
      .status(401)
      .json({ error: 'No authorization token provided' });
  }

  try {
    const spotifyUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      q
    )}&type=${type}&limit=${limit}&offset=${offset || 0}`;

    const response = await fetch(spotifyUrl, {
      headers: { Authorization: token },
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Search failed' });
  }
}
