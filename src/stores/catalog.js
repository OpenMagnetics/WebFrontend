import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useCatalogStore = defineStore("catalog", () => {

    const filters = ref({
        "Turns Ratios": 100,
        "Solid Insulation Requirements": 100,
        "Magnetizing Inductance": 100,
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
