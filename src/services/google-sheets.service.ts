import { google } from 'googleapis';

// Expected column order in the Orders Live Tracker sheet:
// A: PO_CLIENT | B: CUSTOMER | C: ARTICLE | D: COLOR | E: TYPE
// F: QTY | G: UNIT | H: STATUS | I: ETA | J: NOTES
// K: CRUST_SUPPLIER | L: CRUST_COST | M: SELL_PRICE

const ORDERS_SHEET_ID = process.env.GOOGLE_ORDERS_SHEET_ID || '15t8d5Crgdgbh-qld6-hVCXTUqPuVSPThiisJm4KXON0';
const ORDERS_RANGE    = 'BULK!A2:M200';

function buildAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !key) {
    throw new Error(
      'Google Sheets credentials not configured. ' +
      'Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to .env.local'
    );
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export interface SheetOrder {
  po_client:       string;
  customer:        string;
  article:         string;
  color:           string | null;
  type:            string;
  qty:             string;
  unit:            string;
  status:          string;
  eta:             string | null;
  notes:           string | null;
  crust_supplier:  string | null;
  crust_cost:      number | null;
  sell_price:      number | null;
}

// ── Chemical & Finishing sheet (Factory — Chemical & Finishing folder) ──
const CHEM_SHEET_ID = process.env.GOOGLE_CHEM_SHEET_ID ?? '';

function buildWriteAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key   = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Google Sheets credentials not configured');
  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

export interface BatchExportRow {
  batch_number: string;
  po_number:    string;
  formula_name: string;
  sf_produced:  number;
  owner:        string;
  executed_by:  string;
  chemical_name: string;
  qty_prepared: number;
  qty_used:     number;
  waste_kg:     number;
  waste_pct:    number;
  is_anomaly:   boolean;
  date:         string;
}

export class GoogleSheetsService {
  static async getSheetData(spreadsheetId: string, range: string): Promise<string[][]> {
    const auth   = buildAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return (response.data.values as string[][] | null) ?? [];
  }

  /** Append one row per chemical layer to the "Lotes" tab */
  static async exportBatchToSheet(rows: BatchExportRow[]): Promise<void> {
    if (!CHEM_SHEET_ID) return;
    const auth   = buildWriteAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const values = rows.map(r => [
      r.date, r.owner, r.po_number, r.batch_number, r.formula_name,
      r.sf_produced, r.executed_by, r.chemical_name,
      r.qty_prepared, r.qty_used, r.waste_kg, r.waste_pct,
      r.is_anomaly ? '⚠️ ANOMALÍA' : 'OK',
    ]);

    await sheets.spreadsheets.values.append({
      spreadsheetId: CHEM_SHEET_ID,
      range: 'Lotes!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });
  }

  /** Update status cell for a PO row in "Órdenes" tab */
  static async updatePoStatus(poNumber: string, status: string, sfProduced: number): Promise<void> {
    if (!CHEM_SHEET_ID) return;
    const auth   = buildWriteAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Find the row with this PO number
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: CHEM_SHEET_ID,
      range: 'Órdenes!A:A',
    });
    const rows = existing.data.values ?? [];
    const rowIdx = rows.findIndex(r => r[0] === poNumber);
    if (rowIdx === -1) return;

    const row = rowIdx + 1;
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: CHEM_SHEET_ID,
      requestBody: {
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: `Órdenes!H${row}`, values: [[status]] },
          { range: `Órdenes!F${row}`, values: [[sfProduced]] },
        ],
      },
    });
  }

  static async getOrdersFromSheet(): Promise<SheetOrder[]> {
    const rows = await this.getSheetData(ORDERS_SHEET_ID, ORDERS_RANGE);

    return rows
      .filter(row => row[0]?.trim())     // skip rows with no PO_CLIENT
      .map(row => ({
        po_client:      row[0]?.trim()  ?? '',
        customer:       row[1]?.trim()  ?? '',
        article:        row[2]?.trim()  ?? '',
        color:          row[3]?.trim()  || null,
        type:           row[4]?.trim()  || 'bulk',
        qty:            row[5]?.trim()  ?? '0',
        unit:           row[6]?.trim()  || 'SF',
        status:         row[7]?.trim()  || 'NEW',
        eta:            row[8]?.trim()  || null,
        notes:          row[9]?.trim()  || null,
        crust_supplier: row[10]?.trim() || null,
        crust_cost:     row[11] ? parseFloat(row[11]) : null,
        sell_price:     row[12] ? parseFloat(row[12]) : null,
      }));
  }
}
