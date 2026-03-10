import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import { useState, useEffect } from 'react';
import { useNotifications } from '@/context/notification-context';
import { useTranslation } from '@/context/language-context';

export function useBiometrics() {
    const { addNotification } = useNotifications();
    const { t } = useTranslation();
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if WebAuthn is supported
        if (window.PublicKeyCredential) {
            setIsSupported(true);
        }
    }, []);

    const enroll = async () => {
        try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            if (!supabase) throw new Error('Supabase client missing');

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session to enroll biometric');

            // 1. Get options from server
            const resp = await fetch('/api/auth/webauthn/generate-registration-options', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const options = await resp.json();

            if (options.error) throw new Error(options.error);

            // 2. Trigger browser biometrics
            const attestation = await startRegistration(options);

            // 3. Verify with server
            const verifyResp = await fetch('/api/auth/webauthn/verify-registration-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(attestation),
            });

            const result = await verifyResp.json();

            if (result.verified) {
                addNotification({
                    type: 'SUCCESS',
                    title: t('auth.biometricSuccessTitle') || 'Registro Exitoso',
                    message: t('auth.biometricSuccessMessage') || 'Huella registrada.'
                });
                return true;
            } else {
                throw new Error('Verification failed');
            }
        } catch (error: any) {
            console.error(error);
            addNotification({
                type: 'ERROR',
                title: t('auth.biometricErrorTitle') || 'Error Biométrico',
                message: error.message || t('auth.biometricErrorMessage') || 'Error al registrar huella'
            });
            return false;
        }
    };

    const authenticate = async () => {
        try {
            // 1. Get options from server
            const resp = await fetch('/api/auth/webauthn/generate-authentication-options', {
                method: 'POST'
            });
            const options = await resp.json();

            if (options.error) throw new Error(options.error);

            // 2. Trigger browser biometrics
            const assertion = await startAuthentication(options);

            // 3. Verify with server
            const verifyResp = await fetch('/api/auth/webauthn/verify-authentication-response', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(assertion),
            });

            const result = await verifyResp.json();

            if (result.verified) {
                return result.sessionRequest;
            } else {
                throw new Error(result.error || 'Verification failed');
            }
        } catch (error: any) {
            console.error(error);
            addNotification({
                type: 'ERROR',
                title: t('auth.biometricErrorTitle') || 'Error Biométrico',
                message: error.message || t('auth.biometricErrorMessage') || 'Error al autenticar con huella'
            });
            return null;
        }
    };

    return { isSupported, enroll, authenticate };
}
