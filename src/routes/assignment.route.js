const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const auth = require('../middleware/auth.middleware');
const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware');

router.get('/', auth(), awaitHandlerFactory(assignmentController.getAll));
router.get('/stats', auth(), awaitHandlerFactory(assignmentController.getStats));
router.post('/', auth('Admin', 'Teacher'), awaitHandlerFactory(assignmentController.create));
router.patch('/:id', auth('Admin', 'Teacher'), awaitHandlerFactory(assignmentController.update));
router.delete('/:id', auth('Admin', 'Teacher'), awaitHandlerFactory(assignmentController.delete));

module.exports = router;
