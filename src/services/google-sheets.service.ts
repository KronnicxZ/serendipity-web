import { google } from 'googleapis';

// Expected column order in the Orders Live Tracker sheet:
// A: PO_CLIENT | B: CUSTOMER | C: ARTICLE | D: COLOR | E: TYPE
// F: QTY | G: UNIT | H: STATUS | I: ETA | J: NOTES
// K: CRUST_SUPPLIER | L: CRUST_COST | M: SELL_PRICE

const ORDERS_SHEET_ID = '15t8d5Crgdgbh-qld6-hVCXTUqPuVSPThiisJm4KXON0';
const ORDERS_RANGE    = 'Sheet1!A2:M200';

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

export class GoogleSheetsService {
  static async getSheetData(spreadsheetId: string, range: string): Promise<string[][]> {
    const auth   = buildAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    return (response.data.values as string[][] | null) ?? [];
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
