"use strict";

const STORAGE_KEY = "finance-customer-manager-v1";
const TEXT_DECODER = new TextDecoder("utf-8");
const TEXT_ENCODER = new TextEncoder();

const state = {
  records: [],
  filtered: [],
  page: 1,
  pageSize: 20,
  filters: {
    query: "",
    status: "",
    area: "",
    condition: "",
    service: "",
  },
  selectedId: null,
  editingId: null,
  editBaseline: null,
  confirmAction: null,
};

const els = {
  fileInput: document.getElementById("fileInput"),
  addRecordBtn: document.getElementById("addRecordBtn"),
  exportXlsxBtn: document.getElementById("exportXlsxBtn"),
  filterForm: document.getElementById("filterForm"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  searchInput: document.getElementById("searchInput"),
  statusFilter: document.getElementById("statusFilter"),
  areaFilter: document.getElementById("areaFilter"),
  conditionFilter: document.getElementById("conditionFilter"),
  serviceFilter: document.getElementById("serviceFilter"),
  pageSizeSelect: document.getElementById("pageSizeSelect"),
  prevPageBtn: document.getElementById("prevPageBtn"),
  nextPageBtn: document.getElementById("nextPageBtn"),
  pageInfo: document.getElementById("pageInfo"),
  recordsBody: document.getElementById("recordsBody"),
  emptyState: document.getElementById("emptyState"),
  activeFilterText: document.getElementById("activeFilterText"),
  metricFiltered: document.getElementById("metricFiltered"),
  metricTotal: document.getElementById("metricTotal"),
  metricCalled: document.getElementById("metricCalled"),
  metricMissed: document.getElementById("metricMissed"),
  metricAreas: document.getElementById("metricAreas"),
  statusChart: document.getElementById("statusChart"),
  areaChart: document.getElementById("areaChart"),
  statusLegend: document.getElementById("statusLegend"),
  detailModal: document.getElementById("detailModal"),
  detailTitle: document.getElementById("detailTitle"),
  detailContent: document.getElementById("detailContent"),
  openEditBtn: document.getElementById("openEditBtn"),
  deleteRecordBtn: document.getElementById("deleteRecordBtn"),
  editModal: document.getElementById("editModal"),
  editTitle: document.getElementById("editTitle"),
  editModeLabel: document.getElementById("editModeLabel"),
  editForm: document.getElementById("editForm"),
  saveEditBtn: document.getElementById("saveEditBtn"),
  areaOptions: document.getElementById("areaOptions"),
  statusOptions: document.getElementById("statusOptions"),
  serviceOptions: document.getElementById("serviceOptions"),
  confirmModal: document.getElementById("confirmModal"),
  confirmPanel: document.querySelector("#confirmModal .confirm-panel"),
  confirmLabel: document.getElementById("confirmLabel"),
  confirmTitle: document.getElementById("confirmTitle"),
  confirmMessage: document.getElementById("confirmMessage"),
  cancelConfirmBtn: document.getElementById("cancelConfirmBtn"),
  acceptConfirmBtn: document.getElementById("acceptConfirmBtn"),
  toast: document.getElementById("toast"),
};

const fieldLabels = {
  service: "Dịch vụ",
  name: "Tên khách hàng",
  social: "Zalo / Facebook",
  phone: "Số điện thoại",
  area: "Địa phương",
  need: "Nhu cầu, tình trạng khách",
  status: "Tình trạng xử lý",
  notes: "Ghi chú",
  sourceSheet: "Nguồn sheet",
  updatedAt: "Cập nhật lúc",
};

const statusRules = [
  {
    keys: ["da goi", "da lien he", "lien he roi"],
    bg: "#c8f3df",
    fg: "#064e3b",
    border: "#059669",
    chart: "#059669",
    rowBg: "#eefcf6",
    rowHover: "#d9f9ea",
    cellBg: "#dff7ed",
  },
  {
    keys: [
      "chua nghe",
      "khong nghe",
      "k nghe",
      "goi lai",
      "tat may",
      "chua goi",
    ],
    bg: "#ffe3a3",
    fg: "#78350f",
    border: "#d97706",
    chart: "#d97706",
    rowBg: "#fff8e7",
    rowHover: "#ffefbf",
    cellBg: "#ffedc2",
  },
  {
    keys: ["da nhan", "nhan tin", "zalo"],
    bg: "#d7e8ff",
    fg: "#1e3a8a",
    border: "#2563eb",
    chart: "#2563eb",
    rowBg: "#eff6ff",
    rowHover: "#dbeafe",
    cellBg: "#e0edff",
  },
  {
    keys: ["dang xu ly", "cho", "tham khao", "phan hoi", "dang theo doi"],
    bg: "#eadcff",
    fg: "#4c1d95",
    border: "#7c3aed",
    chart: "#7c3aed",
    rowBg: "#f7f0ff",
    rowHover: "#ede0ff",
    cellBg: "#f0e7ff",
  },
  {
    keys: [
      "khong ho tro",
      "tu choi",
      "danh sach den",
      "no xau",
      "khong du dieu kien",
    ],
    bg: "#ffd0cc",
    fg: "#991b1b",
    border: "#dc2626",
    chart: "#d92d20",
    rowBg: "#fff1f0",
    rowHover: "#ffdeda",
    cellBg: "#fee4e2",
  },
];

const fallbackChartColors = [
  "#64748b",
  "#0f766e",
  "#2f6feb",
  "#d98b00",
  "#d92d20",
  "#7c3aed",
  "#0e7490",
  "#be123c",
];

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEvents();
  loadLocalData();
  applyFilters();
}

