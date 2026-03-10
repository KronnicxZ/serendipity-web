import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const rpName = 'Serendipity OS';
const rpID = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_URL?.replace(/^https?:\/\//, '') || 'localhost' : 'localhost';
const origin = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_URL || 'https://' + rpID : 'http://localhost:3000';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'No authorization header' }, { status: 401 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);

        if (userError || !user) {
            return NextResponse.json({ error: 'Invalid user token' }, { status: 401 });
        }

        // Get user's existing passkeys to prevent re-registering
        const { data: existingPasskeys } = await supabase
            .from('user_passkeys')
            .select('credential_id')
            .eq('user_id', user.id);

        const options = await generateRegistrationOptions({
            rpName,
            rpID,
            userID: new Uint8Array(Buffer.from(user.id)),
            userName: user.email || 'user',
            userDisplayName: user.email || 'user',
            attestationType: 'none',
            excludeCredentials: existingPasskeys?.map((passkey: any) => ({
                id: passkey.credential_id,
                type: 'public-key',
                transports: ['internal'],
            })) || [],
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'preferred',
                authenticatorAttachment: 'platform',
            },
        });

        // Save challenge to db
        const supabaseServiceRole = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        await supabaseServiceRole.from('webauthn_challenges').insert({
            user_id: user.id,
            challenge: options.challenge,
        });

        return NextResponse.json(options);

    } catch (error: any) {
        console.error('Error generating registration options:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
