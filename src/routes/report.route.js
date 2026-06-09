const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const Role = require('../utils/userRoles.utils');
const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware');
const reportController = require('../controllers/report.controller');

router.get('/admin', auth(Role.Admin), awaitHandlerFactory(reportController.getAdminReports));

module.exports = router;
