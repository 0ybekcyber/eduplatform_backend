const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/faculty.controller');
const auth = require('../middleware/auth.middleware');
const Role = require('../utils/userRoles.utils');
const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware');

router.get('/', auth(), awaitHandlerFactory(facultyController.getAll));
router.post('/', auth(Role.Admin), awaitHandlerFactory(facultyController.create));
router.patch('/:id', auth(Role.Admin), awaitHandlerFactory(facultyController.update));
router.delete('/:id', auth(Role.Admin), awaitHandlerFactory(facultyController.delete));

module.exports = router;
