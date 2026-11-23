const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../../database/connection');
const { recordAuditLog } = require('../../middlewares/auditMiddleware');
const { sendMail } = require('../../utils/mailer');
const {
  updateCompanySchema,
  updateThemeSchema,
  updateRegionalSchema,
  updateNotificationsSchema,
  updateSmtpSchema,
  testSmtpSchema,
  createBranchSchema,
  updateBranchSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  onboardingSchema
} = require('./settings.validation');

/**
 * Helper para parsear JSON de forma segura
 */
function safeJsonParse(raw, fallback = {}) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

/**
 * Helper para asegurar existencia de registro en company_settings
 */
async function upsertCompanySettingField(businessId, columnName, valueObj) {
  const settings = await db('company_settings').where({ business_id: businessId }).first();
  if (settings) {
    await db('company_settings')
      .where({ id: settings.id })
      .update({
        [columnName]: JSON.stringify(valueObj),
        updated_at: new Date()
      });
  } else {
    await db('company_settings').insert({
      id: uuidv4(),
      business_id: businessId,
      [columnName]: JSON.stringify(valueObj),
      created_at: new Date(),
      updated_at: new Date()
    });
  }
}

/**
 * Consultar estado del asistente de primer inicio (GET /api/settings/onboarding/status)
 */
async function getOnboardingStatus(req, res, next) {
  try {
    const businessCount = await db('businesses').count('id as total').first();
    const ownerCount = await db('users')
      .where({ is_owner: true, deleted_at: null })
      .count('id as total')
      .first();

    const initialized = Number(businessCount.total) > 0 && Number(ownerCount.total) > 0;
    return res.status(200).json({ initialized });
  } catch (error) {
    next(error);
  }
}

/**
 * Asistente de primer inicio / Onboarding Wizard (POST /api/settings/onboarding)
 * Solo ejecutable cuando la base de datos no tiene un negocio/propietario inicializado
 */