function bindEvents() {
  els.fileInput.addEventListener("change", handleFileImport);
  els.exportXlsxBtn.addEventListener("click", exportRecordsAsXlsx);
  els.addRecordBtn.addEventListener("click", openCreateModal);

  els.filterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.filters = readFiltersFromForm();
    state.page = 1;
    applyFilters();
  });

  els.resetFiltersBtn.addEventListener("click", () => {
    els.searchInput.value = "";
    els.statusFilter.value = "";
    els.areaFilter.value = "";
    els.conditionFilter.value = "";
    els.serviceFilter.value = "";
    state.filters = readFiltersFromForm();
    state.page = 1;
    applyFilters();
  });

  els.pageSizeSelect.addEventListener("change", () => {
    state.pageSize = Number(els.pageSizeSelect.value);
    state.page = 1;
    render();
  });

  els.prevPageBtn.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      renderTable();
    }
  });

  els.nextPageBtn.addEventListener("click", () => {
    const pageCount = getPageCount();
    if (state.page < pageCount) {
      state.page += 1;
      renderTable();
    }
  });

  els.recordsBody.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    openDetailModal(row.dataset.id);
  });

  document.addEventListener("click", (event) => {
    const closeTarget = event.target.dataset.close;
    if (!closeTarget) return;
    if (closeTarget === "detail") closeModal(els.detailModal);
    if (closeTarget === "edit") closeModal(els.editModal);
  });

  els.openEditBtn.addEventListener("click", () => {
    const record = getSelectedRecord();
    if (record) openEditModal(record);
  });

  els.deleteRecordBtn.addEventListener("click", () => {
    const record = getSelectedRecord();
    if (!record) return;
    openConfirm({
      title: "Xóa khách hàng?",
      label: "Cảnh báo",
      message: `Bạn sắp xóa "${record.name || record.social || record.phone || "khách hàng"}". Thao tác này sẽ loại bỏ bản ghi khỏi danh sách hiện tại trước khi xuất Excel.`,
      danger: true,
      actionText: "Xóa",
      onAccept: () => deleteRecord(record.id),
    });
  });

  els.editForm.addEventListener("input", updateSaveButtonState);
  els.editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (els.saveEditBtn.disabled) return;
    const payload = readEditForm();
    const isCreate = !state.editingId;
    openConfirm({
      title: isCreate ? "Thêm khách hàng?" : "Lưu thay đổi?",
      label: "Xác nhận",
      message: isCreate
        ? "Bạn có muốn thêm bản ghi mới vào danh sách quản lý hiện tại?"
        : "Bạn có muốn cập nhật bản ghi này với các thông tin đã thay đổi?",
      danger: false,
      actionText: isCreate ? "Thêm" : "Lưu",
      onAccept: () => saveEdit(payload),
    });
  });

  els.cancelConfirmBtn.addEventListener("click", closeConfirm);
  els.acceptConfirmBtn.addEventListener("click", () => {
    const action = state.confirmAction;
    closeConfirm();
    if (typeof action === "function") action();
  });

  window.addEventListener(
    "resize",
    debounce(() => renderCharts(), 160),
  );
}

async function handleFileImport(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  event.target.value = "";

  if (state.records.length) {
    openConfirm({
      title: "Nhập file mới?",
      label: "Xác nhận",
      message:
        "Dữ liệu hiện tại sẽ được thay thế bằng nội dung từ file Excel mới. Hãy xuất Excel trước nếu cần lưu bản hiện tại.",
      danger: false,
      actionText: "Nhập",
      onAccept: () => processFileImport(file),
    });
    return;
  }

  await processFileImport(file);
}

async function processFileImport(file) {
  try {
    setBusy(true, "Đang đọc Excel...");
    const buffer = await file.arrayBuffer();
    const imported = await parseXlsxWorkbook(buffer);
    if (!imported.length) {
      showToast("Không tìm thấy dòng dữ liệu hợp lệ trong file Excel.", true);
      return;
    }

    state.records = imported;
    state.page = 1;
    state.filters = {
      query: "",
      status: "",
      area: "",
      condition: "",
      service: "",
    };
    els.searchInput.value = "";
    persistLocalData();
    buildFilterOptions();
    applyFilters();
    showToast(`Đã nhập ${imported.length} khách hàng từ ${file.name}.`);
  } catch (error) {
    console.error(error);
    showToast(error.message || "Nhập Excel không thành công.", true);
  } finally {
    setBusy(false);
  }
}

function loadLocalData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.records)) return;
    state.records = parsed.records.map(normalizeRecord);
    state.pageSize = Number(parsed.pageSize) || 20;
    els.pageSizeSelect.value = String(state.pageSize);
  } catch (error) {
    console.warn("Không đọc được localStorage", error);
  }
}

