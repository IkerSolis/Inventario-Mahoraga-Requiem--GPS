const reportsService = require('./reports.service');
const { exportReport } = require('./reports.exporter');
const {
  reportNames,
  reportFiltersSchema,
  exportFormatSchema,
  exportAuditFiltersSchema
} = require('./reports.validation');

const fileTypes = {
  csv: { contentType: 'text/csv; charset=utf-8', extension: 'csv' },
  xlsx: {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx'
  },
  pdf: { contentType: 'application/pdf', extension: 'pdf' }
};

class ReportsController {
  parseReportName(value) {
    if (reportNames.includes(value)) return value;
    const error = new Error('Reporte no encontrado');
    error.statusCode = 404;
    throw error;
  }

  parseFilters(query) {
    const result = reportFiltersSchema.safeParse(query);
    if (!result.success) {
      const error = new Error('Filtros de reporte invalidos');
      error.statusCode = 400;
      error.details = result.error.format();
      throw error;
    }
    return result.data;
  }

  async getReport(req, res) {
    try {
      const reportName = this.parseReportName(req.params.report);
      const filters = this.parseFilters(req.query);
      const canReadCosts = req.user.permissions.includes('costs.read');
      const report = await reportsService.getReport(
        req.user.business_id,
        reportName,
        filters,
        canReadCosts
      );
      return res.status(200).json({ ok: true, ...report });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        ok: false,
        error: error.message || 'Error al generar reporte',
        ...(error.details ? { details: error.details } : {})
      });
    }
  }

  async export(req, res) {
    try {
      const reportName = this.parseReportName(req.params.report);
      const filters = this.parseFilters(req.query);
      const parsedFormat = exportFormatSchema.safeParse(req.query.format);
      if (!parsedFormat.success) {
        return res.status(400).json({
          ok: false,
          error: 'El formato debe ser csv, xlsx o pdf'
        });
      }

      const format = parsedFormat.data;
      const report = await reportsService.getReport(
        req.user.business_id,
        reportName,
        filters,
        req.user.permissions.includes('costs.read')
      );
      const file = exportReport(report, format);
      await reportsService.recordExport(
        req.user.business_id,
        req.user.id,
        reportName,
        format,
        filters,
        report.rows.length
      );

      const fileType = fileTypes[format];
      const filename = `${reportName}-${new Date().toISOString().slice(0, 10)}.${fileType.extension}`;
      res.set({
        'Content-Type': fileType.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': file.length
      });
      return res.status(200).send(file);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        ok: false,
        error: error.message || 'Error al exportar reporte',
        ...(error.details ? { details: error.details } : {})
      });
    }
  }

  async exportAudit(req, res) {
    try {
      const parsed = exportAuditFiltersSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: 'Filtros de auditoria invalidos',
          details: parsed.error.format()
        });
      }
      const filters = parsed.data;
      const result = await reportsService.listExportAudit(req.user.business_id, filters);
      return res.status(200).json({ ok: true, ...result });
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        ok: false,
        error: error.message || 'Error al consultar auditoria de exportaciones',
        ...(error.details ? { details: error.details } : {})
      });
    }
  }
}

module.exports = new ReportsController();
