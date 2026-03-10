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
            // 1. Get options from server
            const resp = await fetch('/api/auth/webauthn?action=registration-options');
            const options = await resp.json();

            if (options.error) throw new Error(options.error);

            // 2. Trigger browser biometrics
            const attestation = await startRegistration(options);

            // 3. Verify with server
            const verifyResp = await fetch('/api/auth/webauthn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify-registration', body: attestation }),
            });

            const result = await verifyResp.json();

            if (result.verified) {
                addNotification({
                    type: 'SUCCESS',
                    title: t('auth.biometricSuccessTitle') || 'Enrolamiento Exitoso',
                    message: t('auth.biometricSuccessMessage') || 'Ahora puedes usar tu huella para entrar.'
                });
                return true;
            } else {
                throw new Error('Verification failed');
            }
        } catch (error: any) {
            console.error(error);
            addNotification({
                type: 'ERROR',
                title: t('auth.biometricErrorTitle'),
                message: error.message || t('auth.biometricErrorMessage')
            });
            return false;
        }
    };

    const authenticate = async () => {
        try {
            // 1. Get options from server
            const resp = await fetch('/api/auth/webauthn?action=authentication-options');
            const options = await resp.json();

            if (options.error) throw new Error(options.error);

            // 2. Trigger browser biometrics
            const assertion = await startAuthentication(options);

            // 3. Verify with server
            const verifyResp = await fetch('/api/auth/webauthn', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify-authentication', body: assertion }),
            });

            const result = await verifyResp.json();

            if (result.verified) {
                return result.user; // Return user to log in
            } else {
                throw new Error('Verification failed');
            }
        } catch (error: any) {
            console.error(error);
            addNotification({
                type: 'ERROR',
                title: t('auth.biometricErrorTitle'),
                message: error.message || t('auth.biometricErrorMessage')
            });
            return null;
        }
    };

    return { isSupported, enroll, authenticate };
}