function persistLocalData() {
  const payload = {
    records: state.records,
    pageSize: state.pageSize,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function applyFilters() {
  buildFilterOptions();
  const query = normalizeSearch(state.filters.query);
  const queryDigits = onlyDigits(state.filters.query);
  const status = normalizeSearch(state.filters.status);
  const area = normalizeSearch(state.filters.area);
  const condition = normalizeSearch(state.filters.condition);
  const service = normalizeSearch(state.filters.service);

  state.filtered = state.records.filter((record) => {
    const blob = makeSearchBlob(record);
    const phoneDigits = onlyDigits(record.phone);

    if (
      query &&
      !blob.includes(query) &&
      !(queryDigits && phoneDigits.includes(queryDigits))
    )
      return false;
    if (status && normalizeSearch(record.status) !== status) return false;
    if (area && normalizeSearch(record.area) !== area) return false;
    if (condition && normalizeSearch(record.need) !== condition) return false;
    if (service && normalizeSearch(record.service) !== service) return false;
    return true;
  });

  const pageCount = getPageCount();
  if (state.page > pageCount) state.page = pageCount;
  render();
}

function render() {
  renderSummary();
  renderTable();
  renderCharts();
}

function renderSummary() {
  const calledCount = state.filtered.filter((record) =>
    normalizeSearch(record.status).includes("da goi"),
  ).length;
  const missedCount = state.filtered.filter((record) => {
    const status = normalizeSearch(record.status);
    return (
      status.includes("chua nghe") ||
      status.includes("khong nghe") ||
      status.includes("k nghe")
    );
  }).length;
  const areas = uniqueValues(state.filtered.map((record) => record.area));

  els.metricFiltered.textContent = formatNumber(state.filtered.length);
  els.metricTotal.textContent = `${formatNumber(state.records.length)} trong bộ dữ liệu`;
  els.metricCalled.textContent = formatNumber(calledCount);
  els.metricMissed.textContent = formatNumber(missedCount);
  els.metricAreas.textContent = formatNumber(areas.length);
  els.activeFilterText.textContent = getActiveFilterText();
}

function renderTable() {
  const pageCount = getPageCount();
  const start = (state.page - 1) * state.pageSize;
  const rows = state.filtered.slice(start, start + state.pageSize);

  els.recordsBody.innerHTML = "";
  const fragment = document.createDocumentFragment();

  rows.forEach((record) => {
    const tr = document.createElement("tr");
    const statusVisual = getStatusVisual(record.status);
    const statusLabel = cleanValue(record.status) || "Chưa phân loại";
    tr.className = "status-row";
    tr.dataset.id = record.id;
    tr.style.setProperty("--row-accent", statusVisual.chart);
    tr.style.setProperty("--row-bg", statusVisual.rowBg);
    tr.style.setProperty("--row-hover", statusVisual.rowHover);
    tr.style.setProperty("--row-border", statusVisual.border);
    tr.style.setProperty("--status-cell-bg", statusVisual.cellBg);
    tr.tabIndex = 0;
    tr.addEventListener("keydown", (event) => {
      if (event.key === "Enter") openDetailModal(record.id);
    });

    tr.innerHTML = `
      <td data-label="Khách hàng">
        <button class="row-button" type="button">
          <span class="customer-name">${escapeHtml(record.name || record.social || "Chưa có tên")}</span>
          <span class="customer-meta">${escapeHtml(record.social || record.notes || "")}</span>
        </button>
      </td>
      <td data-label="Số điện thoại">${escapeHtml(record.phone || "-")}</td>
      <td data-label="Địa phương">${escapeHtml(record.area || "-")}</td>
      <td data-label="Tình trạng"><span class="line-clamp">${escapeHtml(record.need || "-")}</span></td>
      <td class="status-cell" data-label="Trạng thái" title="${escapeHtml(statusLabel)}">${renderStatusBadge(record.status)}</td>
      <td data-label="Dịch vụ"><span class="muted-text">${escapeHtml(record.service || record.sourceSheet || "-")}</span></td>
    `;
    fragment.appendChild(tr);
  });

  els.recordsBody.appendChild(fragment);
  els.emptyState.style.display = rows.length ? "none" : "flex";
  els.pageInfo.textContent = `Trang ${state.filtered.length ? state.page : 0} / ${state.filtered.length ? pageCount : 0}`;
  els.prevPageBtn.disabled = state.page <= 1;
  els.nextPageBtn.disabled = state.page >= pageCount;
}

function renderCharts() {
  renderStatusChart();
  renderAreaChart();
}

function renderStatusChart() {
  const counts = countBy(
    state.filtered,
    (record) => record.status || "Chưa phân loại",
  );
  const entries = sortCountEntries(counts).slice(0, 8);
  const colors = entries.map(
    ([label], index) => getStatusVisual(label, index).chart,
  );
  drawDoughnutChart(els.statusChart, entries, colors);

  els.statusLegend.innerHTML = "";
  const fragment = document.createDocumentFragment();
  entries.forEach(([label, value], index) => {
    const item = document.createElement("span");
    item.className = "legend-item";
    item.innerHTML = `<span class="legend-swatch" style="background:${colors[index]}"></span>${escapeHtml(label)} (${value})`;
    fragment.appendChild(item);
  });
  els.statusLegend.appendChild(fragment);
}

function renderAreaChart() {
  const counts = countBy(
    state.filtered,
    (record) => record.area || "Chưa có địa phương",
  );
  const entries = sortCountEntries(counts).slice(0, 8);
  drawBarChart(els.areaChart, entries);
}

function openDetailModal(id) {
  const record = state.records.find((item) => item.id === id);
  if (!record) return;

  state.selectedId = id;
  els.detailTitle.textContent =
    record.name || record.social || record.phone || "Khách hàng";
  els.detailContent.innerHTML = `
    ${detailItem("Trạng thái xử lý", renderStatusBadge(record.status), false)}
    ${detailItem("Số điện thoại", escapeHtml(record.phone || "-"))}
    ${detailItem("Tên khách hàng", escapeHtml(record.name || "-"))}
    ${detailItem("Zalo / Facebook", escapeHtml(record.social || "-"))}
    ${detailItem("Địa phương", escapeHtml(record.area || "-"))}
    ${detailItem("Dịch vụ", escapeHtml(record.service || "-"))}
    ${detailItem("Nhu cầu, tình trạng khách", escapeHtml(record.need || "-"), true)}
    ${detailItem("Ghi chú", escapeHtml(record.notes || "-"), true)}
    ${detailItem("Nguồn sheet", escapeHtml(record.sourceSheet || "-"))}
    ${detailItem("Cập nhật lúc", escapeHtml(formatDateTime(record.updatedAt)))}
  `;
  openModal(els.detailModal);
}

function detailItem(label, value, wide = false) {
  return `
    <div class="detail-item ${wide ? "wide" : ""}">
      <span>${escapeHtml(label)}</span>
      <p>${value}</p>
    </div>
  `;
}

function openCreateModal() {
  state.editingId = null;
  state.editBaseline = getEmptyEditableRecord();
  els.editModeLabel.textContent = "Thêm dữ liệu mới";
  els.editTitle.textContent = "Thêm khách hàng";
  writeEditForm(state.editBaseline);
  updateSaveButtonState();
  openModal(els.editModal);
}

function openEditModal(record) {
  state.editingId = record.id;
  state.editBaseline = getEditableRecord(record);
  els.editModeLabel.textContent = "Cập nhật dữ liệu";
  els.editTitle.textContent =
    record.name || record.social || record.phone || "Sửa khách hàng";
  writeEditForm(state.editBaseline);
  updateSaveButtonState();
  openModal(els.editModal);
}

function writeEditForm(record) {
  els.editForm.elements.name.value = record.name || "";
  els.editForm.elements.phone.value = record.phone || "";
  els.editForm.elements.social.value = record.social || "";
  els.editForm.elements.area.value = record.area || "";
  els.editForm.elements.status.value = record.status || "";
  els.editForm.elements.service.value = record.service || "";
  els.editForm.elements.need.value = record.need || "";
  els.editForm.elements.notes.value = record.notes || "";
}

function readEditForm() {
  return {
    name: cleanValue(els.editForm.elements.name.value),
    phone: normalizePhone(els.editForm.elements.phone.value),
    social: cleanValue(els.editForm.elements.social.value),
    area: cleanValue(els.editForm.elements.area.value),
    status: cleanValue(els.editForm.elements.status.value) || "Chưa phân loại",
    service: cleanValue(els.editForm.elements.service.value),
    need: cleanValue(els.editForm.elements.need.value),
    notes: cleanValue(els.editForm.elements.notes.value),
  };
}

function updateSaveButtonState() {
  const current = readEditForm();
  const changed =
    JSON.stringify(current) !==
    JSON.stringify(state.editBaseline || getEmptyEditableRecord());
  const hasMinimumData = Boolean(
    current.name || current.phone || current.social,
  );
  els.saveEditBtn.disabled = !changed || !hasMinimumData;
}

function saveEdit(payload) {
  const now = new Date().toISOString();
  if (state.editingId) {
    const index = state.records.findIndex(
      (record) => record.id === state.editingId,
    );
    if (index === -1) return;
    state.records[index] = normalizeRecord({
      ...state.records[index],
      ...payload,
      updatedAt: now,
    });
    showToast("Đã lưu thay đổi.");
  } else {
    const record = normalizeRecord({
      ...getEmptyEditableRecord(),
      ...payload,
      id: createId(),
      sourceSheet: "Nhập thủ công",
      createdAt: now,
      updatedAt: now,
    });
    state.records.unshift(record);
    state.selectedId = record.id;
    showToast("Đã thêm khách hàng mới.");
  }

  persistLocalData();
  closeModal(els.editModal);
  applyFilters();
  if (state.selectedId) openDetailModal(state.selectedId);
}

function deleteRecord(id) {
  const index = state.records.findIndex((record) => record.id === id);
  if (index === -1) return;
  state.records.splice(index, 1);
  state.selectedId = null;
  persistLocalData();
  closeModal(els.detailModal);
  applyFilters();
  showToast("Đã xóa bản ghi khỏi danh sách.");
}

function getSelectedRecord() {
  return state.records.find((record) => record.id === state.selectedId);
}

function getEditableRecord(record) {
  return {
    name: record.name || "",
    phone: record.phone || "",
    social: record.social || "",
    area: record.area || "",
    status: record.status || "",
    service: record.service || "",
    need: record.need || "",
    notes: record.notes || "",
  };
}

function getEmptyEditableRecord() {
  return {
    name: "",
    phone: "",
    social: "",
    area: "",
    status: "Chưa phân loại",
    service: "",
    need: "",
    notes: "",
  };
}

function readFiltersFromForm() {
  return {
    query: cleanValue(els.searchInput.value),
    status: els.statusFilter.value,
    area: els.areaFilter.value,
    condition: els.conditionFilter.value,
    service: els.serviceFilter.value,
  };
}

function buildFilterOptions() {
  setSelectOptions(
    els.statusFilter,
    uniqueValues(state.records.map((record) => record.status)),
    "Tất cả trạng thái",
    state.filters.status,
  );
  setSelectOptions(
    els.areaFilter,
    uniqueValues(state.records.map((record) => record.area)),
    "Tất cả địa phương",
    state.filters.area,
  );
  setSelectOptions(
    els.conditionFilter,
    uniqueValues(state.records.map((record) => record.need)),
    "Tất cả tình trạng",
    state.filters.condition,
  );
  setSelectOptions(
    els.serviceFilter,
    uniqueValues(state.records.map((record) => record.service)),
    "Tất cả dịch vụ",
    state.filters.service,
  );

  setDatalistOptions(
    els.areaOptions,
    uniqueValues(state.records.map((record) => record.area)),
  );
  setDatalistOptions(
    els.statusOptions,
    uniqueValues(state.records.map((record) => record.status)),
  );
  setDatalistOptions(
    els.serviceOptions,
    uniqueValues(state.records.map((record) => record.service)),
  );
}

function setSelectOptions(select, values, allLabel, selectedValue) {
  const previous = selectedValue || select.value || "";
  select.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = allLabel;
  select.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = truncateMiddle(value, 58);
    select.appendChild(option);
  });

  select.value = values.includes(previous) ? previous : "";
}

