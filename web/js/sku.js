document.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const refreshBtn = document.getElementById('refreshSku');
  const tableBody = document.getElementById('skuTableBody');
  const detailPanel = document.getElementById('skuDetailPanel');

  function setDefaultRange() {
    const end = dayjs().format('YYYY-MM-DD');
    const start = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
    startInput.value = start;
    endInput.value = end;
  }

  const marginTarget = Number(window.DEFAULT_MARGIN_TARGET || 0.6);

  function renderTable(data) {
    tableBody.innerHTML = '';
    data.forEach((row) => {
      const marginClass =
        row.margin_percent < marginTarget
          ? 'text-red-600'
          : 'text-teal-600';
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-200 last:border-none hover:bg-slate-50 cursor-pointer transition';
      tr.innerHTML = `
        <td class="py-2 px-2 font-medium text-slate-700">${row.sku_code}</td>
        <td class="py-2 px-2 text-right">${MM.formatCurrency(row.avg_cost)}</td>
        <td class="py-2 px-2 text-right">${MM.formatCurrency(row.avg_paid)}</td>
        <td class="py-2 px-2 text-right ${marginClass}">${MM.formatPercent(row.margin_percent)}</td>
        <td class="py-2 px-2 text-right">${row.volume.toLocaleString()}</td>
        <td class="py-2 px-2 text-right text-red-600">${MM.formatCurrency(row.leakage)}</td>
      `;
      tr.addEventListener('click', () => loadDetail(row.sku_code));
      tableBody.appendChild(tr);
    });
  }

  function renderDetail(detail) {
    if (!detail) {
      detailPanel.innerHTML = '<p class="text-sm text-slate-500">Select a SKU to view detail.</p>';
      return;
    }
    const payerRows = detail.payer_outliers
      .map(
        (p) => `
          <tr class="border-b border-slate-200">
            <td class="py-2">${p.payer_name}</td>
            <td class="py-2 text-right">${MM.formatCurrency(p.avg_paid)}</td>
            <td class="py-2 text-right">${MM.formatCurrency(p.overall_avg)}</td>
            <td class="py-2 text-right text-red-600">${MM.formatCurrency(p.leakage_dollars)}</td>
          </tr>
        `
      )
      .join('');

    const customerRows = detail.customer_pressure
      .slice(0, 5)
      .map(
        (c) => `
          <tr class="border-b border-slate-200">
            <td class="py-2">${c.customer_name}</td>
            <td class="py-2 text-right">${MM.formatCurrency(c.avg_paid)}</td>
            <td class="py-2 text-right">${c.volume.toLocaleString()}</td>
            <td class="py-2 text-right text-red-600">${MM.formatCurrency(c.uplift_if_matched_avg)}</td>
          </tr>
        `
      )
      .join('');

    detailPanel.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">SKU ${detail.sku_code}</h3>
          <p class="text-sm text-slate-500 mt-1">Average paid ${MM.formatCurrency(detail.avg_paid)} | Margin ${MM.formatPercent(detail.margin_percent)} | Leakage ${MM.formatCurrency(detail.leakage_dollars)}</p>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Payer Outliers</h4>
          <table class="w-full mt-2 text-sm">
            <thead class="text-slate-500">
              <tr>
                <th class="text-left py-2">Payer</th>
                <th class="text-right py-2">Avg Paid</th>
                <th class="text-right py-2">SKU Avg</th>
                <th class="text-right py-2">Leakage</th>
              </tr>
            </thead>
            <tbody>${payerRows || '<tr><td colspan="4" class="py-3 text-center text-slate-400">No payer variance detected.</td></tr>'}</tbody>
          </table>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Customers Below Target</h4>
          <table class="w-full mt-2 text-sm">
            <thead class="text-slate-500">
              <tr>
                <th class="text-left py-2">Customer</th>
                <th class="text-right py-2">Avg Paid</th>
                <th class="text-right py-2">Units</th>
                <th class="text-right py-2">Uplift</th>
              </tr>
            </thead>
            <tbody>${customerRows || '<tr><td colspan="4" class="py-3 text-center text-slate-400">No immediate pricing lifts identified.</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function loadList() {
    const start = startInput.value;
    const end = endInput.value;
    const response = await MM.apiFetch(`/sku?start=${start}&end=${end}`);
    renderTable(response.data);
    renderDetail(null);
  }

  async function loadDetail(skuCode) {
    const detail = await MM.apiFetch(`/sku/${encodeURIComponent(skuCode)}`);
    renderDetail(detail);
  }

  function validateRange() {
    if (dayjs(startInput.value).isAfter(dayjs(endInput.value))) {
      startInput.value = dayjs(endInput.value).subtract(30, 'day').format('YYYY-MM-DD');
    }
  }

  setDefaultRange();
  loadList().catch(console.error);

  refreshBtn.addEventListener('click', () => {
    validateRange();
    loadList().catch(console.error);
  });

  [startInput, endInput].forEach((input) => {
    input.addEventListener('change', validateRange);
  });
});