async function completeOnboarding(req, res, next) {
  try {
    const existingBusiness = await db('businesses').first();
    if (existingBusiness) {
      return res.status(403).json({
        error: 'Sistema ya inicializado',
        message: 'El asistente de primer inicio ya fue completado anteriormente.'
      });
    }

    const parsed = onboardingSchema.parse(req.body);
    const businessId = uuidv4();
    const branchId = uuidv4();
    const warehouseId = uuidv4();
    const ownerUserId = uuidv4();
    const ownerRoleId = uuidv4();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsed.ownerPassword, salt);

    await db.transaction(async (trx) => {
      await trx('businesses').insert({
        id: businessId,
        name: parsed.companyName,
        legal_name: parsed.legalName || null,
        tax_id: parsed.taxId || null,
        approval_limits_json: JSON.stringify({
          maxUnapprovedAdjustmentAmount: 5000,
          maxUnapprovedAdjustmentQty: 20
        }),
        created_at: new Date(),
        updated_at: new Date()
      });

      await trx('branches').insert({
        id: branchId,
        business_id: businessId,
        code: parsed.branchCode,
        name: parsed.branchName,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      await trx('warehouses').insert({
        id: warehouseId,
        business_id: businessId,
        branch_id: branchId,
        code: parsed.warehouseCode,
        name: parsed.warehouseName,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      await trx('company_settings').insert({
        id: uuidv4(),
        business_id: businessId,
        theme_tokens_json: JSON.stringify({
          mode: 'light',
          colorPrimary: '#4F46E5',
          colorBg: '#F8FAFC',
          colorSurface: '#FFFFFF',
          borderRadius: '8px',
          tableDensity: 'compact'
        }),
        regional_settings_json: JSON.stringify({
          locale: 'es-MX',
          currency: 'MXN',
          currencySymbol: '$',
          decimals: 2,
          dateFormat: 'DD/MM/YYYY',
          timezone: 'America/Mexico_City'
        }),
        notification_settings_json: JSON.stringify({
          lowStockAlert: true,
          pendingApprovalAlert: true,
          fifoExpirationAlertDays: 15,
          dailySummaryEmail: false,
          pushEnabled: true,
          emailEnabled: true
        }),
        created_at: new Date(),
        updated_at: new Date()
      });

      // Crear rol Propietario (R0) protegido
      await trx('roles').insert({
        id: ownerRoleId,
        business_id: businessId,
        code: 'owner',
        name: 'Propietario / Dueño',
        description: 'Control total de la empresa y configuración. Acceso completo e inmutable.',
        is_default: true,
        is_protected: true,
        created_at: new Date(),
        updated_at: new Date()
      });

      await trx('users').insert({
        id: ownerUserId,
        business_id: businessId,
        name: parsed.ownerName,
        email: parsed.ownerEmail,
        password_hash: passwordHash,
        status: 'active',
        is_owner: true,
        failed_login_attempts: 0,
        created_at: new Date(),
        updated_at: new Date()
      });

      await trx('user_roles').insert({
        id: uuidv4(),
        user_id: ownerUserId,
        role_id: ownerRoleId,
        created_at: new Date()
      });

      await trx('password_history').insert({
        id: uuidv4(),
        user_id: ownerUserId,
        password_hash: passwordHash,
        created_at: new Date()
      });
    });

    await recordAuditLog({
      businessId,
      userId: ownerUserId,
      action: 'settings.onboarding_completed',
      entityType: 'business',
      entityId: businessId,
      newValues: { companyName: parsed.companyName, ownerEmail: parsed.ownerEmail },
      req
    });

    return res.status(201).json({
      message: 'Configuración inicial completada exitosamente.',
      businessId,
      branchId,
      warehouseId,
      ownerUserId
    });
  } catch (error) {
    next(error);
  }
}

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

    const approvalLimits = safeJsonParse(business.approval_limits_json, {});
    const themeTokens = settings ? safeJsonParse(settings.theme_tokens_json, {}) : {};
    const regional = settings ? safeJsonParse(settings.regional_settings_json, {}) : {};
    const notifications = settings ? safeJsonParse(settings.notification_settings_json, {}) : {};

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

    const defaultTheme = {
      mode: 'light',
      colorPrimary: '#4F46E5',
      colorBg: '#F8FAFC',
      colorSurface: '#FFFFFF',
      colorSuccess: '#10B981',
      colorWarning: '#F59E0B',
      colorDanger: '#EF4444',
      borderRadius: '8px',
      tableDensity: 'compact'
    };

    const stored = settings ? safeJsonParse(settings.theme_tokens_json, {}) : {};
    return res.status(200).json({ theme: { ...defaultTheme, ...stored } });
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

    const currentTheme = settings ? safeJsonParse(settings.theme_tokens_json, {}) : {};
    const updatedTheme = { ...currentTheme, ...parsed };

    await upsertCompanySettingField(req.user.business_id, 'theme_tokens_json', updatedTheme);

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'settings.update_theme',
      entityType: 'company_settings',
      entityId: req.user.business_id,
      oldValues: currentTheme,
      newValues: updatedTheme,
      req
    });

    return res.status(200).json({
      message: 'Tema visual actualizado exitosamente.',
      theme: updatedTheme
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener configuración regional: idioma, moneda y zona horaria (GET /api/settings/regional)
 */
async function getRegionalSettings(req, res, next) {
  try {
    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    const defaultRegional = {
      locale: 'es-MX',
      currency: 'MXN',
      currencySymbol: '$',
      decimals: 2,
      dateFormat: 'DD/MM/YYYY',
      timezone: 'America/Mexico_City'
    };

    const stored = settings ? safeJsonParse(settings.regional_settings_json, {}) : {};
    return res.status(200).json({ regional: { ...defaultRegional, ...stored } });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar configuración regional: idioma y monedas (PUT /api/settings/regional)
 */
async function updateRegionalSettings(req, res, next) {
  try {
    const parsed = updateRegionalSchema.parse(req.body);
    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    const currentRegional = settings ? safeJsonParse(settings.regional_settings_json, {}) : {};
    const updatedRegional = { ...currentRegional, ...parsed };

    await upsertCompanySettingField(
      req.user.business_id,
      'regional_settings_json',
      updatedRegional
    );

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'settings.update_regional',
      entityType: 'company_settings',
      entityId: req.user.business_id,
      oldValues: currentRegional,
      newValues: updatedRegional,
      req
    });

    return res.status(200).json({
      message: 'Configuración regional actualizada exitosamente.',
      regional: updatedRegional
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener configuración de notificaciones y alertas (GET /api/settings/notifications)
 */
async function getNotificationSettings(req, res, next) {
  try {
    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    const defaultNotifications = {
      lowStockAlert: true,
      pendingApprovalAlert: true,
      fifoExpirationAlertDays: 15,
      dailySummaryEmail: false,
      pushEnabled: true,
      emailEnabled: true
    };

    const stored = settings ? safeJsonParse(settings.notification_settings_json, {}) : {};
    return res.status(200).json({ notifications: { ...defaultNotifications, ...stored } });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar configuración de notificaciones y umbrales de alertas (PUT /api/settings/notifications)
 */
async function updateNotificationSettings(req, res, next) {
  try {
    const parsed = updateNotificationsSchema.parse(req.body);
    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    const currentNotif = settings ? safeJsonParse(settings.notification_settings_json, {}) : {};
    const updatedNotif = { ...currentNotif, ...parsed };

    await upsertCompanySettingField(
      req.user.business_id,
      'notification_settings_json',
      updatedNotif
    );

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'settings.update_notifications',
      entityType: 'company_settings',
      entityId: req.user.business_id,
      oldValues: currentNotif,
      newValues: updatedNotif,
      req
    });

    return res.status(200).json({
      message: 'Configuración de notificaciones actualizada exitosamente.',
      notifications: updatedNotif
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Obtener configuración SMTP enmascarando contraseña (GET /api/settings/smtp)
 */
async function getSmtpSettings(req, res, next) {
  try {
    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    const stored = settings ? safeJsonParse(settings.smtp_settings_json, {}) : {};
    const masked = {
      host: stored.host || '',
      port: stored.port || 587,
      secure: Boolean(stored.secure),
      user: stored.user || '',
      hasPassword: Boolean(stored.pass),
      from: stored.from || ''
    };

    return res.status(200).json({ smtp: masked });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar parámetros de servidor de correos SMTP (PUT /api/settings/smtp)
 */
async function updateSmtpSettings(req, res, next) {
  try {
    const parsed = updateSmtpSchema.parse(req.body);
    const settings = await db('company_settings')
      .where({ business_id: req.user.business_id })
      .first();

    const currentSmtp = settings ? safeJsonParse(settings.smtp_settings_json, {}) : {};
    const updatedSmtp = {
      host: parsed.host,
      port: parsed.port,
      secure: parsed.secure,
      user: parsed.user,
      pass: parsed.pass !== undefined ? parsed.pass : currentSmtp.pass || '',
      from: parsed.from
    };

    await upsertCompanySettingField(req.user.business_id, 'smtp_settings_json', updatedSmtp);

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'settings.update_smtp',
      entityType: 'company_settings',
      entityId: req.user.business_id,
      newValues: { host: updatedSmtp.host, port: updatedSmtp.port, from: updatedSmtp.from },
      req
    });

    return res.status(200).json({
      message: 'Configuración de servidor SMTP actualizada exitosamente.',
      smtp: {
        host: updatedSmtp.host,
        port: updatedSmtp.port,
        secure: updatedSmtp.secure,
        user: updatedSmtp.user,
        hasPassword: Boolean(updatedSmtp.pass),
        from: updatedSmtp.from
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Enviar correo de prueba con la configuración SMTP actual (POST /api/settings/smtp/test)
 */
async function testSmtpSettings(req, res, next) {
  try {
    const { to } = testSmtpSchema.parse(req.body);

    const result = await sendMail({
      to,
      subject: 'Correo de prueba - Inventarios Mahoraga',
      text: 'Este es un correo de prueba enviado desde el módulo de Configuración de Inventarios Mahoraga para validar tu servidor SMTP.',
      html: '<p>Este es un correo de prueba enviado desde el módulo de <strong>Configuración de Inventarios Mahoraga</strong>.</p>'
    });

    if (result && result.error) {
      return res.status(502).json({
        error: 'Error al enviar correo de prueba',
        message: result.error
      });
    }

    return res.status(200).json({
      message: `Correo de prueba enviado exitosamente a ${to}.`,
      messageId: result.messageId || null
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

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'locations.create_branch',
      entityType: 'branch',
      entityId: branchId,
      newValues: { code, name, address },
      req
    });

    return res.status(201).json({ message: 'Sucursal creada exitosamente.', branchId });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar sucursal existente (PUT /api/settings/branches/:id)
 */
async function updateBranch(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = updateBranchSchema.parse(req.body);

    const branch = await db('branches').where({ id, business_id: req.user.business_id }).first();

    if (!branch) {
      return res.status(404).json({ error: 'Sucursal no encontrada.' });
    }

    if (parsed.code && parsed.code !== branch.code) {
      const clash = await db('branches')
        .where({ business_id: req.user.business_id, code: parsed.code })
        .whereNot({ id })
        .first();
      if (clash) {
        return res.status(409).json({ error: 'Ya existe otra sucursal con este código.' });
      }
    }

    const updates = { updated_at: new Date() };
    if (parsed.code !== undefined) updates.code = parsed.code;
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.address !== undefined) updates.address = parsed.address;
    if (parsed.isActive !== undefined) updates.is_active = parsed.isActive;

    await db('branches').where({ id }).update(updates);

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'locations.update_branch',
      entityType: 'branch',
      entityId: id,
      oldValues: { code: branch.code, name: branch.name, is_active: Boolean(branch.is_active) },
      newValues: updates,
      req
    });

    return res.status(200).json({ message: 'Sucursal actualizada exitosamente.' });
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

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'locations.create_warehouse',
      entityType: 'warehouse',
      entityId: warehouseId,
      newValues: { branchId, code, name },
      req
    });

    return res.status(201).json({ message: 'Almacén creado exitosamente.', warehouseId });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualizar almacén existente (PUT /api/settings/warehouses/:id)
 */
async function updateWarehouse(req, res, next) {
  try {
    const { id } = req.params;
    const parsed = updateWarehouseSchema.parse(req.body);

    const warehouse = await db('warehouses')
      .where({ id, business_id: req.user.business_id })
      .first();

    if (!warehouse) {
      return res.status(404).json({ error: 'Almacén no encontrado.' });
    }

    if (parsed.branchId && parsed.branchId !== warehouse.branch_id) {
      const targetBranch = await db('branches')
        .where({ id: parsed.branchId, business_id: req.user.business_id })
        .first();
      if (!targetBranch) {
        return res.status(404).json({ error: 'La sucursal destino no existe.' });
      }
    }

    if (parsed.code && parsed.code !== warehouse.code) {
      const clash = await db('warehouses')
        .where({ business_id: req.user.business_id, code: parsed.code })
        .whereNot({ id })
        .first();
      if (clash) {
        return res.status(409).json({ error: 'Ya existe otro almacén con este código.' });
      }
    }

    const updates = { updated_at: new Date() };
    if (parsed.branchId !== undefined) updates.branch_id = parsed.branchId;
    if (parsed.code !== undefined) updates.code = parsed.code;
    if (parsed.name !== undefined) updates.name = parsed.name;
    if (parsed.isActive !== undefined) updates.is_active = parsed.isActive;

    await db('warehouses').where({ id }).update(updates);

    await recordAuditLog({
      businessId: req.user.business_id,
      userId: req.user.id,
      action: 'locations.update_warehouse',
      entityType: 'warehouse',
      entityId: id,
      oldValues: {
        code: warehouse.code,
        name: warehouse.name,
        is_active: Boolean(warehouse.is_active)
      },
      newValues: updates,
      req
    });

    return res.status(200).json({ message: 'Almacén actualizado exitosamente.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getOnboardingStatus,
  completeOnboarding,
  getCompanySettings,
  updateCompanySettings,
  uploadCompanyLogo,
  getTheme,
  updateTheme,
  getRegionalSettings,
  updateRegionalSettings,
  getNotificationSettings,
  updateNotificationSettings,
  getSmtpSettings,
  updateSmtpSettings,
  testSmtpSettings,
  listBranches,
  createBranch,
  updateBranch,
  listWarehouses,
  createWarehouse,
  updateWarehouse
};