function setDatalistOptions(list, values) {
  list.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    list.appendChild(option);
  });
}

function getActiveFilterText() {
  if (!state.records.length) return "Chưa có dữ liệu. Hãy nhập file Excel.";
  const parts = [];
  if (state.filters.query) parts.push(`tìm "${state.filters.query}"`);
  if (state.filters.status) parts.push(`trạng thái: ${state.filters.status}`);
  if (state.filters.area) parts.push(`địa phương: ${state.filters.area}`);
  if (state.filters.condition)
    parts.push(`tình trạng: ${truncateMiddle(state.filters.condition, 48)}`);
  if (state.filters.service) parts.push(`dịch vụ: ${state.filters.service}`);
  return parts.length
    ? `Đang áp dụng ${parts.join(", ")}.`
    : "Đang hiển thị toàn bộ dữ liệu.";
}

async function parseXlsxWorkbook(buffer) {
  const zip = parseZipDirectory(new Uint8Array(buffer));
  const workbookText = await readZipText(zip, "xl/workbook.xml");
  const relsText = await readZipText(zip, "xl/_rels/workbook.xml.rels");
  const sharedText = zip.entries.has("xl/sharedStrings.xml")
    ? await readZipText(zip, "xl/sharedStrings.xml")
    : "";

  const workbookDoc = parseXml(workbookText, "workbook.xml");
  const relsDoc = parseXml(relsText, "workbook rels");
  const sharedStrings = sharedText ? parseSharedStrings(sharedText) : [];
  const relMap = parseRelationships(relsDoc);
  const sheets = parseWorkbookSheets(workbookDoc);
  const imported = [];
  const now = new Date().toISOString();

  for (const sheet of sheets) {
    const target = relMap.get(sheet.relId);
    if (!target) continue;
    const sheetPath = resolveWorkbookTarget(target);
    if (!zip.entries.has(sheetPath)) continue;
    const sheetText = await readZipText(zip, sheetPath);
    const sheetRows = parseWorksheetRows(sheetText, sharedStrings);
    const sheetRecords = rowsToRecords(sheetRows, sheet.name, now);
    imported.push(...sheetRecords);
  }

  return imported;
}

