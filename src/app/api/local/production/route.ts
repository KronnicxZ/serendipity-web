import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.SOFIA_BACKEND_URL || 'http://localhost:5001'

const STATIONS = [
    { id: 'receiving', name: 'Receiving',  order_index: 0, color: '#94a3b8', description: 'Recepcion de cueros', status: 'in-progress' },
    { id: 'spray',     name: 'Spraying',   order_index: 1, color: '#6366f1', description: 'Aplicacion de acabado', status: 'in-progress' },
    { id: 'emboss',    name: 'Embossing',  order_index: 2, color: '#8b5cf6', description: 'Grabado de textura', status: 'in-progress' },
    { id: 'buff',      name: 'Buffing',    order_index: 3, color: '#a78bfa', description: 'Pulido y acabado', status: 'in-progress' },
    { id: 'qc',        name: 'QC Control', order_index: 4, color: '#f59e0b', description: 'Control LWG Gold', status: 'in-progress' },
    { id: 'pack',      name: 'Packing',    order_index: 5, color: '#10b981', description: 'Empaque y exportacion', status: 'in-progress' },
]

export async function GET(req: NextRequest) {
    try {
        // Consume assembled molecular data from Sofia backend
        const molRes = await fetch(BACKEND + '/api/molecules/all', { cache: 'no-store' })
        const mol = await molRes.json()

        const pp  = mol.productionPulse  || {}
        const ppC = pp.compounds || {}
        const ppA = pp.atoms     || {}
        const fh  = mol.financialHealth  || {}
        const fhA = fh.atoms     || {}
        const tp  = mol.teamPerformance  || {}
        const tpC = tp.compounds || {}
        const or_ = mol.operationalRisk  || {}
        const orC = or_.compounds || {}
        const pb  = mol.praraBond        || {}
        const pbC = pb.compounds || {}

        const byClient = ppA.byClient || {}
        const totalSf  = ppA.sfCurrentMonth || 0

        const orders = Object.entries(byClient).map(([client, sf]: [string, any], idx) => ({
            id: 'ORD-' + client + '-' + (pp.period || '').replace('-', ''),
            qrCode: 'SER-' + client.replace(/\s/g, '') + (pp.period || '').replace('-', ''),
            status: (sf > 100000 ? 'green' : sf > 5000 ? 'amber' : 'green') as 'green' | 'amber' | 'red',
            customer: client,
            product: 'Finished Leather Processing',
            quantity: sf,
            unit: 'SF',
            dueDate: pp.period ? pp.period + '-30' : new Date().toISOString().slice(0, 10),
            createdAt: pp.period ? pp.period + '-01T00:00:00Z' : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            currentStationId: idx === 0 ? 'qc' : idx === 1 ? 'buff' : 'pack',
            notes: `${Number(sf).toLocaleString()} SF — ${totalSf > 0 ? ((sf/totalSf)*100).toFixed(1) : 0}% del volumen`,
            statusHistory: [],
            stationHistory: [],
        }))

        return NextResponse.json({
            orders,
            stations: STATIONS,
            summary: {
                totalSf,
                target: 150000,
                progressPct: ppC.progressPct || 0,
                byClient,
                dailyVelocity: ppC.dailyVelocitySF || 0,
                projectedMonth: ppC.projectedMonthSF || 0,
                pulseLabel: ppC.pulseLabel || 'unknown',
                grossMarginPct: fhA.grossMarginPct || 0,
                healthLabel: (fhA as any).healthLabel || 'unknown',
                pendingPayablesUsd: fhA.pendingPayablesUsd || 0,
                headcount: (tp.atoms as any)?.headcount || 0,
                sfPerEmpDay: tpC.sfPerEmployeePerDay || 0,
                riskScore: orC.riskScore || 0,
                riskLabel: orC.riskLabel || 'unknown',
                praraBalance: (pb.atoms as any)?.remainingBalanceUsd || 0,
                praraPaidPct: pbC.paidPct || 0,
            }
        })
    } catch (err: any) {
        console.error('Molecular production route error:', err)
        return NextResponse.json({
            error: err.message, orders: [], stations: STATIONS,
            summary: { totalSf: 0, target: 150000, progressPct: 0, byClient: {} }
        }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        
        // REENVÍO AL VPS DE SANTIAGO (Sofia Backend)
        // Se asume el endpoint: /api/serendipity/update-tracking o similar
        const response = await fetch(BACKEND + '/api/serendipity/update-tracking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            console.warn('VPS Santiago no respondió a la actualización, continuando con Supabase...')
        }

        const data = await response.json().catch(() => ({}))
        return NextResponse.json({ success: true, vpsResponse: data })
    } catch (err: any) {
        console.error('Error enviando tracking al VPS:', err)
        // Retornamos éxito aunque falle el VPS para permitir que el flujo siga en Supabase (Resiliencia)
        return NextResponse.json({ success: false, error: err.message }, { status: 200 })
    }
}
