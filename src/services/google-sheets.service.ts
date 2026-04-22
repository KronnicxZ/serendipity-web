import { google } from 'googleapis';

/**
 * Servicio para interactuar con Google Sheets API.
 * Requiere una Service Account con acceso de lectura a los documentos correspondientes.
 */
export class GoogleSheetsService {
  private static auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  /**
   * Obtiene datos de un rango específico en un Google Sheet.
   * @param spreadsheetId ID del documento (extraído de la URL)
   * @param range Rango (ej: 'Hoja1!A1:E10')
   */
  static async getSheetData(spreadsheetId: string, range: string) {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.auth });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      return response.data.values || [];
    } catch (error) {
      console.error('Error fetching data from Google Sheets:', error);
      throw error;
    }
  }

  /**
   * Mapeo específico para el Orders Live Tracker
   */
  static async getOrdersFromSheet() {
    const spreadsheetId = '15t8d5Crgdgbh-qld6-hVCXTUqPuVSPThiisJm4KXON0';
    const range = 'Orders!A2:Z100'; // Ajustar según la estructura real de la hoja
    const data = await this.getSheetData(spreadsheetId, range);
    
    // Aquí transformamos las filas del Excel en objetos Order (esto se ajustará en la Fase 3)
    return data.map(row => ({
      customer: row[0],
      article: row[1],
      qty: row[2],
      eta: row[3],
      // ... mapeo dinámico
    }));
  }
}