function parseWorkbookSheets(doc) {
  return Array.from(
    doc.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "sheet",
    ),
  ).map((sheet) => ({
    name: sheet.getAttribute("name") || "Sheet",
    relId:
      sheet.getAttributeNS(
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        "id",
      ) || sheet.getAttribute("r:id"),
  }));
}

function parseRelationships(doc) {
  const map = new Map();
  Array.from(doc.getElementsByTagName("Relationship")).forEach((rel) => {
    map.set(rel.getAttribute("Id"), rel.getAttribute("Target"));
  });
  return map;
}

function parseSharedStrings(xmlText) {
  const doc = parseXml(xmlText, "sharedStrings.xml");
  return Array.from(
    doc.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "si",
    ),
  ).map((item) => {
    return Array.from(
      item.getElementsByTagNameNS(
        "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "t",
      ),
    )
      .map((node) => node.textContent || "")
      .join("");
  });
}

function parseWorksheetRows(xmlText, sharedStrings) {
  const doc = parseXml(xmlText, "worksheet");
  const rows = Array.from(
    doc.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "row",
    ),
  );
  return rows.map((row) => {
    const values = [];
    Array.from(
      row.getElementsByTagNameNS(
        "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "c",
      ),
    ).forEach((cell) => {
      const ref = cell.getAttribute("r") || "";
      const index = columnIndexFromRef(ref) ?? values.length;
      values[index] = readCellValue(cell, sharedStrings);
    });
    return values.map((value) => cleanValue(value));
  });
}

function readCellValue(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  if (type === "s") {
    const valueNode = firstChildNs(cell, "v");
    const index = Number(valueNode ? valueNode.textContent : "");
    return Number.isFinite(index) ? sharedStrings[index] || "" : "";
  }

  if (type === "inlineStr") {
    return Array.from(
      cell.getElementsByTagNameNS(
        "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
        "t",
      ),
    )
      .map((node) => node.textContent || "")
      .join("");
  }

  const valueNode = firstChildNs(cell, "v");
  if (!valueNode) return "";
  return valueNode.textContent || "";
}

