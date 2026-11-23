import { useMemo, useState } from "react";
import {
  BarChart3,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  FileSpreadsheet,
  FileText,
  Download,
  Filter,
  Search,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useTheme } from "../../context/ThemeContext";
import "./CentroAnalitico.css";

// Datos demostrativos. Después se conectarán con la API.
const initialMovements = [
  { id: 1, date: "2026-11-01", product: "Laptop Lenovo", category: "Tecnología", branch: "Matriz", type: "Entrada", quantity: 15 },
  { id: 2, date: "2026-11-02", product: "Mouse inalámbrico", category: "Accesorios", branch: "Norte", type: "Salida", quantity: 8 },
  { id: 3, date: "2026-11-03", product: "Teclado mecánico", category: "Accesorios", branch: "Matriz", type: "Entrada", quantity: 20 },
  { id: 4, date: "2026-11-04", product: "Monitor 24 pulgadas", category: "Tecnología", branch: "Sur", type: "Salida", quantity: 5 },
  { id: 5, date: "2026-11-05", product: "Cable HDMI", category: "Cables", branch: "Norte", type: "Entrada", quantity: 30 },
  { id: 6, date: "2026-11-06", product: "Audífonos", category: "Accesorios", branch: "Matriz", type: "Salida", quantity: 12 },
  { id: 7, date: "2026-11-07", product: "Laptop Lenovo", category: "Tecnología", branch: "Sur", type: "Entrada", quantity: 10 },
  { id: 8, date: "2026-11-08", product: "Cable HDMI", category: "Cables", branch: "Matriz", type: "Salida", quantity: 7 },
  { id: 9, date: "2026-11-09", product: "Monitor 24 pulgadas", category: "Tecnología", branch: "Norte", type: "Entrada", quantity: 9 },
  { id: 10, date: "2026-11-10", product: "Mouse inalámbrico", category: "Accesorios", branch: "Sur", type: "Entrada", quantity: 25 },
  { id: 11, date: "2026-11-11", product: "Teclado mecánico", category: "Accesorios", branch: "Norte", type: "Salida", quantity: 6 },
  { id: 12, date: "2026-11-12", product: "Audífonos", category: "Accesorios", branch: "Matriz", type: "Entrada", quantity: 18 },
  { id: 13, date: "2026-11-13", product: "Cable HDMI", category: "Cables", branch: "Sur", type: "Ajuste", quantity: 3 },
];

// Permisos de demostración del usuario actual.
const currentUserPermissions = ["reports.view", "reports.export"];

