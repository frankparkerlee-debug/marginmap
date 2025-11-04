import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import db from '../db/index.js';

/**
 * Data ingestion service for CSV/Excel uploads
 * Validates, maps, and imports transaction data
 */

const REQUIRED_COLUMNS = [
  'date',
  'customer_name',
  'sku_code',
  'sku_name',
  'qty_sold',
  'unit_cost',
  'unit_price'
];

const OPTIONAL_COLUMNS = [
  'invoice_id',
  'region',
  'category',
  'unit_discount',
  'returned_units'
];

const COLUMN_ALIASES = {
  'transaction_date': 'date',
  'sale_date': 'date',
  'customer': 'customer_name',
  'client': 'customer_name',
  'product_code': 'sku_code',
  'sku': 'sku_code',
  'product_name': 'sku_name',
  'product': 'sku_name',
  'quantity': 'qty_sold',
  'qty': 'qty_sold',
  'units': 'qty_sold',
  'cost': 'unit_cost',
  'price': 'unit_price',
  'discount': 'unit_discount',
  'returns': 'returned_units'
};

function normalizeColumnName(col) {
  const normalized = col.toLowerCase().trim().replace(/\s+/g, '_');
  return COLUMN_ALIASES[normalized] || normalized;
}

export function parseFile(filePath, originalFilename) {
  const ext = originalFilename.split('.').pop().toLowerCase();

  let records = [];

  if (ext === 'csv') {
    const content = readFileSync(filePath, 'utf-8');
    records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } else if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    records = XLSX.utils.sheet_to_json(sheet);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel files.');
  }

  return records;
}

export function validateAndMapColumns(records) {
  if (!records || records.length === 0) {
    throw new Error('File is empty or could not be parsed');
  }

  const firstRow = records[0];
  const originalColumns = Object.keys(firstRow);
  const normalizedColumns = originalColumns.map(normalizeColumnName);

  // Check for required columns
  const missingColumns = REQUIRED_COLUMNS.filter(col => !normalizedColumns.includes(col));

  if (missingColumns.length > 0) {
    return {
      success: false,
      error: `Missing required columns: ${missingColumns.join(', ')}`,
      foundColumns: originalColumns,
      expectedColumns: REQUIRED_COLUMNS,
      suggestions: missingColumns.map(col => {
        const similar = originalColumns.filter(orig =>
          orig.toLowerCase().includes(col) || col.includes(orig.toLowerCase())
        );
        return { missing: col, suggestions: similar };
      })
    };
  }

  // Map records to normalized schema
  const mappedRecords = records.map(record => {
    const mapped = {};

    for (const [originalCol, value] of Object.entries(record)) {
      const normalizedCol = normalizeColumnName(originalCol);
      mapped[normalizedCol] = value;
    }

    // Ensure all required fields exist with defaults
    return {
      date: mapped.date || new Date().toISOString().split('T')[0],
      invoice_id: mapped.invoice_id || null,
      customer_name: mapped.customer_name,
      region: mapped.region || null,
      sku_code: String(mapped.sku_code),
      sku_name: mapped.sku_name,
      category: mapped.category || 'Uncategorized',
      qty_sold: parseFloat(mapped.qty_sold) || 0,
      unit_cost: parseFloat(mapped.unit_cost) || 0,
      unit_price: parseFloat(mapped.unit_price) || 0,
      unit_discount: parseFloat(mapped.unit_discount) || 0,
      returned_units: parseFloat(mapped.returned_units) || 0
    };
  });

  return {
    success: true,
    records: mappedRecords,
    rowCount: mappedRecords.length
  };
}

export function importTransactions(records) {
  const insertStmt = db.prepare(`
    INSERT INTO transactions (
      date, invoice_id, customer_name, region, sku_code, sku_name,
      category, qty_sold, unit_cost, unit_price, unit_discount, returned_units
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((txns) => {
    for (const t of txns) {
      insertStmt.run(
        t.date,
        t.invoice_id,
        t.customer_name,
        t.region,
        t.sku_code,
        t.sku_name,
        t.category,
        t.qty_sold,
        t.unit_cost,
        t.unit_price,
        t.unit_discount,
        t.returned_units
      );
    }
  });

  insertMany(records);

  return {
    success: true,
    imported: records.length
  };
}

export function processUpload(filePath, originalFilename, userId) {
  try {
    // Parse file
    const records = parseFile(filePath, originalFilename);

    // Validate and map
    const validation = validateAndMapColumns(records);

    if (!validation.success) {
      return validation;
    }

    // Import to database
    const importResult = importTransactions(validation.records);

    // Log upload
    db.prepare(`
      INSERT INTO uploads (filename, original_filename, uploaded_by, row_count, processing_status, mapped)
      VALUES (?, ?, ?, ?, 'completed', 1)
    `).run(filePath, originalFilename, userId, importResult.imported);

    return {
      success: true,
      imported: importResult.imported,
      message: `Successfully imported ${importResult.imported} transactions`
    };

  } catch (error) {
    // Log failed upload
    db.prepare(`
      INSERT INTO uploads (filename, original_filename, uploaded_by, row_count, processing_status, error_log)
      VALUES (?, ?, ?, 0, 'failed', ?)
    `).run(filePath, originalFilename, userId, error.message);

    return {
      success: false,
      error: error.message
    };
  }
}
