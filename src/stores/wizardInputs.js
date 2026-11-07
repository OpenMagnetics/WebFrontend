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
    // ABT #2304: the design each wizard last handed off ("Design Magnetic" / "Review Specs"), as the
    // params key of the run it was built from, and the params key of each wizard's latest successful
    // run. When they differ, the wizard offers to update that design's operating points and
    // requirements (keeping its magnetic), and "Continue design" says the wizard has newer results.
    const handOffByWizard = ref({})
    const latestRunByWizard = ref({})
    // Wizards whose latest run is not in the design they handed off.
    function wizardsWithUnappliedRuns() {
        return Object.keys(handOffByWizard.value).filter((title) => latestRunByWizard.value[title] != null
            && latestRunByWizard.value[title] !== handOffByWizard.value[title]);
    }
    return { inputsByWizard, handOffByWizard, latestRunByWizard, wizardsWithUnappliedRuns }
}, { persist: true })