function rowsToRecords(rows, sheetName, timestamp) {
  const headerIndex = findHeaderRowIndex(rows);
  if (headerIndex === -1) return [];

  const titleRow = rows.slice(0, headerIndex).find((row) => row.some(Boolean));
  const serviceName =
    cleanValue(titleRow ? titleRow.filter(Boolean).join(" ") : sheetName) ||
    sheetName;
  const headers = rows[headerIndex];
  const mappedHeaders = headers.map(mapHeaderToKey);
  const records = [];

  rows.slice(headerIndex + 1).forEach((row) => {
    if (!row.some(Boolean)) return;
    const record = {
      id: createId(),
      stt: "",
      name: "",
      social: "",
      phone: "",
      area: "",
      need: "",
      status: "",
      notes: "",
      service: serviceName,
      sourceSheet: sheetName,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    mappedHeaders.forEach((key, index) => {
      const value = cleanValue(row[index] || "");
      if (!value || !key) return;
      if (key === "phone") record.phone = normalizePhone(value);
      else if (key in record) record[key] = value;
    });

    if (!record.name && !record.phone && !record.social) return;
    records.push(normalizeRecord(record));
  });

  return records;
}

function findHeaderRowIndex(rows) {
  return rows.findIndex((row) => {
    const normalized = row.map(normalizeSearch);
    return (
      normalized.some(
        (cell) => cell.includes("so dien thoai") || cell === "sdt",
      ) &&
      normalized.some(
        (cell) => cell.includes("ten khach") || cell.includes("khach hang"),
      )
    );
  });
}

function mapHeaderToKey(header) {
  const value = normalizeSearch(header);
  if (!value) return "";
  if (value === "stt" || value.includes("so thu tu")) return "stt";
  if (value.includes("ten khach") || value === "ho ten" || value === "ten")
    return "name";
  if (
    value.includes("zalo") ||
    value.includes("facebook") ||
    value.includes("fb")
  )
    return "social";
  if (
    value.includes("so dien thoai") ||
    value === "sdt" ||
    value.includes("phone")
  )
    return "phone";
  if (
    value.includes("khu vuc") ||
    value.includes("dia phuong") ||
    value.includes("tinh thanh")
  )
    return "area";
  if (value.includes("nhu cau") || value.includes("tinh trang khach"))
    return "need";
  if (
    value.includes("tinh trang xu ly") ||
    value === "trang thai" ||
    value.includes("status")
  )
    return "status";
  if (value.includes("ghi chu") || value.includes("note")) return "notes";
  if (value.includes("dich vu")) return "service";
  if (value.includes("nguon sheet")) return "sourceSheet";
  if (value.includes("cap nhat")) return "updatedAt";
  return "";
}

function parseXml(text, label) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const error = doc.querySelector("parsererror");
  if (error) throw new Error(`Không đọc được XML trong ${label}.`);
  return doc;
}

function resolveWorkbookTarget(target) {
  if (target.startsWith("/")) return target.slice(1);
  if (target.startsWith("xl/")) return target;
  return `xl/${target}`;
}

