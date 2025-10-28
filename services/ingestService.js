const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const { parse } = require('csv-parse');
const XLSX = require('xlsx');
const { run } = require('../db');
const { calculateGrossMargin, calculateLeakage } = require('./analyticsService');

const REQUIRED_FIELDS = [
  'date_of_service',
  'invoice_id',
  'customer_name',
  'payer_name',
  'sku_code',
  'description',
  'qty',
  'unit_cost',
  'unit_price_billed',
  'unit_price_paid'
];

const FIELD_ALIASES = {
  date_of_service: ['date_of_service', 'service_date', 'dos', 'date'],
  invoice_id: ['invoice_id', 'claim_id', 'invoice', 'document_id'],
  customer_name: ['customer_name', 'customer', 'clinic', 'physician', 'buyer'],
  payer_name: ['payer_name', 'payer', 'insurance', 'plan', 'carrier'],
  sku_code: ['sku_code', 'sku', 'cpt_code', 'item_code', 'product_code'],
  description: ['description', 'desc', 'item_description', 'service_description'],
  qty: ['qty', 'quantity', 'units', 'volume'],
  unit_cost: ['unit_cost', 'cost', 'cost_per_unit', 'cogs'],
  unit_price_billed: ['unit_price_billed', 'price_billed', 'billed_amount', 'charge'],
  unit_price_paid: ['unit_price_paid', 'price_paid', 'paid_amount', 'collected', 'realized_price']
};

const normalizeHeader = (header) =>
  header
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

async function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;
    fs.createReadStream(filePath)
      .pipe(parse({ columns: false, trim: true }))
      .on('data', (row) => {
        if (!headers) {
          headers = row.map((col) => col.toString().trim());
        } else {
          rows.push(row);
        }
      })
      .on('end', () => resolve({ headers, rows }))
      .on('error', reject);
  });
}

async function parseExcel(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' });
  const headers = sheet[0].map((col) => col.toString().trim());
  const rows = sheet.slice(1);
  return { headers, rows };
}

function buildMapping(headers, providedMapping) {
  if (!headers || headers.length === 0) {
    throw new Error('File is missing header row');
  }
  const normalized = headers.map((header) => normalizeHeader(header));
  const mapping = {};

  REQUIRED_FIELDS.forEach((field) => {
    const provided = providedMapping ? providedMapping[field] : null;
    if (provided) {
      const providedIndex = normalized.indexOf(normalizeHeader(provided));
      if (providedIndex >= 0) {
        mapping[field] = { index: providedIndex, header: headers[providedIndex] };
        return;
      }
    }
    const aliases = FIELD_ALIASES[field] || [];
    const foundIndex = normalized.findIndex((col) => aliases.includes(col));
    if (foundIndex === -1) {
      throw new Error(`Missing required column "${field}". Provide a mapping override.`);
    }
    mapping[field] = { index: foundIndex, header: headers[foundIndex] };
  });

  return mapping;
}

function excelSerialToDate(value) {
  const serial = Number(value);
  if (!Number.isFinite(serial)) return null;
  const baseDate = dayjs('1899-12-30');
  return baseDate.add(serial, 'day');
}

function parseDate(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date) return dayjs(value);
  if (typeof value === 'number' || /^\d+(\.\d+)?$/.test(value)) {
    const converted = excelSerialToDate(value);
    if (converted && converted.isValid()) return converted;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
}

function normalizeRow(raw) {
  const date = parseDate(raw.date_of_service);
  if (!date) {
    throw new Error(`Invalid date_of_service value: ${raw.date_of_service}`);
  }
  return {
    date_of_service: date.format('YYYY-MM-DD'),
    invoice_id: raw.invoice_id ? raw.invoice_id.toString().trim() : null,
    customer_name: raw.customer_name ? raw.customer_name.toString().trim() : 'Unknown',
    payer_name: raw.payer_name ? raw.payer_name.toString().trim() : 'Unknown',
    sku_code: raw.sku_code ? raw.sku_code.toString().trim() : 'UNMAPPED',
    description: raw.description ? raw.description.toString().trim() : '',
    qty: Number(raw.qty) || 0,
    unit_cost: Number(raw.unit_cost) || 0,
    unit_price_billed: Number(raw.unit_price_billed) || 0,
    unit_price_paid: Number(raw.unit_price_paid) || 0
  };
}

async function processUpload(file, providedMapping = null) {
  const ext = path.extname(file.originalname).toLowerCase();
  const tabular = ext === '.xls' || ext === '.xlsx' ? await parseExcel(file.path) : await parseCsv(file.path);

  const mapping = buildMapping(tabular.headers, providedMapping);
  const mappedRows = [];
  tabular.rows.forEach((row, index) => {
    const mapped = {};
    Object.keys(mapping).forEach((field) => {
      const { index: idx } = mapping[field];
      mapped[field] = row[idx];
    });
    try {
      mappedRows.push(normalizeRow(mapped));
    } catch (err) {
      throw new Error(`Row ${index + 2}: ${err.message}`);
    }
  });

  const uploadResult = await run(
    'INSERT INTO uploads (original_filename, stored_filename, uploaded_at, row_count, mapped) VALUES (?, ?, datetime("now"), ?, 1)',
    [file.originalname, file.filename, mappedRows.length]
  );
  const uploadId = uploadResult.id;

  for (const row of mappedRows) {
    await run(
      `INSERT INTO transactions
       (upload_id, date_of_service, invoice_id, customer_name, payer_name, sku_code, description, qty, unit_cost, unit_price_billed, unit_price_paid, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))`,
      [
        uploadId,
        row.date_of_service,
        row.invoice_id,
        row.customer_name,
        row.payer_name,
        row.sku_code,
        row.description,
        row.qty,
        row.unit_cost,
        row.unit_price_billed,
        row.unit_price_paid
      ]
    );
  }

  const gross = calculateGrossMargin(mappedRows);
  const leakage = calculateLeakage(mappedRows);

  return {
    upload_id: uploadId,
    stored_filename: file.filename,
    row_count: mappedRows.length,
    mapped_fields: Object.entries(mapping).map(([field, meta]) => ({
      field,
      source_header: meta.header
    })),
    kpis: {
      revenue: Number(gross.revenue.toFixed(2)),
      cogs: Number(gross.cogs.toFixed(2)),
      gross_margin: Number(gross.gross_margin.toFixed(2)),
      gross_margin_percent: Number(gross.gross_margin_percent.toFixed(4)),
      leakage: Number(leakage.total_leakage.toFixed(2))
    }
  };
}

module.exports = { processUpload };
