document.addEventListener('DOMContentLoaded', () => {
  const listContainer = document.getElementById('actionsList');
  const refreshBtn = document.getElementById('refreshActions');
  const generateBtn = document.getElementById('generateActions');
  const exportBtn = document.getElementById('exportActions');

  function renderActions(actions) {
    listContainer.innerHTML = '';

    if (!actions.length) {
      listContainer.innerHTML = '<p class="text-sm text-slate-500">No active recommendations. Refresh to generate new insights.</p>';
      return;
    }

    actions.forEach((action) => {
      const card = document.createElement('div');
      card.className = 'bg-white border border-slate-200 rounded-lg p-4 shadow-sm';
      card.innerHTML = `
        <div class="flex items-start justify-between">
          <div>
            <span class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-lg ${
              action.category === 'pricing'
                ? 'bg-teal-100 text-teal-700'
                : action.category === 'payer'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-slate-100 text-slate-600'
            } uppercase tracking-wide">${action.category}</span>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-slate-900">${MM.formatCurrency(action.dollar_impact)} impact</p>
            <p class="text-xs text-slate-400">${dayjs(action.created_at).format('MMM D, YYYY')}</p>
          </div>
        </div>
        <div class="mt-3 space-y-2">
          <p class="text-sm font-semibold text-slate-800">${action.issue_text}</p>
          <p class="text-sm text-slate-600">${action.suggested_action}</p>
        </div>
        <div class="mt-4 flex gap-2">
          <button data-action="resolved" data-id="${action.id}" class="px-3 py-2 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition">Mark Resolved</button>
          <button data-action="snoozed" data-id="${action.id}" class="px-3 py-2 text-sm rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition">Snooze</button>
        </div>
      `;
      listContainer.appendChild(card);
    });
  }

  async function loadActions() {
    const response = await MM.apiFetch('/actions?status=open');
    renderActions(response.data);
  }

  async function updateActionStatus(id, status) {
    await MM.apiFetch(`/actions/${id}`, {
      method: 'PATCH',
      body: { status }
    });
    await loadActions();
  }

  listContainer.addEventListener('click', (event) => {
    const target = event.target;
    if (target.dataset.action && target.dataset.id) {
      updateActionStatus(target.dataset.id, target.dataset.action).catch(console.error);
    }
  });

  refreshBtn.addEventListener('click', () => {
    loadActions().catch(console.error);
  });

  generateBtn.addEventListener('click', () => {
    MM.apiFetch('/actions/generate', { method: 'POST' })
      .then(() => loadActions())
      .catch((err) => console.error(err));
  });

  exportBtn.addEventListener('click', async () => {
    try {
      const token = MM.getToken();
      const response = await fetch('/api/actions/export/csv', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Unable to export CSV');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `marginmap_recommendations_${dayjs().format('YYYYMMDD_HHmm')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  });

  loadActions().catch(console.error);
});
