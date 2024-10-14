import { json } from '@sveltejs/kit';
import { createHash } from 'crypto';
import { randomBytes } from 'crypto';

const clientId = import.meta.env.VITE_CLIENT_ID;
const clientSecret = import.meta.env.VITE_CLIENT_SECRET;
const authorizationEndpoint = import.meta.env.VITE_AUTHORIZATION_ENDPOINT;
const tokenEndpoint = import.meta.env.VITE_TOKEN_ENDPOINT;

function base64UrlEncode(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateState() {
    return randomBytes(16).toString('hex');
}

function sha256(plain) {
    return createHash('sha256').update(plain).digest();
}

export async function POST({ request, fetch, cookies }) {
    const body = await request.json();

    if (body.action === 'initiate') {
        // Handle authorization initiation
        const { codeVerifier, redirectUri } = body;
        const state = generateState(); // Function to generate random state

        // Store the state in a secure, HTTP-only cookie
        cookies.set('oauth_state', state, {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/',
            maxAge: 600 // 10 minutes
        });

        const codeChallenge = base64UrlEncode(sha256(codeVerifier));

        const authorizationUrl = `${authorizationEndpoint}?` +
            `response_type=code&` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${encodeURIComponent(state)}&` +
            `code_challenge=${encodeURIComponent(codeChallenge)}&` +
            `code_challenge_method=S256&` +
            `scope=${encodeURIComponent('k:app_record:read')}`;

        return json({ authorizationUrl, state });
    } else if (body.action === 'token') {
        // Handle token exchange
        const { code, redirectUri, codeVerifier, state } = body;
        const storedState = cookies.get('oauth_state');

        if (state !== storedState) {
            return json({ error: 'Invalid state parameter' }, { status: 400 });
        }

        // Clear the state cookie
        cookies.delete('oauth_state', { path: '/' });

        try {
            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    client_secret: clientSecret,
                    code_verifier: codeVerifier,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Token exchange failed: ${errorText}`);
            }

            const data = await response.json();

            // Set the access token in a secure HTTP-only cookie
            cookies.set('access_token', data.access_token, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
                path: '/',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });

            return json({ success: true });
        } catch (error) {
            console.error('Token exchange error:', error);
            return json({ error: error.message }, { status: 500 });
        }
    } else {
        return json({ error: 'Invalid action' }, { status: 400 });
    }
}

// GET handler to check authentication status
export async function GET({ cookies }) {
    const accessToken = cookies.get('access_token');
    return json({ isAuthenticated: !!accessToken });
}

export async function DELETE({ cookies }) {
    // Clear the cookie
    cookies.delete('access_token', {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
    });
    return json({ success: true, message: 'Logout successful' });
}