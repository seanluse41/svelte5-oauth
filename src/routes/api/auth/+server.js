import { json } from '@sveltejs/kit';
import { createHash, randomBytes } from 'crypto';

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

function generateCodeVerifier() {
    return base64UrlEncode(randomBytes(32));
}

function generateState() {
    return randomBytes(16).toString('hex');
}

function sha256(plain) {
    return createHash('sha256').update(plain).digest();
}

export async function POST({ request, cookies }) {
    const body = await request.json();

    if (body.code) {
        // Handle token exchange
        const { code, redirectUri, state } = body;
        const codeVerifier = cookies.get('code_verifier');
        const storedState = cookies.get('oauth_state');

        if (state !== storedState) {
            return json({ error: 'Invalid state parameter' }, { status: 400 });
        }

        cookies.delete('oauth_state', { path: '/' });
        cookies.delete('code_verifier', { path: '/' });

        try {
            const response = await fetch(tokenEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        // Handle authorization initiation
        const { redirectUri } = body;
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = base64UrlEncode(sha256(codeVerifier));
        const state = generateState();

        cookies.set('code_verifier', codeVerifier, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });
        cookies.set('oauth_state', state, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 });

        const authorizationUrl = `${authorizationEndpoint}?` +
            `response_type=code&` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `state=${encodeURIComponent(state)}&` +
            `code_challenge=${encodeURIComponent(codeChallenge)}&` +
            `code_challenge_method=S256&` +
            `scope=${encodeURIComponent('k:app_record:read')}`;

        return json({ authorizationUrl });
    }
}

export function GET({ cookies }) {
    return json({ isAuthenticated: !!cookies.get('access_token') });
}

export function DELETE({ cookies }) {
    cookies.delete('access_token', { path: '/' });
    return json({ success: true });
}