
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
// En el futuro se obtendrán del sistema de autenticación.
const currentUserPermissions = ["reports.view", "reports.export"];

export default function CentroAnalitico() {
  const [movements] = useState(initialMovements);
  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [branch, setBranch] = useState("Todas");
  const [type, setType] = useState("Todos");
  const [search, setSearch] = useState("");

  const canExport = currentUserPermissions.includes("reports.export");

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
      name: "Entradas",
      quantity: totalEntries,
      color: "#31976a",
    },
    {
      name: "Salidas",
      quantity: totalExits,
      color: "#d66b6b",
    },
    {
      name: "Ajustes",
      quantity: totalAdjustments,
      color: "#d49a42",
    },
  ];

  const maxQuantity = Math.max(
    ...chartData.map((item) => item.quantity),
    1
  );

  const exportRows = filteredMovements.map((item) => ({
    ID: item.id,
    Fecha: item.date,
    Producto: item.product,
    Categoría: item.category,
    Sucursal: item.branch,
    Movimiento: item.type,
    Cantidad: item.quantity,
  }));

  const exportCSV = () => {
    if (!canExport) return;

    const headers = Object.keys(exportRows[0] || {
      ID: "",
      Fecha: "",
      Producto: "",
      Categoría: "",
      Sucursal: "",
      Movimiento: "",
      Cantidad: "",
    });

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
      "Movimientos"
    );

    XLSX.writeFile(workbook, "reporte-inventario.xlsx");
  };

  const exportPDF = () => {
    if (!canExport) return;

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Reporte de inventario", 14, 18);

    doc.setFontSize(10);
    doc.text(`Fecha inicial: ${startDate || "Sin límite"}`, 14, 27);
    doc.text(`Fecha final: ${endDate || "Sin límite"}`, 14, 33);
    doc.text(`Sucursal: ${branch}`, 14, 39);
    doc.text(`Tipo de movimiento: ${type}`, 14, 45);

    autoTable(doc, {
      startY: 52,
      head: [[
        "Fecha",
        "Producto",
        "Categoría",
        "Sucursal",
        "Movimiento",
        "Cantidad",
      ]],
      body: filteredMovements.map((item) => [
        item.date,
        item.product,
        item.category,
        item.branch,
        item.type,
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
    <main className="analytics-page">
      <header className="analytics-header">
        <div>
          <span className="analytics-eyebrow">REPORTES</span>
          <h1>Centro Analítico</h1>
          <p>
            Consulta y analiza los movimientos de tu inventario.
          </p>
        </div>

        <div className="analytics-header-icon">
          <BarChart3 size={30} />
        </div>
      </header>

      <section className="analytics-filters">
        <div className="analytics-section-title">
          <Filter size={19} />
          <div>
            <h2>Filtros del reporte</h2>
            <p>Selecciona los criterios de consulta.</p>
          </div>
        </div>

        <div className="analytics-filter-grid">
          <label>
            Fecha inicial
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            Fecha final
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <label>
            Sucursal
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
            >
              <option value="Todas">Todas las sucursales</option>
              <option value="Matriz">Matriz</option>
              <option value="Norte">Norte</option>
              <option value="Sur">Sur</option>
            </select>
          </label>

          <label>
            Tipo de movimiento
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="Todos">Todos</option>
              <option value="Entrada">Entradas</option>
              <option value="Salida">Salidas</option>
              <option value="Ajuste">Ajustes</option>
            </select>
          </label>

          <label className="analytics-search">
            Buscar producto o categoría
            <div className="analytics-search-input">
              <Search size={17} />
              <input
                type="text"
                placeholder="Buscar..."
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
            Limpiar filtros
          </button>
        </div>
      </section>

      <section className="analytics-summary">
        <article className="analytics-stat-card">
          <div className="analytics-stat-icon purple">
            <Activity size={21} />
          </div>
          <div>
            <span>Movimientos registrados</span>
            <strong>{totalMovements}</strong>
          </div>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-icon green">
            <ArrowDownToLine size={21} />
          </div>
          <div>
            <span>Unidades ingresadas</span>
            <strong>{totalEntries}</strong>
          </div>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-icon red">
            <ArrowUpFromLine size={21} />
          </div>
          <div>
            <span>Unidades retiradas</span>
            <strong>{totalExits}</strong>
          </div>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-icon orange">
            <Package size={21} />
          </div>
          <div>
            <span>Unidades ajustadas</span>
            <strong>{totalAdjustments}</strong>
          </div>
        </article>
      </section>

      <section className="analytics-chart-card">
        <div className="analytics-section-title">
          <BarChart3 size={20} />
          <div>
            <h2>Movimientos de inventario</h2>
            <p>Distribución según los filtros seleccionados.</p>
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
              <h2>Detalle de movimientos</h2>
              <p>{totalMovements} registros encontrados.</p>
            </div>
          </div>

          <div className="analytics-export-actions">
            <button
              type="button"
              onClick={exportPDF}
              disabled={!canExport}
              title={!canExport ? "Requiere reports.export" : "Exportar PDF"}
            >
              <FileText size={16} />
              PDF
            </button>

            <button
              type="button"
              onClick={exportExcel}
              disabled={!canExport}
              title={!canExport ? "Requiere reports.export" : "Exportar Excel"}
            >
              <FileSpreadsheet size={16} />
              Excel
            </button>

            <button
              type="button"
              onClick={exportCSV}
              disabled={!canExport}
              title={!canExport ? "Requiere reports.export" : "Exportar CSV"}
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        </div>

        {!canExport && (
          <p className="analytics-permission-warning">
            Tu usuario no tiene el permiso reports.export.
          </p>
        )}

        <div className="analytics-table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Sucursal</th>
                <th>Movimiento</th>
                <th>Cantidad</th>
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
                        {item.type}
                      </span>
                    </td>
                    <td>{item.quantity}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="analytics-empty">
                    No se encontraron movimientos con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
