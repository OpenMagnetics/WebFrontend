import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useCatalogStore = defineStore("catalog", () => {

    const catalogUrl = ref(null);
    const catalogCoreMaterialDatabase = ref(null);
    const catalogCoreShapeDatabase = ref(null);
    const catalogWireDatabase = ref(null);
    const advises = ref([]);

    function resetCatalog() {
        this.advises = [];
    }

    function orderSample() {
        console.log("MIerda");
    }

    return {
        catalogUrl,
        catalogCoreMaterialDatabase,
        catalogCoreShapeDatabase,
        catalogWireDatabase,
        advises,
        resetCatalog,
        orderSample,
    }
},
{
    persist: false,
}
)
