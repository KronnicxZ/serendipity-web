import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const rpID = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_URL?.replace(/^https?:\/\//, '') || 'localhost' : 'localhost';
const expectedOrigin = process.env.NODE_ENV === 'production' ? [process.env.NEXT_PUBLIC_URL || `https://${rpID}`] : ['http://localhost:3000', 'http://192.168.1.X:3000']; // You can add local IP for testing.

export async function POST(req: Request) {
    try {
        const body = await req.json();

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseServiceRole = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
        }

        // Get challenge
        const { data: challenges } = await supabaseServiceRole
            .from('webauthn_challenges')
            .select('challenge')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);

        if (!challenges || challenges.length === 0) {
            return NextResponse.json({ error: 'Challenge not found' }, { status: 400 });
        }

        const expectedChallenge = challenges[0].challenge;

        const verification = await verifyRegistrationResponse({
            response: body,
            expectedChallenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: rpID,
        });

        if (verification.verified && verification.registrationInfo) {
            const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

            // Delete old challenge
            await supabaseServiceRole.from('webauthn_challenges').delete().eq('user_id', user.id).eq('challenge', expectedChallenge);

            // Save new credential
            await supabaseServiceRole.from('user_passkeys').insert({
                user_id: user.id,
                credential_id: credential.id,
                public_key: Buffer.from(credential.publicKey).toString('base64'),
                counter: credential.counter,
                device_type: credentialDeviceType,
                backed_up: credentialBackedUp,
                transports: credential.transports || [],
                name: 'Dispositivo Seguro', // Could be dynamic from user-agent
            });

            return NextResponse.json({ verified: true });
        }

        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });

    } catch (error: any) {
        console.error('Error verifying registration:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
