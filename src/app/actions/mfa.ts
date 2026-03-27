'use server'

import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)
const SECRET = process.env.MFA_SECRET || 'super_secret_rituals'

export async function sendMfaEmail(email: string) {
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiration = Date.now() + 1000 * 60 * 10 // 10 mins

        const data = `${email}:${otp}:${expiration}`
        const hash = crypto.createHmac('sha256', SECRET).update(data).digest('hex')

        const { data: responseData, error } = await resend.emails.send({
            from: 'Anthropos OS <noreply@serendipity.vn>',
            to: email, 
            subject: 'Tu Código de Sincronía - Anthropos OS',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px; border: 1px solid #e5e7eb; border-radius: 24px; background-color: #f9fafb;">
                    <div style="text-align: center; margin-bottom: 24px;">
                        <span style="font-size: 24px; font-weight: 800; color: #2563eb;">Anthropos<span style="color: #f59e0b;">.</span></span>
                    </div>
                    <h2 style="color: #111827; margin-top: 0; text-align: center;">Verificación Ritual</h2>
                    <p style="color: #4b5563; line-height: 1.6; text-align: center;">Has iniciado el protocolo de acceso a Anthropos OS. Ingresa el siguiente código de 6 dígitos para sincronizar tu identidad y acceder al Templo.</p>
                    <div style="margin: 32px 0; padding: 24px; background-color: #fff; border-radius: 16px; border: 1px solid #e5e7eb; text-align: center;">
                        <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #f59e0b;">${otp}</span>
                    </div>
                    <p style="color: #9ca3af; font-size: 13px; text-align: center;">El código expirará en 10 minutos. Si no solicitaste este acceso, puedes ignorar este correo de forma segura.</p>
                </div>
            `
        });

        if (error) {
            console.error('Resend specific error:', error)
            return { success: false, error: 'Error del servidor de correos (Resend). Verifica que estás enviando al correo registrado en tu cuenta de pruebas.' }
        }

        return { success: true, hash, expiration }
    } catch (e: any) {
        console.error('MFA Send Exception:', e)
        return { success: false, error: 'Hubo un problema enviando el código. Revisa los logs.' }
    }
}

export async function verifyMfaCode(email: string, otp: string, hash: string, expiration: number) {
    if (Date.now() > expiration) {
        return { success: false, error: 'El código ha expirado, solicita uno nuevo.' }
    }
    const data = `${email}:${otp}:${expiration}`
    const expectedHash = crypto.createHmac('sha256', SECRET).update(data).digest('hex')

    if (hash === expectedHash) {
        return { success: true }
    }

    return { success: false, error: 'El código de sincronía es incorrecto.' }
}
