const express = require('express');
const router = express.Router();
const assignmentSubmissionController = require('../controllers/assignmentSubmission.controller');
const auth = require('../middleware/auth.middleware');
const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware');

router.get('/my', auth('Student'), awaitHandlerFactory(assignmentSubmissionController.getMySubmissions));
router.get('/assignment/:assignmentId', auth('Admin', 'Teacher'), awaitHandlerFactory(assignmentSubmissionController.getByAssignment));
router.post('/', auth('Student'), awaitHandlerFactory(assignmentSubmissionController.create));
router.patch('/:id/grade', auth('Admin', 'Teacher'), awaitHandlerFactory(assignmentSubmissionController.grade));

module.exports = router;
