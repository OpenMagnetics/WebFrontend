import axios from 'axios'

// Dedicated client for the accounts API (auth, designs, settings). Sessions
// are cookie-based, so every call must carry credentials; the backend's CORS
// allowlist already permits credentialed requests from this origin.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_ENDPOINT,
    withCredentials: true,
})

export default api
