import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useDataCacheStore = defineStore("dataCache", () => {
    const timestamp = ref(null)
    const ttlInMilliseconds = ref(3 * 60 * 60 * 1000)  // 3 hours
    const commercialCores = ref([])
    const commercialShapes = ref([])
    const commercialMaterials = ref([])
    const standards = ref({})
    var masData = ref({coreMaterials: [], coreShapes: [], wireMaterials: []})

    function commercialShapesLoaded() {
    }
    function commercialMaterialsLoaded() {
    }

    function reset() {
        this.timestamp = null
        this.commercialCores = []
        this.commercialShapes = []
        this.commercialMaterials = []
        this.standards = {}
    }

    return {
        reset,
        timestamp,
        ttlInMilliseconds,
        commercialCores,
        commercialShapes,
        commercialMaterials,
        commercialShapesLoaded,
        commercialMaterialsLoaded,
        standards,
        masData,
    }
},
{
    persist: true,
})
