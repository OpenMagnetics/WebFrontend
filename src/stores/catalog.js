import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useCatalogStore = defineStore("catalog", () => {

    const catalogUrl = ref(null);
    const advises = ref([]);

    function resetCatalog() {
        this.advises = [];
    }

    return {
        catalogUrl,
        advises,
        resetCatalog,
    }
},
{
    persist: false,
}
)
