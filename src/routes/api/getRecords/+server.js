import { json } from '@sveltejs/kit';

const subdomain = import.meta.env.VITE_KINTONE_SUBDOMAIN;
const appId = import.meta.env.VITE_KINTONE_APPID;

export async function GET({ cookies }) {
    const accessToken = cookies.get('access_token');

    if (!accessToken) {
        return json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const response = await fetch(
            `https://${subdomain}/k/v1/records.json?app=${appId}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch records from Kintone');
        }
        const data = await response.json();
        return json(data);
    } catch (error) {
        console.error('Error fetching Kintone records:', error);
        return json({ error: error.message }, { status: 500 });
    }
}