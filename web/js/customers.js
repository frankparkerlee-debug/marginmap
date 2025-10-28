document.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const refreshBtn = document.getElementById('refreshCustomers');
  const tableBody = document.getElementById('customersTableBody');
  const detailPanel = document.getElementById('customerDetailPanel');

  function setDefaultRange() {
    const end = dayjs().format('YYYY-MM-DD');
    const start = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
    startInput.value = start;
    endInput.value = end;
  }

  function renderTable(rows) {
    tableBody.innerHTML = '';
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const badge = row.action_needed
        ? '<span class="inline-flex items-center px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-xs font-medium">Action</span>'
        : '<span class="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-medium">Healthy</span>';
      tr.className = 'border-b border-slate-200 last:border-none hover:bg-slate-50 cursor-pointer transition';
      tr.innerHTML = `
        <td class="py-2 px-2 font-medium text-slate-700">${row.customer_name}</td>
        <td class="py-2 px-2 text-right">${MM.formatCurrency(row.revenue)}</td>
        <td class="py-2 px-2 text-right">${MM.formatPercent(row.margin_percent)}</td>
        <td class="py-2 px-2 text-right text-red-600">${MM.formatCurrency(row.leakage)}</td>
        <td class="py-2 px-2 text-right">${badge}</td>
      `;
      tr.addEventListener('click', () => loadDetail(row.customer_name));
      tableBody.appendChild(tr);
    });
  }

  function renderDetail(detail) {
    if (!detail) {
      detailPanel.innerHTML = '<p class="text-sm text-slate-500">Select a customer to review profitability.</p>';
      return;
    }

    const skuRows = detail.sku_summary
      .map(
        (sku) => `
        <tr class="border-b border-slate-200">
          <td class="py-2">${sku.sku_code}</td>
          <td class="py-2 text-right">${sku.volume.toLocaleString()}</td>
          <td class="py-2 text-right">${MM.formatCurrency(sku.customer_avg_paid)}</td>
          <td class="py-2 text-right">${MM.formatCurrency(sku.median_paid)}</td>
          <td class="py-2 text-right text-teal-600">${MM.formatCurrency(sku.uplift_to_median)}</td>
        </tr>`
      )
      .join('');

    const underpriced = detail.underpriced_skus
      .slice(0, 5)
      .map(
        (sku) => `
        <li class="border border-slate-200 rounded-lg px-3 py-2 bg-white">
          <div class="flex justify-between items-center">
            <span class="font-medium text-slate-700">${sku.sku_code}</span>
            <span class="text-sm text-slate-500">${MM.formatPercent(sku.margin_percent)}</span>
          </div>
          <p class="text-sm text-slate-500 mt-1">Lift to median adds ${MM.formatCurrency(sku.uplift_to_median)}.</p>
        </li>`
      )
      .join('');

    detailPanel.innerHTML = `
      <div class="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-800">${detail.customer_name}</h3>
          <p class="text-sm text-slate-500 mt-1">
            Revenue ${MM.formatCurrency(detail.revenue)} • Margin ${MM.formatPercent(detail.margin_percent)} • Leakage ${MM.formatCurrency(detail.leakage_dollars)}
          </p>
          <p class="text-sm text-slate-500 mt-1">
            Uplift to median pricing: <span class="font-medium text-teal-600">${MM.formatCurrency(detail.total_uplift_to_median)}</span>
          </p>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Underpriced SKUs</h4>
          <ul class="mt-2 space-y-2">${underpriced || '<li class="text-sm text-slate-400">No immediate pricing gaps detected.</li>'}</ul>
        </div>
        <div>
          <h4 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">SKU Benchmarking</h4>
          <table class="w-full mt-2 text-sm">
            <thead class="text-slate-500">
              <tr>
                <th class="text-left py-2">SKU</th>
                <th class="text-right py-2">Units</th>
                <th class="text-right py-2">Cust Avg</th>
                <th class="text-right py-2">Median</th>
                <th class="text-right py-2">Uplift</th>
              </tr>
            </thead>
            <tbody>${skuRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  async function loadList() {
    const start = startInput.value;
    const end = endInput.value;
    const response = await MM.apiFetch(`/customers?start=${start}&end=${end}`);
    renderTable(response.data);
    renderDetail(null);
  }

  async function loadDetail(customerName) {
    const detail = await MM.apiFetch(`/customers/${encodeURIComponent(customerName)}`);
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

  [startInput, endInput].forEach((input) => input.addEventListener('change', validateRange));
});
