<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { useAuthStore } from '../stores/auth'
import { useOrgContextStore } from '../stores/orgContext'
import api from '../services/accountApi'
</script>

<script>
const ROLES = ['viewer', 'member', 'librarian', 'admin', 'owner'];

export default {
    data() {
        return {
            authStore: useAuthStore(),
            orgContextStore: useOrgContextStore(),
            ROLES,
            members: {},          // orgId -> [{id, role, display_name, email, pending}]
            expanded: null,
            newName: "",
            newSlug: "",
            inviteEmail: "",
            inviteRole: "member",
            loading: true,
            error: "",
            info: "",
        }
    },
    async mounted() {
        if (!this.authStore.checked) {
            await this.authStore.fetchMe();
        }
        if (this.authStore.isLoggedIn) {
            await this.orgContextStore.fetchOrgs().catch((e) => { this.error = String(e.message); });
        }
        this.loading = false;
    },
    methods: {
        can(org, minimum) {
            return this.ROLES.indexOf(org.my_role) >= this.ROLES.indexOf(minimum);
        },
        async createOrg() {
            this.error = "";
            try {
                await api.post('/orgs', { name: this.newName.trim(), slug: this.newSlug.trim() });
                this.newName = ""; this.newSlug = "";
                await this.orgContextStore.fetchOrgs();
            } catch (error) {
                this.error = (typeof error.response?.data?.detail === 'string' && error.response.data.detail) || "Could not create the organization";
            }
        },
        async toggle(org) {
            this.expanded = this.expanded === org.id ? null : org.id;
            if (this.expanded != null) {
                await this.loadMembers(org.id);
            }
        },
        async loadMembers(orgId) {
            try {
                const { data } = await api.get(`/orgs/${orgId}/members`);
                this.members = { ...this.members, [orgId]: data.members };
            } catch (error) {
                this.error = "Could not load members: " + (error.response?.data?.detail || error.message);
            }
        },
        async invite(org) {
            this.error = ""; this.info = "";
            try {
                await api.post(`/orgs/${org.id}/invitations`, { email: this.inviteEmail.trim(), role: this.inviteRole });
                this.info = `Invitation sent to ${this.inviteEmail.trim()}.`;
                this.inviteEmail = "";
                await this.loadMembers(org.id);
            } catch (error) {
                this.error = (typeof error.response?.data?.detail === 'string' && error.response.data.detail) || "Could not invite";
            }
        },
        async changeRole(org, member, event) {
            try {
                await api.patch(`/orgs/${org.id}/members/${member.id}`, { role: event.target.value });
                await this.loadMembers(org.id);
            } catch (error) {
                this.error = (typeof error.response?.data?.detail === 'string' && error.response.data.detail) || "Could not change the role";
                await this.loadMembers(org.id);
            }
        },
        async removeMember(org, member) {
            const isSelf = member.email === this.authStore.user.email;
            if (!window.confirm(isSelf ? `Leave "${org.name}"?` : `Remove ${member.email} from "${org.name}"? Organization designs and inventory stay with the organization.`)) {
                return;
            }
            try {
                await api.delete(`/orgs/${org.id}/members/${member.id}`);
                if (isSelf) {
                    await this.orgContextStore.fetchOrgs();
                    this.expanded = null;
                } else {
                    await this.loadMembers(org.id);
                }
            } catch (error) {
                this.error = (typeof error.response?.data?.detail === 'string' && error.response.data.detail) || "Could not remove the member";
            }
        },
        async deleteOrg(org) {
            if (!window.confirm(`Delete "${org.name}" for everyone? Its designs and inventory become inaccessible.`)) {
                return;
            }
            try {
                await api.delete(`/orgs/${org.id}`);
                await this.orgContextStore.fetchOrgs();
            } catch (error) {
                this.error = (typeof error.response?.data?.detail === 'string' && error.response.data.detail) || "Could not delete the organization";
            }
        },
    }
}
</script>

