const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');
const auth = require('../middleware/auth.middleware');
const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware');

router.get('/', auth(), awaitHandlerFactory(testController.getAll));
router.get('/stats', auth(), awaitHandlerFactory(testController.getStats));
router.post('/', auth(), awaitHandlerFactory(testController.create));
router.patch('/:id', auth(), awaitHandlerFactory(testController.update));
router.delete('/:id', auth(), awaitHandlerFactory(testController.delete));

module.exports = router;
