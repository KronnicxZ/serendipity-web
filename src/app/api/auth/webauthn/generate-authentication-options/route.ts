import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

const rpID = process.env.NODE_ENV === 'production' ? process.env.NEXT_PUBLIC_URL?.replace(/^https?:\/\//, '') || 'localhost' : 'localhost';

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));

        // We can pass user email to restrict matching to their credentials
        let allowCredentials = [];

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceRole = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        let userId = null;

        if (body.email) {
            // Find user from auth schema?? 
            // supabaseServiceRole doesn't provide an easy way to query auth.users by email directly, 
            // except admin.listUsers or fetching an RPC. But we are storing passes by user_id. 
            // Better to allow ANY credential and then find the corresponding user!
        }

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: [],
            userVerification: 'preferred',
        });

        // We need to store this challenge to a "global" challenge table OR a cookie.
        // It's much simpler to use an HttpOnly cookie to store the challenge (a nonce) temporarily.
        // Wait! We can't insert into webauthn_challenges without user_id unless we alter it.
        // Let's use a server-side HttpOnly cookie for the challenge instead! This is the standard way.

        const response = NextResponse.json(options);
        response.cookies.set('webauthn_challenge', options.challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 300 // 5 minutes
        });

        return response;

    } catch (error: any) {
        console.error('Error generating auth options:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
