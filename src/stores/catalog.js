import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useCatalogStore = defineStore("catalog", () => {

    const filters = ref({
        "Turns Ratios": 100,
        "Solid Insulation Requirements": 80,
        "Magnetizing Inductance": 40,
        // IMPEDANCE: strict filter for CMCs. Reads
        // inputs.designRequirements.minimumImpedance [{frequency,impedance:{magnitude}}]
        // and, for each catalog magnetic's existing coil/turn count, verifies the
        // impedance meets the requirement at every specified frequency.
        // (CORE_MINIMUM_IMPEDANCE iterates turn count to find a suitable core, which
        // isn't what we want when scoring pre-built catalog parts.)
        "Impedance": 100,
        "Dc Current Density": 10,
        "Effective Current Density": 10,
        "Volume": 10,
        "Area": 10,
        "Height": 10,
        "Losses No Proximity": 10,
    });
    const advises = ref([]);


    return {
        filters,
        advises,
    }
},
{
    persist: true,
}
)
