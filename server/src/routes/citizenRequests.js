import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma, createAuditLog, getClientIp } from '../lib/audit.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();
const TYPES = ['overflow', 'missed_pickup', 'damaged_bin', 'bulk_ewaste'];
const STATUSES = ['submitted', 'verified', 'dispatched', 'resolved'];
const ZONES = [
  { name: 'North Market', lat: 19.076, lng: 72.877 },
  { name: 'Lakeview Ward', lat: 19.089, lng: 72.865 },
  { name: 'Civic Centre', lat: 19.062, lng: 72.881 },
  { name: 'East Campus', lat: 19.071, lng: 72.897 },
];

function nearestZone(latitude, longitude) {
  return ZONES.reduce((nearest, zone) => {
    const distance = Math.hypot(latitude - zone.lat, longitude - zone.lng);
    return distance < nearest.distance ? { zone, distance } : nearest;
  }, { zone: ZONES[0], distance: Number.POSITIVE_INFINITY }).zone.name;
}

function serialize(request) {
  return {
    ...request,
    location: { lat: request.latitude, lng: request.longitude, address_string: request.addressString },
  };
}

router.post('/', async (req, res) => {
  try {
    const { citizenName, contactNumber, requestType, location, photoUrl } = req.body;
    const latitude = Number(location?.lat);
    const longitude = Number(location?.lng);
    const addressString = String(location?.address_string || '').trim();

    if (!citizenName || !contactNumber || !TYPES.includes(requestType) || !Number.isFinite(latitude) || !Number.isFinite(longitude) || !addressString) {
      return res.status(400).json({ error: 'Name, contact, request type, coordinates, and address are required' });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const request = await prisma.citizenRequest.create({
      data: {
        ticketId: `ECO-${new Date().getFullYear()}-${uuidv4().slice(0, 6).toUpperCase()}`,
        citizenName: String(citizenName).trim(),
        contactNumber: String(contactNumber).trim(),
        requestType,
        latitude,
        longitude,
        addressString,
        zone: nearestZone(latitude, longitude),
        photoUrl: photoUrl || null,
      },
    });

    await createAuditLog({ action: 'CITIZEN_REQUEST_SUBMITTED', resource: request.ticketId, metadata: { zone: request.zone, requestType }, ipAddress: getClientIp(req) });
    res.status(201).json({ request: serialize(request) });
  } catch (err) {
    console.error('Citizen request create error:', err);
    res.status(500).json({ error: 'Unable to submit request' });
  }
});

router.get('/track/:ticketId', async (req, res) => {
  const request = await prisma.citizenRequest.findUnique({ where: { ticketId: req.params.ticketId } });
  if (!request) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ request: serialize(request) });
});

router.get('/', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'DRIVER'), async (req, res) => {
  const { status, zone } = req.query;
  const requests = await prisma.citizenRequest.findMany({
    where: { ...(STATUSES.includes(status) ? { status } : {}), ...(zone ? { zone } : {}) },
    orderBy: [{ status: 'asc' }, { timestamp: 'asc' }],
    take: 100,
  });
  res.json({ requests: requests.map(serialize) });
});

router.patch('/:ticketId/status', authMiddleware, requireRole('ADMIN', 'OPERATOR', 'DRIVER'), async (req, res) => {
  const { status, driverProofPhotoUrl } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid request status' });
  const request = await prisma.citizenRequest.update({ where: { ticketId: req.params.ticketId }, data: { status, ...(driverProofPhotoUrl ? { driverProofPhotoUrl } : {}) } });
  await createAuditLog({ userId: req.user.id, action: 'CITIZEN_REQUEST_STATUS_UPDATED', resource: request.ticketId, metadata: { status }, ipAddress: getClientIp(req) });
  res.json({ request: serialize(request) });
});

export default router;
