import { NextRequest, NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/services/google-sheets.service';

/**
 * Endpoint para sincronizar datos desde Google Sheets a la base de datos local.
 * GET /api/serendipity/sheets/sync
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verificar si las credenciales están configuradas
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({ 
        success: false, 
        message: 'Google Sheets API no configurada. Santiago debe añadir las credenciales al .env.local' 
      }, { status: 500 });
    }

    // 2. Obtener datos del "Orders Live Tracker"
    const spreadsheetId = process.env.GOOGLE_ORDERS_SHEET_ID!;
    const range = 'Orders!A2:E20'; // Ejemplo: Cliente, Artículo, Qty, ETA, Status
    
    const rows = await GoogleSheetsService.getSheetData(spreadsheetId, range);

    return NextResponse.json({
      success: true,
      message: `${rows.length} filas recuperadas del Google Sheet`,
      data: rows,
    });

  } catch (error: any) {
    console.error('Error in Sheets Sync:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
