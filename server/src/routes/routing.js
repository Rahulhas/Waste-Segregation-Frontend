import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const OSRM_URL = process.env.OSRM_URL || 'https://router.project-osrm.org';

router.post('/road', authMiddleware, requireRole('ADMIN', 'DRIVER', 'OPERATOR'), async (req, res) => {
  const stops = Array.isArray(req.body?.stops) ? req.body.stops : [];
  if (stops.length < 2) return res.status(400).json({ error: 'At least two route stops are required' });

  const validStops = stops.every((stop) => Number.isFinite(Number(stop.lat)) && Number.isFinite(Number(stop.lng)));
  if (!validStops) return res.status(400).json({ error: 'Every route stop needs valid coordinates' });

  const coordinates = stops.map((stop) => `${Number(stop.lng)},${Number(stop.lat)}`).join(';');
  const url = `${OSRM_URL}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) {
      return res.status(502).json({ error: 'The road routing service could not build this route' });
    }

    const route = data.routes[0];
    res.json({
      geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
    });
  } catch (error) {
    console.error('Road routing error:', error);
    res.status(502).json({ error: 'Road routing service is unavailable' });
  }
});

export default router;