const express = require('express');
const router = express.Router();
const groupController = require('../controllers/group.controller');
const auth = require('../middleware/auth.middleware');
const Role = require('../utils/userRoles.utils');
const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware');

router.get('/', auth(), awaitHandlerFactory(groupController.getAll));
router.post('/', auth(Role.Admin), awaitHandlerFactory(groupController.create));
router.patch('/:id', auth(Role.Admin), awaitHandlerFactory(groupController.update));
router.delete('/:id', auth(Role.Admin), awaitHandlerFactory(groupController.delete));

module.exports = router;
