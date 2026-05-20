const express = require('express');
const router = express.Router();
const noteController = require('../controllers/noteController');
const authenticate = require('../middlewares/authenticate');

// All routes require authentication
router.use(authenticate);

// GET /api/notes/tags/all - Must be before /:id route
router.get('/tags/all', noteController.getUserTags.bind(noteController));

// GET /api/notes - List notes with filters
router.get('/', noteController.listNotes.bind(noteController));

// POST /api/notes - Create note
router.post('/', noteController.createNote.bind(noteController));

// GET /api/notes/:id - Get single note
router.get('/:id', noteController.getNote.bind(noteController));

// PUT /api/notes/:id - Update note
router.put('/:id', noteController.updateNote.bind(noteController));

// DELETE /api/notes/:id - Delete note
router.delete('/:id', noteController.deleteNote.bind(noteController));

// POST /api/notes/:id/pin - Toggle pin
router.post('/:id/pin', noteController.togglePin.bind(noteController));

module.exports = router;
