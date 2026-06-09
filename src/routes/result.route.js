const express = require('express');
const router = express.Router();
const resultController = require('../controllers/result.controller');
const auth = require('../middleware/auth.middleware');

router.post('/', auth(), resultController.create);
router.get('/my', auth(), resultController.getMyResults);
router.get('/test/:testId', auth(), resultController.getByTest);
router.get('/:id', auth(), resultController.getById);

module.exports = router;
