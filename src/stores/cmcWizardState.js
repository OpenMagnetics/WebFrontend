import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Persists the CMC wizard localData across navigation so that when the user
 * returns to the wizard page the form fields are restored to their last values.
 */
export const useCmcWizardStateStore = defineStore('cmcWizardState', () => {
    const formData = ref(null)
    return { formData }
}, { persist: true })
