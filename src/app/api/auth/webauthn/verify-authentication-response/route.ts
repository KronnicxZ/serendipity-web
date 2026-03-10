import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const rpID = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_URL?.replace(/^https?:\/\//, '') || 'localhost' : 'localhost';
const expectedOrigin = process.env.NODE_ENV === 'production' ? [process.env.NEXT_PUBLIC_URL || `https://${rpID}`] : ['http://localhost:3000', 'http://192.168.1.X:3000'];

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Retrieve challenge from cookie
        const challengeCookie = req.headers.get('cookie')?.split('; ').find(row => row.startsWith('webauthn_challenge='))?.split('=')[1];
        if (!challengeCookie) {
            return NextResponse.json({ error: 'No active challenge found' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabaseServiceRole = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        const credentialID = body.id;

        // Lookup credential
        const { data: passkey } = await supabaseServiceRole
            .from('user_passkeys')
            .select('*')
            .eq('credential_id', credentialID)
            .single();

        if (!passkey) {
            return NextResponse.json({ error: 'Passkey not found in system' }, { status: 401 });
        }

        const verification = await verifyAuthenticationResponse({
            response: body,
            expectedChallenge: challengeCookie,
            expectedOrigin: expectedOrigin,
            expectedRPID: rpID,
            credential: {
                id: passkey.credential_id, // v13 accepts base64url string natively!
                publicKey: Buffer.from(passkey.public_key, 'base64'),
                counter: passkey.counter,
                transports: passkey.transports,
            },
        });

        if (verification.verified) {
            const { authenticationInfo } = verification;

            // Update counter
            await supabaseServiceRole
                .from('user_passkeys')
                .update({
                    counter: authenticationInfo.newCounter,
                    last_used_at: new Date().toISOString()
                })
                .eq('id', passkey.id);

            // Fetch user info to get email
            const { data: adminUser, error: adminUserErr } = await supabaseServiceRole.auth.admin.getUserById(passkey.user_id);
            if (adminUserErr || !adminUser.user) {
                return NextResponse.json({ error: 'User mapping failed' }, { status: 500 });
            }

            // Generate an OTP Magic Link stealthily
            const { data: linkData, error: linkErr } = await supabaseServiceRole.auth.admin.generateLink({
                type: 'magiclink',
                email: adminUser.user.email!,
            });

            if (linkErr || !linkData?.properties) {
                return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 });
            }

            // Acknowledge login
            return NextResponse.json({
                verified: true,
                sessionRequest: {
                    email: adminUser.user.email,
                    otp: linkData.properties.email_otp, // Expose OTP ONLY briefly to the client to mint a session!
                }
            });
        }

        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });

    } catch (error: any) {
        console.error('Error verifying auth:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
