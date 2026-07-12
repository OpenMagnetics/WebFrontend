import { defineStore } from 'pinia'
import api from '../services/accountApi'

// Session state for the OPTIONAL user account. The HttpOnly cookie is the
// source of truth; this store mirrors /auth/me. Deliberately not persisted:
// each session asks the backend again. The app works fully anonymously when
// `user` is null — no feature that works logged-out may depend on this store.
//
// The cookie is HttpOnly (invisible to JS), so a localStorage hint flag marks
// "this browser has logged in". Without the hint, fetchMe() resolves to
// anonymous WITHOUT any network call — anonymous visitors never touch the
// accounts API (no wasted requests, no console noise when no backend runs).
const SESSION_HINT_KEY = 'om_has_session';

export const useAuthStore = defineStore("auth", {
    state: () => {
        return {
            user: null,       // {id, email, display_name, email_verified, created_at}
            checked: false,   // /auth/me has answered at least once this session
        };
    },
    getters: {
        isLoggedIn: (state) => state.user != null,
    },
    actions: {
        async fetchMe() {
            if (localStorage.getItem(SESSION_HINT_KEY) !== '1') {
                this.user = null;
                this.checked = true;
                return;
            }
            try {
                const { data } = await api.get('/auth/me');
                this.user = data;
            } catch (error) {
                if (error.response != null && error.response.status === 401) {
                    localStorage.removeItem(SESSION_HINT_KEY);
                } else {
                    console.error('Account service unreachable:', error.message);
                }
                this.user = null;
            } finally {
                this.checked = true;
            }
        },
        async checkEmail(email) {
            const { data } = await api.post('/auth/check_email', { email });
            return data.exists;
        },
        async register(email, password) {
            const { data } = await api.post('/auth/register', { email, password });
            this.user = data;
            localStorage.setItem(SESSION_HINT_KEY, '1');
            return data;
        },
        async login(email, password) {
            const { data } = await api.post('/auth/login', { email, password });
            this.user = data;
            localStorage.setItem(SESSION_HINT_KEY, '1');
            return data;
        },
        async logout() {
            await api.post('/auth/logout');
            this.clearSession();
        },
        // Local sign-out (also used after account deletion): forget the
        // session without calling the backend.
        clearSession() {
            this.user = null;
            localStorage.removeItem(SESSION_HINT_KEY);
        },
    },
})
