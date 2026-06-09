const express = require('express');
const router = express.Router();
const testController = require('../controllers/test.controller');
const auth = require('../middleware/auth.middleware');
const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware');

router.get('/', auth(), awaitHandlerFactory(testController.getAll));
router.get('/stats', auth(), awaitHandlerFactory(testController.getStats));
router.get('/question-bank/stats', auth(), awaitHandlerFactory(testController.getQuestionBankStats));
router.get('/question-bank/random', auth(), awaitHandlerFactory(testController.getRandomFromQuestionBank));
router.post('/question-bank/import', auth(), awaitHandlerFactory(testController.importQuestionBank));
router.get('/:id/attempt', auth(), awaitHandlerFactory(testController.getAttempt));
router.post('/', auth(), awaitHandlerFactory(testController.create));
router.patch('/:id', auth(), awaitHandlerFactory(testController.update));
router.delete('/:id', auth(), awaitHandlerFactory(testController.delete));

module.exports = router;
