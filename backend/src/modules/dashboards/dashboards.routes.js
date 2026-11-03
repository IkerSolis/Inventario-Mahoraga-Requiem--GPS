const { Router } = require('express');
const dashboardsController = require('./dashboards.controller');
const { authenticateToken } = require('../../middlewares/authMiddleware');

const router = Router();

router.use(authenticateToken);

router.get('/', dashboardsController.listDashboards);
router.get('/:id', dashboardsController.getDashboardById);
router.post('/', dashboardsController.createDashboard);
router.put('/:id', dashboardsController.updateDashboard);
router.delete('/:id', dashboardsController.deleteDashboard);
router.post('/:id/duplicate', dashboardsController.duplicateDashboard);
router.patch('/widgets/:widgetId/favorite', dashboardsController.toggleFavoriteWidget);

module.exports = router;
