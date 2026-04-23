import { NextResponse } from 'next/server';
import { FinanceService } from '@/services/finance.service';

export async function GET() {
    try {
        const summary = await FinanceService.getSummary();
        return NextResponse.json(summary);
    } catch (error: any) {
        console.error('Finance API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch finance summary', details: error.message },
            { status: 500 }
        );
    }
}
