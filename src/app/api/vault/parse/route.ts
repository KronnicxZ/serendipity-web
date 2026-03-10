import { NextResponse } from 'next/server';
const pdfParse = require('pdf-parse');

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        let extractedText = '';

        if (file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdfParse(buffer);
            extractedText = data.text;
        } else if (file.type === 'text/plain' || file.type === 'application/json' || file.name.endsWith('.txt') || file.name.endsWith('.json')) {
            extractedText = await file.text();
        } else {
            return NextResponse.json({ error: 'Unsupported file type. Please upload a PDF, TXT or JSON.' }, { status: 400 });
        }

        return NextResponse.json({ text: extractedText });
    } catch (error: any) {
        console.error('Error parsing file:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
