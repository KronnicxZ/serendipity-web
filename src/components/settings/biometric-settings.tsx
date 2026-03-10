'use client'

import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Card, Button, Badge } from '@/components/ui-library'
import { Fingerprint, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export function BiometricSettings() {
    const [isRegistering, setIsRegistering] = useState(false)

    const handleRegisterFingerprint = async () => {
        setIsRegistering(true)
        try {
            const supabase = createClient()
            if (!supabase) throw new Error('Supabase client missing')
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                toast.error('Sesión no encontrada')
                return
            }

            // 1. Obtener opciones del servidor
            const res = await fetch('/api/auth/webauthn/generate-registration-options', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            })

            const options = await res.json()
            if (options.error) {
                throw new Error(options.error)
            }

            // 2. Pedir huella al navegador/dispositivo
            const attResp = await startRegistration(options)

            // 3. Enviar respuesta validada al servidor
            const verificationRes = await fetch('/api/auth/webauthn/verify-registration-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(attResp)
            })

            const verification = await verificationRes.json()

            if (verification.verified) {
                toast.success('¡Huella registrada exitosamente!')
            } else {
                toast.error(`Error de verificación: ${verification.error || 'Desconocido'}`)
            }

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || 'Error al registrar huella')
        } finally {
            setIsRegistering(false)
        }
    }

    return (
        <Card className="p-6 space-y-4 border border-[var(--border)] bg-[var(--secondary)]/10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-blue-500">
                    <Fingerprint size={24} />
                    <h4 className="font-bold text-sm text-[var(--foreground)]">Login Biométrico (Huella / FaceID)</h4>
                </div>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
                Agrega tu huella digital para iniciar sesión sin contraseña la próxima vez de forma instantánea.
            </p>
            <div className="pt-2">
                <Button
                    onClick={handleRegisterFingerprint}
                    disabled={isRegistering}
                    className="w-full sm:w-auto font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isRegistering ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registrando...
                        </>
                    ) : (
                        'Añadir Huella / FaceID'
                    )}
                </Button>
            </div>
        </Card>
    )
}