function parseZipDirectory(bytes) {
  const eocdOffset = findEndOfCentralDirectory(bytes);
  const entryCount = readUint16(bytes, eocdOffset + 10);
  const centralOffset = readUint32(bytes, eocdOffset + 16);
  const entries = new Map();
  let offset = centralOffset;

  for (let i = 0; i < entryCount; i += 1) {
    if (readUint32(bytes, offset) !== 0x02014b50)
      throw new Error("File Excel không đúng định dạng ZIP.");
    const flags = readUint16(bytes, offset + 8);
    const method = readUint16(bytes, offset + 10);
    const compressedSize = readUint32(bytes, offset + 20);
    const uncompressedSize = readUint32(bytes, offset + 24);
    const nameLength = readUint16(bytes, offset + 28);
    const extraLength = readUint16(bytes, offset + 30);
    const commentLength = readUint16(bytes, offset + 32);
    const localOffset = readUint32(bytes, offset + 42);
    const nameStart = offset + 46;
    const nameBytes = bytes.slice(nameStart, nameStart + nameLength);
    const name = TEXT_DECODER.decode(nameBytes);

    entries.set(name, {
      name,
      flags,
      method,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    offset = nameStart + nameLength + extraLength + commentLength;
  }

  return { bytes, entries };
}

function findEndOfCentralDirectory(bytes) {
  const minOffset = Math.max(0, bytes.length - 0xffff - 22);
  for (let offset = bytes.length - 22; offset >= minOffset; offset -= 1) {
    if (readUint32(bytes, offset) === 0x06054b50) return offset;
  }
  throw new Error("Không tìm thấy cấu trúc ZIP trong file Excel.");
}

async function readZipText(zip, name) {
  const entry = zip.entries.get(name);
  if (!entry) throw new Error(`Thiếu file ${name} trong workbook.`);
  const bytes = await readZipEntry(zip.bytes, entry);
  return TEXT_DECODER.decode(bytes);
}

async function readZipEntry(bytes, entry) {
  const offset = entry.localOffset;
  if (readUint32(bytes, offset) !== 0x04034b50)
    throw new Error(`Lỗi local header của ${entry.name}.`);
  const nameLength = readUint16(bytes, offset + 26);
  const extraLength = readUint16(bytes, offset + 28);
  const dataStart = offset + 30 + nameLength + extraLength;
  const data = bytes.slice(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateRaw(data);
  throw new Error(`File Excel dùng kiểu nén chưa hỗ trợ: ${entry.method}.`);
}

async function inflateRaw(data) {
  if (!("DecompressionStream" in window)) {
    throw new Error(
      "Trình duyệt hiện tại chưa hỗ trợ giải nén Excel trực tiếp. Hãy mở bằng Chrome hoặc Edge phiên bản mới.",
    );
  }

  const formats = ["deflate-raw", "deflate"];
  let lastError = null;
  for (const format of formats) {
    try {
      const stream = new Blob([data])
        .stream()
        .pipeThrough(new DecompressionStream(format));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("Không giải nén được dữ liệu Excel.");
}

function exportRecordsAsXlsx() {
  if (!state.records.length) {
    showToast("Chưa có dữ liệu để xuất Excel.", true);
    return;
  }

  const headers = [
    "STT",
    "Dịch vụ",
    "Tên khách hàng",
    "Zalo/Facebook",
    "Số điện thoại",
    "Khu vực",
    "Nhu cầu, tình trạng khách",
    "Tình trạng xử lý",
    "Ghi chú",
    "Nguồn sheet",
    "Cập nhật lúc",
  ];

  const rows = state.records.map((record, index) => [
    String(index + 1),
    record.service,
    record.name,
    record.social,
    record.phone,
    record.area,
    record.need,
    record.status,
    record.notes,
    record.sourceSheet,
    formatDateTime(record.updatedAt),
  ]);

  const workbookFiles = buildXlsxFiles([headers, ...rows]);
  const zip = createZip(workbookFiles);
  const fileName = `quan-ly-khach-tai-chinh-${formatFileDate(new Date())}.xlsx`;
  downloadBlob(
    new Blob([zip], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName,
  );
  showToast(`Đã xuất ${state.records.length} bản ghi ra Excel.`);
}

function buildXlsxFiles(rows) {
  const worksheet = buildWorksheetXml(rows);
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Quản lý dữ liệu" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  return [
    { name: "[Content_Types].xml", data: TEXT_ENCODER.encode(contentTypes) },
    { name: "_rels/.rels", data: TEXT_ENCODER.encode(rootRels) },
    { name: "xl/workbook.xml", data: TEXT_ENCODER.encode(workbook) },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: TEXT_ENCODER.encode(workbookRels),
    },
    { name: "xl/worksheets/sheet1.xml", data: TEXT_ENCODER.encode(worksheet) },
  ];
}

function buildWorksheetXml(rows) {
  const colWidths = [8, 24, 24, 24, 16, 18, 42, 20, 36, 22, 20];
  const cols = colWidths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
    )
    .join("");

  const sheetRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) => {
          const ref = `${columnName(colIndex)}${rowIndex + 1}`;
          return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(value || "")}</t></is></c>`;
        })
        .join("");
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
</worksheet>`;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const now = new Date();
  const { dosTime, dosDate } = getDosDateTime(now);

  files.forEach((file) => {
    const nameBytes = TEXT_ENCODER.encode(file.name);
    const data =
      file.data instanceof Uint8Array ? file.data : new Uint8Array(file.data);
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, dosTime);
    writeUint16(localHeader, 12, dosDate);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, data.length);
    writeUint32(localHeader, 22, data.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, dosTime);
    writeUint16(centralHeader, 14, dosDate);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, data.length);
    writeUint32(centralHeader, 24, data.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + data.length;
  });

  const centralOffset = offset;
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  writeUint32(eocd, 0, 0x06054b50);
  writeUint16(eocd, 4, 0);
  writeUint16(eocd, 6, 0);
  writeUint16(eocd, 8, files.length);
  writeUint16(eocd, 10, files.length);
  writeUint32(eocd, 12, centralSize);
  writeUint32(eocd, 16, centralOffset);
  writeUint16(eocd, 20, 0);

  return concatUint8Arrays([...localParts, ...centralParts, eocd]);
}

