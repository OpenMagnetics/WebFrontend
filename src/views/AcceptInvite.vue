<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { useAuthStore } from '../stores/auth'
import { useOrgContextStore } from '../stores/orgContext'
import api from '../services/accountApi'
</script>

<script>
// Landing page for the emailed organization invitation (?id=<membership>).
export default {
    data() {
        return {
            authStore: useAuthStore(),
            orgContextStore: useOrgContextStore(),
            invitation: null,
            accepted: false,
            busy: false,
            error: "",
        }
    },
    async mounted() {
        await this.authStore.fetchMe();
        try {
            const { data } = await api.get(`/orgs/invitations/${this.$route.query.id}`);
            this.invitation = data;
        } catch (error) {
            this.error = "This invitation does not exist, was already used, or was revoked.";
        }
    },
    methods: {
        async accept() {
            this.busy = true;
            this.error = "";
            try {
                await api.post(`/orgs/invitations/${this.$route.query.id}/accept`);
                this.accepted = true;
                await this.orgContextStore.fetchOrgs();
            } catch (error) {
                this.error = (typeof error.response?.data?.detail === 'string' && error.response.data.detail) || "Could not accept the invitation";
            } finally {
                this.busy = false;
            }
        },
    }
}
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <Header />
    <div class="container text-white mt-5 flex-grow-1" style="max-width: 520px">
        <h3 data-cy="AcceptInvite-title"><i class="pi pi-building mr-2"></i>Organization invitation</h3>
        <div v-if="error" data-cy="AcceptInvite-error" class="alert alert-warning mt-3">{{ error }}</div>
        <template v-else-if="invitation">
            <p class="mt-3">You are invited to join <strong>{{ invitation.org_name }}</strong>
                as <span class="badge bg-secondary">{{ invitation.role }}</span>
                (sent to {{ invitation.invited_email }}).</p>
            <div v-if="accepted" data-cy="AcceptInvite-done" class="alert alert-success">
                Welcome aboard! Find the organization under
                <router-link to="/orgs">Organizations</router-link> and switch to it from
                My Designs / My Inventory.
            </div>
            <button v-else-if="authStore.isLoggedIn" data-cy="AcceptInvite-accept-button"
                    :disabled="busy" class="p-button p-button-primary" @click="accept">
                <i v-if="busy" class="pi pi-refresh fa-spin mr-2"></i>Accept invitation
            </button>
            <div v-else class="alert alert-info">
                Sign in (or create a free account) from the header first, then reload this page.
            </div>
        </template>
        <div v-else class="text-secondary mt-3">Loading…</div>
    </div>
    <Footer />
  </div>
</template>
