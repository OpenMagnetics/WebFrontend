import { defineStore } from 'pinia'
import api from '../services/accountApi'

// Which space the account pages act on: personal (null) or one of the user's
// organizations. Persisted so the choice survives reloads; the orgs list
// itself is server-sourced.
export const useOrgContextStore = defineStore("orgContext", {
    state: () => {
        return {
            selectedOrgId: null,    // null = personal space
            orgs: [],               // [{id, slug, name, my_role}]
            fetched: false,
        };
    },
    getters: {
        selectedOrg: (state) => state.orgs.find((o) => o.id === state.selectedOrgId) || null,
        // Query-string suffix for org-aware endpoints ('' in the personal space).
        orgQuery: (state) => state.selectedOrgId ? `?org=${state.selectedOrgId}` : '',
        myRole() { return this.selectedOrg?.my_role || null; },
        canWrite() { return this.selectedOrgId == null || (this.myRole && this.myRole !== 'viewer'); },
        isLibrarian() {
            return this.selectedOrgId == null
                || ['librarian', 'admin', 'owner'].includes(this.myRole);
        },
    },
    actions: {
        async fetchOrgs() {
            const { data } = await api.get('/orgs');
            this.orgs = data.orgs;
            this.fetched = true;
            if (this.selectedOrgId != null && this.selectedOrg == null) {
                this.selectedOrgId = null;   // stale selection (left/deleted org)
            }
            return this.orgs;
        },
        select(orgId) {
            this.selectedOrgId = orgId;
        },
    },
    persist: {
        pick: ['selectedOrgId'],
    },
})
