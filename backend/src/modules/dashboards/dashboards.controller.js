const { v4: uuidv4 } = require('uuid');
const db = require('../../database/connection');
const { createDashboardSchema, updateDashboardSchema } = require('./dashboards.validation');

/**
 * Listar dashboards disponibles para el usuario
 */
async function listDashboards(req, res, next) {
  try {
    const dashboards = await db('dashboards')
      .where('business_id', req.user.business_id)
      .andWhere((builder) => {
        builder.where('user_id', req.user.id).orWhere('is_shared', true);
      })
      .orderBy('is_default', 'desc')
      .orderBy('name', 'asc');

    // Contar widgets por dashboard
    const widgetCounts = await db('dashboard_widgets')
      .groupBy('dashboard_id')
      .select('dashboard_id')
      .count('id as count');

    const countMap = {};
    widgetCounts.forEach((w) => {
      countMap[w.dashboard_id] = Number(w.count);
    });

    const formatted = dashboards.map((d) => ({
      id: d.id,
      name: d.name,
      isDefault: Boolean(d.is_default),
      isShared: Boolean(d.is_shared),
      sharedScope: d.shared_scope,
      isOwner: d.user_id === req.user.id,
      widgetsCount: countMap[d.id] || 0,
      createdAt: d.created_at,
      updatedAt: d.updated_at
    }));

    return res.status(200).json({ dashboards: formatted });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener detalle de dashboard con sus widgets
 */
async function getDashboardById(req, res, next) {
  try {
    const { id } = req.params;

    const dashboard = await db('dashboards')
      .where({ id, business_id: req.user.business_id })
      .first();

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard no encontrado' });
    }

    const widgets = await db('dashboard_widgets')
      .where({ dashboard_id: dashboard.id })
      .orderBy('sort_order', 'asc')
      .orderBy('pos_y', 'asc')
      .orderBy('pos_x', 'asc');

    // Obtener widgets favoritos del usuario
    const favorites = await db('user_favorite_widgets')
      .where({ user_id: req.user.id })
      .select('widget_id');
    const favSet = new Set(favorites.map((f) => f.widget_id));

    const formattedWidgets = widgets.map((w) => {
      let config = {};
      try {
        config = w.config_json ? JSON.parse(w.config_json) : {};
      } catch (e) {
        config = {};
      }

      return {
        id: w.id,
        widgetType: w.widget_type,
        title: w.title,
        config,
        posX: w.pos_x,
        posY: w.pos_y,
        width: w.width,
        height: w.height,
        sortOrder: w.sort_order,
        isFavorite: favSet.has(w.id) || Boolean(w.is_favorite)
      };
    });

    return res.status(200).json({
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        isDefault: Boolean(dashboard.is_default),
        isShared: Boolean(dashboard.is_shared),
        sharedScope: dashboard.shared_scope,
        isOwner: dashboard.user_id === req.user.id,
        widgets: formattedWidgets
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Crear nuevo dashboard
 */
async function createDashboard(req, res, next) {
  try {
    const parsed = createDashboardSchema.parse(req.body);
    const { name, isDefault, isShared, sharedScope, widgets } = parsed;
    const dashboardId = uuidv4();

    await db.transaction(async (trx) => {
      if (isDefault) {
        await trx('dashboards')
          .where({ user_id: req.user.id, business_id: req.user.business_id })
          .update({ is_default: false });
      }

      await trx('dashboards').insert({
        id: dashboardId,
        business_id: req.user.business_id,
        user_id: req.user.id,
        name,
        is_default: Boolean(isDefault),
        is_shared: Boolean(isShared),
        shared_scope: sharedScope,
        created_at: new Date(),
        updated_at: new Date()
      });

      if (widgets && widgets.length > 0) {
        const widgetRows = widgets.map((w, idx) => ({
          id: uuidv4(),
          dashboard_id: dashboardId,
          widget_type: w.widgetType,
          title: w.title,
          config_json: JSON.stringify(w.config || {}),
          pos_x: w.posX,
          pos_y: w.posY,
          width: w.width,
          height: w.height,
          sort_order: w.sortOrder !== undefined ? w.sortOrder : idx,
          is_favorite: Boolean(w.isFavorite),
          created_at: new Date(),
          updated_at: new Date()
        }));

        await trx('dashboard_widgets').insert(widgetRows);
      }
    });

    return res.status(201).json({
      message: 'Dashboard creado exitosamente.',
      dashboardId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar layout y widgets de dashboard
 */
async function updateDashboard(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = updateDashboardSchema.parse(req.body);
    const { name, isDefault, isShared, sharedScope, widgets } = parsed;

    const dashboard = await db('dashboards')
      .where({ id, business_id: req.user.business_id })
      .first();

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard no encontrado' });
    }

    if (dashboard.user_id !== req.user.id && !req.user.is_owner) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este dashboard.' });
    }

    await db.transaction(async (trx) => {
      const updates = { updated_at: new Date() };
      if (name) updates.name = name;
      if (isShared !== undefined) updates.is_shared = isShared;
      if (sharedScope !== undefined) updates.shared_scope = sharedScope;

      if (isDefault) {
        await trx('dashboards')
          .where({ user_id: req.user.id, business_id: req.user.business_id })
          .update({ is_default: false });
        updates.is_default = true;
      } else if (isDefault === false) {
        updates.is_default = false;
      }

      await trx('dashboards').where({ id }).update(updates);

      if (widgets !== undefined) {
        await trx('dashboard_widgets').where({ dashboard_id: id }).del();
        if (widgets.length > 0) {
          const widgetRows = widgets.map((w, idx) => ({
            id: w.id || uuidv4(),
            dashboard_id: id,
            widget_type: w.widgetType,
            title: w.title,
            config_json: JSON.stringify(w.config || {}),
            pos_x: w.posX,
            pos_y: w.posY,
            width: w.width,
            height: w.height,
            sort_order: w.sortOrder !== undefined ? w.sortOrder : idx,
            is_favorite: Boolean(w.isFavorite),
            created_at: new Date(),
            updated_at: new Date()
          }));

          await trx('dashboard_widgets').insert(widgetRows);
        }
      }
    });

    return res.status(200).json({ message: 'Dashboard actualizado exitosamente.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Eliminar dashboard
 */
async function deleteDashboard(req, res, next) {
  try {
    const { id } = req.params;

    const dashboard = await db('dashboards')
      .where({ id, business_id: req.user.business_id })
      .first();

    if (!dashboard) {
      return res.status(404).json({ error: 'Dashboard no encontrado' });
    }

    // Comprobar si es el único dashboard del negocio
    const totalDashboards = await db('dashboards')
      .where({ business_id: req.user.business_id })
      .count('id as count')
      .first();

    if (Number(totalDashboards.count) <= 1) {
      return res.status(400).json({
        error: 'Operación no permitida',
        message: 'No puedes eliminar el único dashboard predeterminado del sistema.'
      });
    }

    await db('dashboards').where({ id }).del();

    return res.status(200).json({ message: 'Dashboard eliminado exitosamente.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Duplicar / Clonar dashboard
 */
async function duplicateDashboard(req, res, next) {
  try {
    const { id } = req.params;

    const original = await db('dashboards')
      .where({ id, business_id: req.user.business_id })
      .first();

    if (!original) {
      return res.status(404).json({ error: 'Dashboard original no encontrado' });
    }

    const widgets = await db('dashboard_widgets').where({ dashboard_id: id });
    const newDashboardId = uuidv4();

    await db.transaction(async (trx) => {
      await trx('dashboards').insert({
        id: newDashboardId,
        business_id: req.user.business_id,
        user_id: req.user.id,
        name: `${original.name} (Copia)`,
        is_default: false,
        is_shared: false,
        shared_scope: 'private',
        created_at: new Date(),
        updated_at: new Date()
      });

      if (widgets.length > 0) {
        const clonedWidgets = widgets.map((w) => ({
          id: uuidv4(),
          dashboard_id: newDashboardId,
          widget_type: w.widget_type,
          title: w.title,
          config_json: w.config_json,
          pos_x: w.pos_x,
          pos_y: w.pos_y,
          width: w.width,
          height: w.height,
          sort_order: w.sort_order,
          is_favorite: false,
          created_at: new Date(),
          updated_at: new Date()
        }));
        await trx('dashboard_widgets').insert(clonedWidgets);
      }
    });

    return res.status(201).json({
      message: 'Dashboard duplicado exitosamente.',
      dashboardId: newDashboardId
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Marcar o desmarcar widget favorito
 */
async function toggleFavoriteWidget(req, res, next) {
  try {
    const { widgetId } = req.params;

    const existing = await db('user_favorite_widgets')
      .where({ user_id: req.user.id, widget_id: widgetId })
      .first();

    if (existing) {
      await db('user_favorite_widgets').where({ user_id: req.user.id, widget_id: widgetId }).del();
      return res.status(200).json({ isFavorite: false, message: 'Widget removido de favoritos.' });
    } else {
      await db('user_favorite_widgets').insert({
        id: uuidv4(),
        user_id: req.user.id,
        widget_id: widgetId,
        created_at: new Date()
      });
      return res.status(200).json({ isFavorite: true, message: 'Widget marcado como favorito.' });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDashboards,
  getDashboardById,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  duplicateDashboard,
  toggleFavoriteWidget
};
