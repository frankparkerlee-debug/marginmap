document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('uploadForm');
  const fileInput = document.getElementById('dataFile');
  const statusEl = document.getElementById('uploadStatus');
  const summaryEl = document.getElementById('uploadSummary');

  function reset() {
    statusEl.textContent = '';
    summaryEl.innerHTML = '';
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    reset();

    if (!fileInput.files.length) {
      statusEl.textContent = 'Please choose a CSV or Excel file to upload.';
      statusEl.className = 'text-sm text-red-600 mt-4';
      return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      statusEl.textContent = 'Uploading…';
      statusEl.className = 'text-sm text-slate-500 mt-4';

      const token = MM.getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Upload failed');
      }

      const data = await response.json();
      statusEl.textContent = 'Upload complete.';
      statusEl.className = 'text-sm text-teal-600 mt-4';

      const mappedFields = data.mapped_fields
        .map((field) => `<li><span class="font-medium">${field.field}</span> ← ${field.source_header}</li>`)
        .join('');

      summaryEl.innerHTML = `
        <div class="mt-4 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <p class="text-sm text-slate-600">Stored as <span class="font-medium">${data.stored_filename}</span></p>
          <p class="text-sm text-slate-600">Rows loaded: <span class="font-medium">${data.row_count.toLocaleString()}</span></p>
          <div>
            <h4 class="text-sm font-semibold text-slate-600 uppercase tracking-wide">Mapped Fields</h4>
            <ul class="text-sm text-slate-500 mt-2 space-y-1">${mappedFields}</ul>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div class="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <p class="text-slate-500">Revenue</p>
              <p class="text-lg font-semibold text-slate-900">${MM.formatCurrency(data.kpis.revenue)}</p>
            </div>
            <div class="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <p class="text-slate-500">Leakage</p>
              <p class="text-lg font-semibold text-red-600">${MM.formatCurrency(data.kpis.leakage)}</p>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      statusEl.textContent = err.message;
      statusEl.className = 'text-sm text-red-600 mt-4';
    }
  });
});
