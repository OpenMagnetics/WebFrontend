import axios from 'axios'

// Dedicated client for the accounts API (auth, designs, settings). Sessions
// are cookie-based, so every call must carry credentials; the backend's CORS
// allowlist already permits credentialed requests from this origin.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_ENDPOINT,
    withCredentials: true,
})

export default api

// Message for a failed accounts call that states what actually went wrong:
// the server's own `detail` when it sent one, the HTTP status when it answered
// without one, and "no response" (with the address tried) when the request
// never got an answer — a firewall, proxy or browser extension blocking the
// API is the usual cause, and the address lets a user check it themselves.
export function describeAccountError(error, action) {
    const response = error?.response;
    if (!response) {
        const where = api.defaults.baseURL || window.location.origin;
        return `${action}: no response from the account service at ${where}. A firewall, proxy or browser extension may be blocking it.`;
    }
    const detail = response.data?.detail;
    if (typeof detail === 'string' && detail) {
        return detail;
    }
    if (Array.isArray(detail) && detail.length > 0) {
        return detail.map((item) => item?.msg ?? JSON.stringify(item)).join('; ');
    }
    return `${action}: the account service answered HTTP ${response.status}.`;
}
