/** @type {import('./$types').PageLoad} */
export async function load({ fetch }) {
    const response = await fetch('/api/auth');
    const data = await response.json();
    
    return {
        isAuthenticated: data.isAuthenticated
    };
}