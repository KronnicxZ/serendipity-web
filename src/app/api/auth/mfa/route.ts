import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import fs from 'fs'

export const runtime = 'nodejs'

const SECRET = process.env.MFA_SECRET || 'serendipity_mfa_2026_sacred_key'

function log(msg: string) {
  const line = new Date().toISOString() + ' ' + msg + '\n'
  try { fs.appendFileSync('/tmp/mfa-debug.log', line) } catch(e) {}
  console.log('[MFA]', msg)
}

function getTransporter() {
  return nodemailer.createTransport({
    host: 'pro206.emailserver.vn',
    port: 465,
    secure: true,
    auth: {
      user: 'sofia@serendipity.vn',
      pass: 'uU99-twnvJ'
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  })
}

export async function POST(req: NextRequest) {
  log('POST received')
  try {
    log('Parsing body...')
    const body = await req.json()
    log('Body parsed: ' + JSON.stringify(body))
    const email = body.email
    if (!email) {
      return NextResponse.json({ success: false, error: 'Email requerido' }, { status: 400 })
    }

    log('Generating OTP...')
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiration = Date.now() + 1000 * 60 * 30
    const data = email + ':' + otp + ':' + expiration
    log('HMAC data prepared')
    const hash = crypto.createHmac('sha256', SECRET).update(data).digest('hex')
    log('Hash generated OK')

    const emailHtml = [
      '<div style="font-family:Arial;max-width:480px;margin:0 auto;padding:40px 32px;border:1px solid #e5e7eb;border-radius:24px;">',
      '<h1 style="text-align:center;color:#111827;">Verificacion Ritual</h1>',
      '<div style="text-align:center;padding:28px;background:#fff;border-radius:16px;">',
      '<p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:3px;">Codigo de Sincronia</p>',
      '<span style="font-size:40px;font-weight:900;letter-spacing:10px;color:#f59e0b;font-family:monospace;">' + otp + '</span>',
      '</div>',
      '<p style="color:#9ca3af;font-size:12px;text-align:center;">Expira en 30 minutos.</p>',
      '</div>'
    ].join('')

    log('Creating transporter...')
    const transporter = getTransporter()
    log('Sending email fire-and-forget...')
    transporter.sendMail({
      from: '"Anthropos OS" <sofia@serendipity.vn>',
      to: email,
      subject: 'Tu Codigo de Sincronia - Anthropos OS',
      html: emailHtml
    }).then(() => {
      log('Email sent OK to ' + email)
    }).catch((err: any) => {
      log('Email send error (likely still delivered): ' + err.message)
    })

    log('Returning hash immediately')
    return NextResponse.json({ success: true, hash, expiration })
  } catch (e: any) {
    log('POST ERROR: ' + e.message + ' | Stack: ' + (e.stack || 'none'))
    return NextResponse.json(
      { success: false, error: 'Error generando codigo de verificacion' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  log('PUT received')
  try {
    const body = await req.json()
    log('PUT body: ' + JSON.stringify(body))
    const { email, otp, hash, expiration } = body

    if (Date.now() > expiration) {
      return NextResponse.json({ success: false, error: 'El codigo ha expirado, solicita uno nuevo.' })
    }

    const data = email + ':' + otp + ':' + expiration
    const expectedHash = crypto.createHmac('sha256', SECRET).update(data).digest('hex')

    if (hash === expectedHash) {
      log('MFA verification SUCCESS for ' + email)
      return NextResponse.json({ success: true })
    }

    log('MFA verification FAILED for ' + email)
    return NextResponse.json({ success: false, error: 'El codigo de sincronia es incorrecto.' })
  } catch (e: any) {
    log('PUT ERROR: ' + e.message + ' | Stack: ' + (e.stack || 'none'))
    return NextResponse.json({ success: false, error: 'Error de verificacion' }, { status: 500 })
  }
}
