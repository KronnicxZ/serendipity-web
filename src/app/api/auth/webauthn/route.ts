import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
    getRegistrationOptions,
    verifyRegistration,
    getAuthenticationOptions,
    verifyAuthentication
} from '@/lib/auth/webauthn';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const cookieStore = await cookies();

    try {
        if (action === 'registration-options') {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const options = await getRegistrationOptions(user.id, user.email!);
            cookieStore.set('webauthn-challenge', options.challenge, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 300 // 5 minutes
            });

            return NextResponse.json(options);
        }

        if (action === 'authentication-options') {
            const options = await getAuthenticationOptions();
            cookieStore.set('webauthn-challenge', options.challenge, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 300
            });

            return NextResponse.json(options);
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('WebAuthn GET error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { action, body } = await request.json();
    const cookieStore = await cookies();
    const challenge = cookieStore.get('webauthn-challenge')?.value;

    if (!challenge) {
        return NextResponse.json({ error: 'Challenge expired or missing' }, { status: 400 });
    }

    try {
        if (action === 'verify-registration') {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }

            const verification = await verifyRegistration(user.id, body, challenge);
            return NextResponse.json(verification);
        }

        if (action === 'verify-authentication') {
            const result = await verifyAuthentication(body, challenge);

            if (result.verified && result.user) {
                // In a real app, you would sign in the user here
                // Since Supabase Auth doesn't support custom external signatures easily without a worker,
                // we'll return a success and the frontend will handle the "mock" transition or use a service role to log in.

                // RECOMMENDATION: In production, use Supabase's built-in Passkey support if possible.
                // For this demo, we prove the identity.
                return NextResponse.json({ verified: true, user: result.user });
            }

            return NextResponse.json({ verified: false }, { status: 401 });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('WebAuthn POST error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
