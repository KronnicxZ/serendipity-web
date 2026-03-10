import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { createClient } from '@/lib/supabase/server';

const RP_NAME = 'Anthropos OS';
const RP_ID = process.env.NEXT_PUBLIC_RP_ID || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN || 'http://localhost:3000';

export async function getRegistrationOptions(userId: string, email: string) {
    const supabase = await createClient();

    // Get existing credentials to exclude
    const { data: credentials } = await supabase
        .from('user_credentials')
        .select('credential_id')
        .eq('user_id', userId);

    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: Buffer.from(userId),
        userName: email,
        attestationType: 'none',
        excludeCredentials: credentials?.map(c => ({
            id: c.credential_id,
            type: 'public-key',
        })) as any,
        authenticatorSelection: {
            residentKey: 'required',
            userVerification: 'preferred',
        },
    });

    return options;
}

export async function verifyRegistration(userId: string, body: any, currentChallenge: string) {
    const verification = await verifyRegistrationResponse({
        response: body,
        expectedChallenge: currentChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        const { id, publicKey, counter } = credential;

        const supabase = await createClient();

        // Save to DB
        const { error } = await supabase
            .from('user_credentials')
            .insert({
                user_id: userId,
                credential_id: Buffer.from(id).toString('base64'),
                public_key: Buffer.from(publicKey).toString('base64'),
                counter: counter,
            });

        if (error) throw error;
    }

    return verification;
}

export async function getAuthenticationOptions() {
    const options = await generateAuthenticationOptions({
        rpID: RP_ID,
        allowCredentials: [], // Allow any registered credential
        userVerification: 'preferred',
    });

    return options;
}

export async function verifyAuthentication(body: any, currentChallenge: string) {
    const supabase = await createClient();

    // Find credential in DB
    const credentialID = body.id;
    const { data: credential, error: findError } = await supabase
        .from('user_credentials')
        .select('*')
        .eq('credential_id', credentialID)
        .single();

    if (findError || !credential) {
        throw new Error('Credential not found');
    }

    const verification = await verifyAuthenticationResponse({
        response: body,
        expectedChallenge: currentChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
        authenticator: {
            credentialID: Buffer.from(credential.credential_id, 'base64'),
            credentialPublicKey: Buffer.from(credential.public_key, 'base64'),
            counter: credential.counter,
        },
    } as any);

    if (verification.verified) {
        // Update counter
        await supabase
            .from('user_credentials')
            .update({ counter: verification.authenticationInfo.newCounter })
            .eq('id', credential.id);

        // Return the user linked to this credential
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('id', credential.user_id)
            .single();

        return { verified: true, user };
    }

    return { verified: false };
}
