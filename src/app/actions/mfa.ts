// Client-side helpers que llaman al API route
// Reemplazan las server actions rotas — misma interfaz, sin 'use server'

export async function sendMfaEmail(email: string) {
  try {
    const res = await fetch('/api/auth/mfa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    return await res.json()
  } catch (e: any) {
    console.error('[MFA Client] Error:', e)
    return { success: false, error: 'No se pudo contactar al servidor' }
  }
}

export async function verifyMfaCode(email: string, otp: string, hash: string, expiration: number) {
  try {
    const res = await fetch('/api/auth/mfa', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, hash, expiration })
    })
    return await res.json()
  } catch (e: any) {
    console.error('[MFA Client] Error:', e)
    return { success: false, error: 'Error de verificación' }
  }
}