<template>
  <div class="d-flex flex-column min-vh-100">
    <Header />
    <div class="container text-white mt-4 flex-grow-1" style="max-width: 860px; min-height: 60vh">
        <h2 data-cy="Organizations-title" class="mb-4"><i class="pi pi-building mr-2"></i>Organizations</h2>

        <div v-if="loading" class="text-secondary">Loading…</div>
        <div v-else-if="!authStore.isLoggedIn" data-cy="Organizations-signed-out" class="alert alert-info">
            Sign in from the header to create a company space: shared designs, a shared parts
            inventory with an approval workflow, and teammates with roles.
        </div>

        <template v-else>
            <div class="card bg-dark border-secondary p-3 mb-4">
                <h5 class="mb-2">Create an organization</h5>
                <div class="d-flex gap-2 flex-wrap">
                    <input v-model="newName" data-cy="Organizations-new-name" placeholder="Company name"
                           class="form-control bg-secondary text-white border-secondary" style="max-width: 18rem" />
                    <input v-model="newSlug" data-cy="Organizations-new-slug" placeholder="slug (a-z, 0-9, dashes)"
                           class="form-control bg-secondary text-white border-secondary" style="max-width: 16rem" />
                    <button :disabled="newName.trim() === '' || newSlug.trim() === ''"
                            data-cy="Organizations-create-button" class="p-button p-button-primary" @click="createOrg">Create</button>
                </div>
                <small class="text-secondary mt-1">You become the owner. Designs and inventory created in the
                    organization belong to it — they stay when people leave.</small>
            </div>

            <div v-if="error" data-cy="Organizations-error" class="alert alert-warning py-2">{{ error }}</div>
            <div v-if="info" data-cy="Organizations-info" class="alert alert-info py-2">{{ info }}</div>

            <div v-if="orgContextStore.orgs.length === 0" class="text-secondary">You are not in any organization yet.</div>

            <div v-for="org in orgContextStore.orgs" :key="org.id" class="card bg-dark border-secondary p-3 mb-3">
                <div class="d-flex align-items-center gap-2">
                    <h5 class="mb-0">{{ org.name }} <span class="badge bg-secondary">{{ org.my_role }}</span></h5>
                    <button class="p-button p-button-outlined p-button-sm ms-auto" :data-cy="`Organizations-toggle-${org.slug}`" @click="toggle(org)">
                        {{ expanded === org.id ? 'Hide members' : 'Members' }}
                    </button>
                    <button v-if="org.my_role === 'owner'" class="p-button p-button-outlined p-button-danger p-button-sm"
                            @click="deleteOrg(org)" title="Delete organization"><i class="pi pi-trash"></i></button>
                </div>

                <div v-if="expanded === org.id" class="mt-3">
                    <div v-if="can(org, 'admin')" class="d-flex gap-2 flex-wrap mb-3">
                        <input v-model="inviteEmail" data-cy="Organizations-invite-email" placeholder="colleague@company.com"
                               class="form-control bg-secondary text-white border-secondary" style="max-width: 18rem" />
                        <select v-model="inviteRole" class="form-select bg-secondary text-white border-secondary" style="max-width: 9rem">
                            <option v-for="role in ROLES.slice(0, 4)" :key="role" :value="role">{{ role }}</option>
                        </select>
                        <button :disabled="inviteEmail.trim() === ''" data-cy="Organizations-invite-button"
                                class="p-button p-button-primary" @click="invite(org)">Invite</button>
                    </div>
                    <table class="table table-dark table-sm align-middle" :data-cy="`Organizations-members-${org.slug}`">
                        <tbody>
                            <tr v-for="member in members[org.id] || []" :key="member.id">
                                <td>{{ member.display_name || member.email }}
                                    <span v-if="member.pending" class="badge bg-warning text-dark ms-1">invited</span></td>
                                <td class="text-secondary">{{ member.email }}</td>
                                <td style="width: 9rem">
                                    <select v-if="can(org, 'admin') && !member.pending"
                                            class="form-select form-select-sm bg-secondary text-white border-secondary"
                                            :value="member.role" @change="changeRole(org, member, $event)">
                                        <option v-for="role in ROLES" :key="role" :value="role">{{ role }}</option>
                                    </select>
                                    <span v-else class="badge bg-secondary">{{ member.role }}</span>
                                </td>
                                <td class="text-end">
                                    <button v-if="can(org, 'admin') || member.email === authStore.user.email"
                                            class="p-button p-button-outlined p-button-danger p-button-sm"
                                            @click="removeMember(org, member)"
                                            :title="member.email === authStore.user.email ? 'Leave' : 'Remove'">
                                        <i class="pi" :class="member.email === authStore.user.email ? 'pi-sign-out' : 'pi-times'"></i>
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </template>
    </div>
    <Footer />
  </div>
</template>
