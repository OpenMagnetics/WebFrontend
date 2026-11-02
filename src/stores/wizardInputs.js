import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * The inputs each converter wizard was left with, keyed by the wizard's title
 * ("Flyback Wizard", "Two-Switch Forward Wizard", …), so that a wizard reopens
 * with what the user typed instead of its defaults (ABT #2209: users go back
 * and forth between a wizard and the Magnetic Builder).
 *
 * ConverterWizardBase restores and saves these; the wizards themselves do not
 * touch this store. Holds no design data: the design lives in the `mas` store,
 * written only by "Design Magnetic" / "Review Specs".
 */
export const useWizardInputsStore = defineStore('wizardInputs', () => {
    const inputsByWizard = ref({})
    return { inputsByWizard }
}, { persist: true })
