const { v4: uuidv4 } = require('uuid');
const db = require('../../database/connection');
const { recordAuditLog } = require('../../middlewares/auditMiddleware');
const {
  updateCompanySchema,
  updateThemeSchema,
  createBranchSchema,
  createWarehouseSchema
} = require('./settings.validation');

/**
 * Obtener datos y parámetros de la empresa
 */
async function getCompanySettings(req, res, next) {
  try {
    const business = await db('businesses').where({ id: req.user.business_id }).first();

    if (!business) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    let approvalLimits = {};
    try {
      approvalLimits = business.approval_limits_json
        ? JSON.parse(business.approval_limits_json)
        : {};
    } catch (e) {
      approvalLimits = {};
    }

    let themeTokens = {};
    let regional = {};
    let notifications = {};

    if (settings) {
      try {
        themeTokens = settings.theme_tokens_json ? JSON.parse(settings.theme_tokens_json) : {};
      } catch (e) {}
      try {
        regional = settings.regional_settings_json
          ? JSON.parse(settings.regional_settings_json)
          : {};
      } catch (e) {}
      try {
        notifications = settings.notification_settings_json
          ? JSON.parse(settings.notification_settings_json)
          : {};
      } catch (e) {}
    }

    return res.status(200).json({
      company: {
        id: business.id,
        name: business.name,
        legalName: business.legal_name,
        taxId: business.tax_id,
        phone: business.phone,
        email: business.email,
        address: business.address,
        logoUrl: business.logo_url,
        approvalLimits
      },
      settings: {
        theme: themeTokens,
        regional,
        notifications
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar datos de la empresa y límites de aprobación
 */
async function updateCompanySettings(req, res, next) {
  try {
    const parsed = updateCompanySchema.parse(req.body);
    const { name, legalName, taxId, phone, email, address, approvalLimits } = parsed;

    const updates = { updated_at: new Date() };
    if (name) updates.name = name;
    if (legalName !== undefined) updates.legal_name = legalName;
    if (taxId !== undefined) updates.tax_id = taxId;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (approvalLimits !== undefined) updates.approval_limits_json = JSON.stringify(approvalLimits);

    await db('businesses').where({ id: req.user.business_id }).update(updates);

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'settings.update_company',
      entityType: 'business',
      entityId: req.user.business_id,
      newValues: updates,
      req
    });

    return res.status(200).json({ message: 'Datos de la empresa actualizados exitosamente.' });
  } catch (error) {
    next(error);
  }
}

/**
 * Subir logotipo de la empresa (POST /api/settings/company/logo)
 */
async function uploadCompanyLogo(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo de imagen.' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;
    await db('businesses').where({ id: req.user.business_id }).update({
      logo_url: logoUrl,
      updated_at: new Date()
    });

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'settings.update_logo',
      entityType: 'business',
      entityId: req.user.business_id,
      newValues: { logoUrl },
      req
    });

    return res.status(200).json({
      message: 'Logotipo actualizado exitosamente.',
      logoUrl
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener tema visual CSS de la empresa
 */
async function getTheme(req, res, next) {
  try {
    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    let theme = {
      colorPrimary: '#4F46E5',
      colorBg: '#F8FAFC',
      colorSurface: '#FFFFFF',
      borderRadius: '8px',
      tableDensity: 'compact'
    };

    if (settings && settings.theme_tokens_json) {
      try {
        theme = { ...theme, ...JSON.parse(settings.theme_tokens_json) };
      } catch (e) {}
    }

    return res.status(200).json({ theme });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar variables de tema CSS / Design Tokens (PUT /api/settings/theme)
 */
async function updateTheme(req, res, next) {
  try {
    const parsed = updateThemeSchema.parse(req.body);

    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    let currentTheme = {};
    if (settings && settings.theme_tokens_json) {
      try {
        currentTheme = JSON.parse(settings.theme_tokens_json);
      } catch (e) {}
    }

    const updatedTheme = { ...currentTheme, ...parsed };

    if (settings) {
      await db('company_settings')
        .where({ id: settings.id })
        .update({
          theme_tokens_json: JSON.stringify(updatedTheme),
          updated_at: new Date()
        });
    } else {
      await db('company_settings').insert({
        id: uuidv4(),
        business_id: req.user.business_id,
        theme_tokens_json: JSON.stringify(updatedTheme),
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    return res.status(200).json({
      message: 'Tema visual actualizado exitosamente.',
      theme: updatedTheme
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Listar sucursales de la empresa
 */
async function listBranches(req, res, next) {
  try {
    const branches = await db('branches')
      .where({ business_id: req.user.business_id })
      .orderBy('code', 'asc');

    return res.status(200).json({ branches });
  } catch (error) {
    next(error);
  }
}

/**
 * Crear sucursal
 */
async function createBranch(req, res, next) {
  try {
    const { code, name, address } = createBranchSchema.parse(req.body);

    const existing = await db('branches')
      .where({ business_id: req.user.business_id, code })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe una sucursal con este código.' });
    }

    const branchId = uuidv4();
    await db('branches').insert({
      id: branchId,
      business_id: req.user.business_id,
      code,
      name,
      address: address || null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    return res.status(201).json({ message: 'Sucursal creada exitosamente.', branchId });
  } catch (error) {
    next(error);
  }
}

/**
 * Listar almacenes de la empresa
 */
async function listWarehouses(req, res, next) {
  try {
    const { branchId } = req.query;

    let query = db('warehouses')
      .join('branches', 'warehouses.branch_id', 'branches.id')
      .where('warehouses.business_id', req.user.business_id)
      .select(
        'warehouses.id',
        'warehouses.business_id',
        'warehouses.branch_id',
        'branches.name as branch_name',
        'warehouses.code',
        'warehouses.name',
        'warehouses.is_active',
        'warehouses.created_at'
      )
      .orderBy('warehouses.code', 'asc');

    if (branchId) {
      query = query.where('warehouses.branch_id', branchId);
    }

    const warehouses = await query;
    return res.status(200).json({ warehouses });
  } catch (error) {
    next(error);
  }
}

/**
 * Crear almacén
 */
async function createWarehouse(req, res, next) {
  try {
    const { branchId, code, name } = createWarehouseSchema.parse(req.body);

    const branch = await db('branches')
      .where({ id: branchId, business_id: req.user.business_id })
      .first();

    if (!branch) {
      return res.status(404).json({ error: 'Sucursal no encontrada.' });
    }

    const existing = await db('warehouses')
      .where({ business_id: req.user.business_id, code })
      .first();

    if (existing) {
      return res.status(409).json({ error: 'Ya existe un almacén con este código.' });
    }

    const warehouseId = uuidv4();
    await db('warehouses').insert({
      id: warehouseId,
      business_id: req.user.business_id,
      branch_id: branchId,
      code,
      name,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });

    return res.status(201).json({ message: 'Almacén creado exitosamente.', warehouseId });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo,
  getTheme,
  updateTheme,
  listBranches,
  createBranch,
  listWarehouses,
  createWarehouse
};
