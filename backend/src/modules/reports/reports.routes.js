const { Router } = require('express');
const reportsController = require('./reports.controller');
const { authenticateUser, authorizePermission } = require('../../middlewares/auth.middleware');

const router = Router();

router.use(authenticateUser);

router.get(
  '/exports/audit',
  authorizePermission('reports.read'),
  (req, res) => reportsController.exportAudit(req, res)
);

router.get(
  '/:report/export',
  authorizePermission('reports.export'),
  (req, res) => reportsController.export(req, res)
);

router.get(
  '/:report',
  authorizePermission('reports.read'),
  (req, res) => reportsController.getReport(req, res)
);

module.exports = router;
