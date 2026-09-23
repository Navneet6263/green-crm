const express = require('express');
const router = express.Router({ mergeParams: true });
const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/fieldPhotoService');
const { createRateLimiter } = require('../middlewares/rateLimiter');
router.use(createRateLimiter({ windowMs: 60000, max: 40, keyGenerator: req => `${req.auth.companyId}:${req.auth.userId}:photos` }));
router.get('/', asyncHandler(async (req, res) => res.json({ data: await service.list(req.auth, req.params.leadId) })));
router.put('/:photoId', express.raw({ type: ['image/jpeg', 'image/png'], limit: '5mb' }), asyncHandler(async (req, res) => {
  res.json({ data: await service.save(req.auth, req.params.leadId, req.params.photoId, req.body, req.get('content-type')) });
}));
router.get('/:photoId', asyncHandler(async (req, res) => {
  const photo = await service.get(req.auth, req.params.leadId, req.params.photoId);
  res.set({ 'Content-Type': photo.contentType, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  res.sendFile(photo.path);
}));
module.exports = router;
