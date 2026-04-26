import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import pdfParse from 'pdf-parse';
import { pool } from '@/lib/db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ExtractedItem {
  name: string;
  supplier: string | null;
  unit_cost_usd: number | null;
  quantity_kg: number | null;
  invoice_number: string | null;
}

interface MatchedItem extends ExtractedItem {
  status: 'MATCH' | 'FUZZY' | 'NEW';
  chemical_id: number | null;
  current_cost: number | null;
  matched_name: string | null;
  confidence: number;
}

// Simple Levenshtein for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const la = a.toLowerCase(), lb = b.toLowerCase();
  if (la === lb) return 1;
  if (la.includes(lb) || lb.includes(la)) return 0.85;
  const maxLen = Math.max(la.length, lb.length);
  return maxLen === 0 ? 1 : 1 - levenshtein(la, lb) / maxLen;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!process.env.ANTHROPIC_API_KEY)
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    let pdfText = '';
    try {
      const parsed = await pdfParse(buffer);
      pdfText = parsed.text;
    } catch {
      return NextResponse.json({ error: 'Could not parse PDF' }, { status: 400 });
    }

    if (!pdfText.trim())
      return NextResponse.json({ error: 'PDF has no extractable text (scanned image PDFs not yet supported)' }, { status: 400 });

    // Ask Claude to extract structured data
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Sos un experto en análisis de facturas de productos químicos industriales.
Extraé todos los productos de esta factura y devolvé SOLO un array JSON válido, sin texto adicional.

Estructura de cada item:
{
  "name": "nombre exacto del producto como aparece en la factura",
  "supplier": "nombre del proveedor/vendor si aparece",
  "unit_cost_usd": número con el precio unitario en USD por kg (null si no está),
  "quantity_kg": número con la cantidad en kg (null si no está),
  "invoice_number": "número de factura si aparece en el documento"
}

Factura:
---
${pdfText.slice(0, 8000)}
---

Respondé SOLO con el array JSON, comenzando con [ y terminando con ].`,
      }],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    let extracted: ExtractedItem[] = [];
    try {
      const jsonStart = rawText.indexOf('[');
      const jsonEnd   = rawText.lastIndexOf(']') + 1;
      extracted = JSON.parse(rawText.slice(jsonStart, jsonEnd));
    } catch {
      return NextResponse.json({ error: 'Claude could not parse the invoice structure', raw: rawText }, { status: 422 });
    }

    // Load chemicals catalogue for matching
    const { rows: catalogue } = await pool.query(
      `SELECT id, name, supplier, unit_cost FROM chemicals WHERE active = TRUE ORDER BY name`,
    );

    // Match each extracted item against the catalogue
    const items: MatchedItem[] = extracted.map(item => {
      let bestMatch: typeof catalogue[0] | null = null;
      let bestScore = 0;

      for (const chem of catalogue) {
        const score = similarity(item.name, chem.name);
        if (score > bestScore) { bestScore = score; bestMatch = chem; }
      }

      if (bestScore >= 0.9) {
        return { ...item, status: 'MATCH', chemical_id: bestMatch!.id, current_cost: Number(bestMatch!.unit_cost), matched_name: bestMatch!.name, confidence: bestScore };
      } else if (bestScore >= 0.6) {
        return { ...item, status: 'FUZZY', chemical_id: bestMatch!.id, current_cost: Number(bestMatch!.unit_cost), matched_name: bestMatch!.name, confidence: bestScore };
      } else {
        return { ...item, status: 'NEW', chemical_id: null, current_cost: null, matched_name: null, confidence: bestScore };
      }
    });

    return NextResponse.json({
      items,
      total: items.length,
      matched: items.filter(i => i.status === 'MATCH').length,
      fuzzy:   items.filter(i => i.status === 'FUZZY').length,
      new:     items.filter(i => i.status === 'NEW').length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
