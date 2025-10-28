document.addEventListener('DOMContentLoaded', () => {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const refreshBtn = document.getElementById('refreshDashboard');

  const revenueEl = document.getElementById('kpiRevenue');
  const cogsEl = document.getElementById('kpiCogs');
  const marginEl = document.getElementById('kpiMargin');
  const marginPctEl = document.getElementById('kpiMarginPct');
  const leakageEl = document.getElementById('kpiLeakage');
  const worstCustomersBody = document.getElementById('worstCustomersBody');
  const worstSkusBody = document.getElementById('worstSkusBody');
  const marginChartCanvas = document.getElementById('marginChart');

  let chart;

  function setDefaultRange() {
    const end = dayjs().format('YYYY-MM-DD');
    const start = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
    startInput.value = start;
    endInput.value = end;
  }

  function renderList(rows, container, isCustomer = true) {
    container.innerHTML = '';
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-slate-200 last:border-none';
      tr.innerHTML = `
        <td class="py-2">${isCustomer ? row.customer_name : row.sku_code || 'Unassigned'}</td>
        <td class="py-2 text-right font-medium text-red-600">${MM.formatCurrency(row.leakage)}</td>
        <td class="py-2 text-right text-slate-500">${MM.formatCurrency(row.revenue)}</td>
      `;
      container.appendChild(tr);
    });
  }

  function renderChart(data) {
    const labels = data.map((point) => point.period);
    const values = data.map((point) => (point.margin_percent * 100).toFixed(2));

    if (chart) {
      chart.data.labels = labels;
      chart.data.datasets[0].data = values;
      chart.update();
      return;
    }

    chart = new Chart(marginChartCanvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Gross Margin %',
            data: values,
            fill: false,
            borderColor: '#14b8a6',
            backgroundColor: '#0f766e',
            tension: 0.25,
            pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${Number(ctx.parsed.y).toFixed(1)}%`
            }
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => `${value}%`
            }
          }
        }
      }
    });
  }

  async function loadSummary() {
    const start = startInput.value;
    const end = endInput.value;
    const data = await MM.apiFetch(`/dashboard/summary?start=${start}&end=${end}`);

    revenueEl.textContent = MM.formatCurrency(data.kpis.revenue);
    cogsEl.textContent = MM.formatCurrency(data.kpis.cogs);
    marginEl.textContent = MM.formatCurrency(data.kpis.gross_margin);
    marginPctEl.textContent = MM.formatPercent(data.kpis.gross_margin_percent);
    leakageEl.textContent = MM.formatCurrency(data.kpis.leakage);

    renderList(data.worst_customers || [], worstCustomersBody, true);
    renderList(data.worst_skus || [], worstSkusBody, false);
    renderChart(data.margin_trend || []);
  }

  function validateRange() {
    if (dayjs(startInput.value).isAfter(dayjs(endInput.value))) {
      startInput.value = dayjs(endInput.value).subtract(30, 'day').format('YYYY-MM-DD');
    }
  }

  setDefaultRange();
  loadSummary().catch(console.error);

  refreshBtn.addEventListener('click', () => {
    validateRange();
    loadSummary().catch((err) => console.error(err));
  });

  [startInput, endInput].forEach((input) => {
    input.addEventListener('change', () => {
      validateRange();
    });
  });
});
