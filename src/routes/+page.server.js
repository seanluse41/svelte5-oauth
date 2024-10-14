/** @type {import('./$types').PageServerLoad} */
export function load({ cookies }) {
    const accessToken = cookies.get('access_token');
    return {
        isAuthenticated: !!accessToken
    };
}