export default function CentroAnalitico() {
  const { t } = useTheme();

  const [movements] = useState(initialMovements);
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [branch, setBranch] = useState("Todas");
  const [type, setType] = useState("Todos");
  const [search, setSearch] = useState("");

  const canExport = currentUserPermissions.includes("reports.export");

  const translateMovementType = (movementType) => {
    const translations = {
      Entrada: t("analyticsEntry"),
      Salida: t("analyticsExit"),
      Ajuste: t("analyticsAdjustment"),
    };

    return translations[movementType] ?? movementType;
  };

  const filteredMovements = useMemo(() => {
    return movements.filter((movement) => {
      const matchesDate =
        (!startDate || movement.date >= startDate) &&
        (!endDate || movement.date <= endDate);

      const matchesBranch =
        branch === "Todas" || movement.branch === branch;

      const matchesType =
        type === "Todos" || movement.type === type;

      const matchesSearch =
        movement.product.toLowerCase().includes(search.toLowerCase()) ||
        movement.category.toLowerCase().includes(search.toLowerCase());

      return matchesDate && matchesBranch && matchesType && matchesSearch;
    });
  }, [movements, startDate, endDate, branch, type, search]);

  const totalMovements = filteredMovements.length;

  const totalEntries = filteredMovements
    .filter((item) => item.type === "Entrada")
    .reduce((total, item) => total + item.quantity, 0);

  const totalExits = filteredMovements
    .filter((item) => item.type === "Salida")
    .reduce((total, item) => total + item.quantity, 0);

  const totalAdjustments = filteredMovements
    .filter((item) => item.type === "Ajuste")
    .reduce((total, item) => total + item.quantity, 0);

  const chartData = [
    {
      name: t("analyticsEntries"),
      quantity: totalEntries,
      color: "#31976a",
    },
    {
      name: t("analyticsExits"),
      quantity: totalExits,
      color: "#d66b6b",
    },
    {
      name: t("analyticsAdjustments"),
      quantity: totalAdjustments,
      color: "#d49a42",
    },
  ];

  const maxQuantity = Math.max(
    ...chartData.map((item) => item.quantity),
    1
  );

  const exportRows = filteredMovements.map((item) => ({
    [t("analyticsId")]: item.id,
    [t("analyticsDate")]: item.date,
    [t("analyticsProduct")]: item.product,
    [t("analyticsCategory")]: item.category,
    [t("analyticsBranch")]: item.branch,
    [t("analyticsMovement")]: translateMovementType(item.type),
    [t("analyticsQuantity")]: item.quantity,
  }));

  const exportCSV = () => {
    if (!canExport) return;

    const headers = Object.keys(
      exportRows[0] || {
        [t("analyticsId")]: "",
        [t("analyticsDate")]: "",
        [t("analyticsProduct")]: "",
        [t("analyticsCategory")]: "",
        [t("analyticsBranch")]: "",
        [t("analyticsMovement")]: "",
        [t("analyticsQuantity")]: "",
      }
    );

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const content = [
      headers.map(escapeCSV).join(","),
      ...exportRows.map((row) =>
        headers.map((header) => escapeCSV(row[header])).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + content], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-inventario.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    if (!canExport) return;

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      t("analyticsMovementsSheet")
    );

    XLSX.writeFile(workbook, "reporte-inventario.xlsx");
  };

  const exportPDF = () => {
    if (!canExport) return;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(t("analyticsReportTitle"), 14, 18);

    doc.setFontSize(10);
    doc.text(
      `${t("analyticsStartDate")}: ${startDate || t("analyticsNoLimit")}`,
      14,
      27
    );
    doc.text(
      `${t("analyticsEndDate")}: ${endDate || t("analyticsNoLimit")}`,
      14,
      33
    );
    doc.text(
      `${t("analyticsBranch")}: ${branch === "Todas" ? t("analyticsAllBranches") : branch}`,
      14,
      39
    );
    doc.text(
      `${t("analyticsMovementType")}: ${type === "Todos" ? t("analyticsAllTypes") : translateMovementType(type)}`,
      14,
      45
    );

    autoTable(doc, {
      startY: 52,
      head: [[
        t("analyticsDate"),
        t("analyticsProduct"),
        t("analyticsCategory"),
        t("analyticsBranch"),
        t("analyticsMovement"),
        t("analyticsQuantity"),
      ]],
      body: filteredMovements.map((item) => [
        item.date,
        item.product,
        item.category,
        item.branch,
        translateMovementType(item.type),
        item.quantity,
      ]),
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fillColor: [82, 101, 216],
      },
    });

    doc.save("reporte-inventario.pdf");
  };

  const resetFilters = () => {
    setStartDate("2026-11-01");
    setEndDate("2026-11-30");
    setBranch("Todas");
    setType("Todos");
    setSearch("");
  };

  return (
    <section className="analytics-page">
      <header className="analytics-header">
        <div>
          <span className="analytics-eyebrow">
            {t("analyticsReportsEyebrow")}
          </span>
          <h1>{t("analyticsTitle")}</h1>
          <p>{t("analyticsDescription")}</p>
        </div>

        <div className="analytics-header-icon">
          <BarChart3 size={30} />
        </div>
      </header>

      <section className="analytics-filters">
        <div className="analytics-section-title">
          <Filter size={19} />
          <div>
            <h2>{t("analyticsFiltersTitle")}</h2>
            <p>{t("analyticsFiltersDescription")}</p>
          </div>
        </div>

        <div className="analytics-filter-grid">
          <label>
            {t("analyticsStartDate")}
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            {t("analyticsEndDate")}
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <label>
            {t("analyticsBranch")}
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
            >
              <option value="Todas">{t("analyticsAllBranches")}</option>
              <option value="Matriz">Matriz</option>
              <option value="Norte">Norte</option>
              <option value="Sur">Sur</option>
            </select>
          </label>

          <label>
            {t("analyticsMovementType")}
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="Todos">{t("analyticsAllTypes")}</option>
              <option value="Entrada">{t("analyticsEntries")}</option>
              <option value="Salida">{t("analyticsExits")}</option>
              <option value="Ajuste">{t("analyticsAdjustments")}</option>
            </select>
          </label>

          <label className="analytics-search">
            {t("analyticsSearchLabel")}
            <div className="analytics-search-input">
              <Search size={17} />
              <input
                type="text"
                placeholder={t("analyticsSearchPlaceholder")}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </label>

          <button
            type="button"
            className="analytics-reset-button"
            onClick={resetFilters}
          >
            <RefreshCw size={16} />
            {t("analyticsClearFilters")}
          </button>
        </div>
      </section>

      <section className="analytics-summary">
        <article className="analytics-stat-card">
          <div className="analytics-stat-icon purple">
            <Activity size={21} />
          </div>
          <div>
            <span>{t("analyticsRegisteredMovements")}</span>
            <strong>{totalMovements}</strong>
          </div>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-icon green">
            <ArrowDownToLine size={21} />
          </div>
          <div>
            <span>{t("analyticsUnitsEntered")}</span>
            <strong>{totalEntries}</strong>
          </div>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-icon red">
            <ArrowUpFromLine size={21} />
          </div>
          <div>
            <span>{t("analyticsUnitsRemoved")}</span>
            <strong>{totalExits}</strong>
          </div>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-icon orange">
            <Package size={21} />
          </div>
          <div>
            <span>{t("analyticsUnitsAdjusted")}</span>
            <strong>{totalAdjustments}</strong>
          </div>
        </article>
      </section>

      <section className="analytics-chart-card">
        <div className="analytics-section-title">
          <BarChart3 size={20} />
          <div>
            <h2>{t("analyticsChartTitle")}</h2>
            <p>{t("analyticsChartDescription")}</p>
          </div>
        </div>

        <div className="analytics-chart">
          {chartData.map((item) => (
            <div className="analytics-chart-row" key={item.name}>
              <span>{item.name}</span>
              <div className="analytics-chart-track">
                <div
                  className="analytics-chart-bar"
                  style={{
                    width: `${(item.quantity / maxQuantity) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
              <strong>{item.quantity}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="analytics-table-card">
        <div className="analytics-table-header">
          <div className="analytics-section-title">
            <FileSpreadsheet size={20} />
            <div>
              <h2>{t("analyticsDetailTitle")}</h2>
              <p>
                {totalMovements} {t("analyticsRecordsFound")}
              </p>
            </div>
          </div>

          <div className="analytics-export-actions">
            <button
              type="button"
              onClick={exportPDF}
              disabled={!canExport}
              title={
                !canExport
                  ? t("analyticsExportPermissionRequired")
                  : t("analyticsExportPDF")
              }
            >
              <FileText size={16} />
              PDF
            </button>

            <button
              type="button"
              onClick={exportExcel}
              disabled={!canExport}
              title={
                !canExport
                  ? t("analyticsExportPermissionRequired")
                  : t("analyticsExportExcel")
              }
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={!canExport}
              title={
                !canExport
                  ? t("analyticsExportPermissionRequired")
                  : t("analyticsExportCSV")
              }
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        </div>

        {!canExport && (
          <p className="analytics-permission-warning">
            {t("analyticsPermissionWarning")}
          </p>
        )}

        <div className="analytics-table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>{t("analyticsDate")}</th>
                <th>{t("analyticsProduct")}</th>
                <th>{t("analyticsCategory")}</th>
                <th>{t("analyticsBranch")}</th>
                <th>{t("analyticsMovement")}</th>
                <th>{t("analyticsQuantity")}</th>
              </tr>
            </thead>

            <tbody>
              {filteredMovements.length > 0 ? (
                filteredMovements.map((item) => (
                  <tr key={item.id}>
                    <td>{item.date}</td>
                    <td>{item.product}</td>
                    <td>{item.category}</td>
                    <td>{item.branch}</td>
                    <td>
                      <span
                        className={`analytics-movement-badge ${item.type.toLowerCase()}`}
                      >
                        {translateMovementType(item.type)}
                      </span>
                    </td>
                    <td>{item.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    {t("analyticsNoMovements")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}