function getDosDateTime(date) {
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((date.getFullYear() - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { dosTime, dosDate };
}

let crcTable = null;
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i += 1) {
      let c = i;
      for (let k = 0; k < 8; k += 1)
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }

  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function normalizeRecord(input) {
  return {
    id: input.id || createId(),
    stt: cleanValue(input.stt),
    name: cleanValue(input.name),
    social: cleanValue(input.social),
    phone: normalizePhone(input.phone),
    area: cleanValue(input.area),
    need: cleanValue(input.need),
    status: cleanValue(input.status) || "Chưa phân loại",
    notes: cleanValue(input.notes),
    service: cleanValue(input.service),
    sourceSheet: cleanValue(input.sourceSheet),
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: input.updatedAt || new Date().toISOString(),
  };
}

function makeSearchBlob(record) {
  return normalizeSearch(
    [
      record.name,
      record.social,
      record.phone,
      record.area,
      record.need,
      record.status,
      record.notes,
      record.service,
      record.sourceSheet,
    ].join(" "),
  );
}

function normalizePhone(value) {
  const raw = cleanValue(value);
  if (!raw) return "";
  const digits = onlyDigits(raw);
  if (digits.length === 9 && /^[1-9]/.test(digits)) return `0${digits}`;
  if (digits.length >= 9 && digits.length <= 11) return digits;
  return raw;
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function cleanValue(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearch(value) {
  return cleanValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

function uniqueValues(values) {
  const map = new Map();
  values.forEach((value) => {
    const cleaned = cleanValue(value);
    if (!cleaned) return;
    const key = normalizeSearch(cleaned);
    if (!map.has(key)) map.set(key, cleaned);
  });
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "vi"));
}

function countBy(items, mapper) {
  const counts = new Map();
  items.forEach((item) => {
    const key = cleanValue(mapper(item)) || "Chưa phân loại";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}

function sortCountEntries(counts) {
  return Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "vi"),
  );
}

function getStatusVisual(status, index = 0) {
  const normalized = normalizeSearch(status);
  const rule = statusRules.find((item) =>
    item.keys.some((key) => normalized.includes(key)),
  );
  if (rule) return rule;
  const color = fallbackChartColors[index % fallbackChartColors.length];
  return {
    bg: "#eef2f7",
    fg: "#334155",
    border: "#c8d1df",
    chart: color,
    rowBg: "#ffffff",
    rowHover: "#f1f5f9",
    cellBg: "#eef2f7",
  };
}

function renderStatusBadge(status) {
  const label = cleanValue(status) || "Chưa phân loại";
  const visual = getStatusVisual(label);
  return `<span class="status-badge" style="--badge-bg:${visual.bg};--badge-fg:${visual.fg};--badge-border:${visual.border};">${escapeHtml(label)}</span>`;
}

function drawDoughnutChart(canvas, entries, colors) {
  const { ctx, width, height } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  if (!entries.length) {
    drawEmptyChart(ctx, width, height, "Chưa có dữ liệu");
    return;
  }

  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const inner = radius * 0.56;
  let start = -Math.PI / 2;

  entries.forEach(([, value], index) => {
    const angle = (value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = colors[index];
    ctx.fill();
    start += angle;
  });

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  ctx.fillStyle = "#152033";
  ctx.font = '700 24px "Segoe UI", "Noto Sans", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(total), cx, cy - 8);
  ctx.fillStyle = "#5f6f86";
  ctx.font = '12px "Segoe UI", "Noto Sans", Arial, sans-serif';
  ctx.fillText("bản ghi", cx, cy + 16);
}

function drawBarChart(canvas, entries) {
  const { ctx, width, height } = prepareCanvas(canvas);
  ctx.clearRect(0, 0, width, height);

  if (!entries.length) {
    drawEmptyChart(ctx, width, height, "Chưa có dữ liệu");
    return;
  }

  const margin = { top: 12, right: 24, bottom: 20, left: 96 };
  const chartWidth = width - margin.left - margin.right;
  const rowHeight = Math.min(
    26,
    (height - margin.top - margin.bottom) / entries.length,
  );
  const max = Math.max(...entries.map(([, value]) => value));

  ctx.font = '12px "Segoe UI", "Noto Sans", Arial, sans-serif';
  ctx.textBaseline = "middle";

  entries.forEach(([label, value], index) => {
    const y = margin.top + index * rowHeight + rowHeight * 0.5;
    const barWidth = Math.max(2, (value / max) * chartWidth);

    ctx.fillStyle = "#5f6f86";
    ctx.textAlign = "right";
    ctx.fillText(truncateMiddle(label, 16), margin.left - 8, y);

    ctx.fillStyle = fallbackChartColors[index % fallbackChartColors.length];
    roundRect(ctx, margin.left, y - 8, barWidth, 16, 4);
    ctx.fill();

    ctx.fillStyle = "#152033";
    ctx.textAlign = "left";
    ctx.fillText(String(value), margin.left + barWidth + 6, y);
  });
}

function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function drawEmptyChart(ctx, width, height, text) {
  ctx.fillStyle = "#f1f5f9";
  roundRect(ctx, 8, 8, width - 16, height - 16, 8);
  ctx.fill();
  ctx.fillStyle = "#5f6f86";
  ctx.font = '700 13px "Segoe UI", "Noto Sans", Arial, sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function openModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function openConfirm({ title, label, message, danger, actionText, onAccept }) {
  state.confirmAction = onAccept;
  els.confirmTitle.textContent = title;
  els.confirmLabel.textContent = label;
  els.confirmMessage.textContent = message;
  els.acceptConfirmBtn.textContent = actionText;
  els.acceptConfirmBtn.className = danger ? "btn danger" : "btn primary";
  els.confirmPanel.classList.toggle("is-warning", Boolean(danger));
  openModal(els.confirmModal);
}

function closeConfirm() {
  state.confirmAction = null;
  closeModal(els.confirmModal);
}

function setBusy(isBusy, label = "") {
  els.exportXlsxBtn.disabled = isBusy;
  els.addRecordBtn.disabled = isBusy;
  if (isBusy) showToast(label || "Đang xử lý...");
}

let toastTimer = null;
function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.classList.toggle("is-error", Boolean(isError));
  els.toast.classList.add("is-visible");
  toastTimer = setTimeout(
    () => {
      els.toast.classList.remove("is-visible");
    },
    isError ? 5200 : 3200,
  );
}

function getPageCount() {
  return Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
}

function createId() {
  return `kh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(value || 0);
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFileDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function truncateMiddle(value, maxLength) {
  const text = cleanValue(value);
  if (text.length <= maxLength) return text;
  if (maxLength <= 3) return text.slice(0, maxLength);
  return `${text.slice(0, maxLength - 3)}...`;
}

function columnIndexFromRef(ref) {
  const match = String(ref).match(/^[A-Z]+/);
  if (!match) return null;
  let index = 0;
  for (const char of match[0]) index = index * 26 + char.charCodeAt(0) - 64;
  return index - 1;
}

function columnName(index) {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - mod) / 26);
  }
  return name;
}

function firstChildNs(node, tagName) {
  return (
    node.getElementsByTagNameNS(
      "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      tagName,
    )[0] || null
  );
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function writeUint16(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function concatUint8Arrays(parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(value) {
  return escapeHtml(value).replace(/\r?\n/g, "&#10;");
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
