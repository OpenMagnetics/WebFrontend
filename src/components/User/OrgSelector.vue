<script setup>
import { useOrgContextStore } from '../../stores/orgContext'
</script>

<script>
// Space selector for the account pages: Personal or one of the user's
// organizations. Emits 'changed' after the selection switches so pages
// can re-fetch their org-scoped data.
export default {
    emits: ['changed'],
    data() {
        return { orgContextStore: useOrgContextStore() };
    },
    async mounted() {
        try {
            await this.orgContextStore.fetchOrgs();
        } catch (error) {
            console.error('Could not load organizations:', error);
        }
    },
    methods: {
        onChange(event) {
            this.orgContextStore.select(event.target.value === '' ? null : event.target.value);
            this.$emit('changed');
        },
    },
}
</script>

<template>
    <select
        v-if="orgContextStore.orgs.length > 0"
        data-cy="OrgSelector"
        class="form-select bg-secondary text-white border-secondary"
        style="max-width: 16rem"
        :value="orgContextStore.selectedOrgId || ''"
        @change="onChange">
        <option value="">Personal</option>
        <option v-for="org in orgContextStore.orgs" :key="org.id" :value="org.id">
            {{ org.name }} ({{ org.my_role }})
        </option>
    </select>
</template>
