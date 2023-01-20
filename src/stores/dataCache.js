import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useDataCacheStore = defineStore("dataCache", () => {
    const timestamp = ref(null)
    const ttlInMilliseconds = ref(3 * 60 * 60 * 1000)  // 3 hours
    const commercialCores = ref([])
    const commercialShapes = ref([])
    const commercialMaterials = ref([])

    function commercialShapesLoaded() {
    }
    function commercialMaterialsLoaded() {
    }

    return {
        timestamp,
        ttlInMilliseconds,
        commercialCores,
        commercialShapes,
        commercialMaterials,
        commercialShapesLoaded,
        commercialMaterialsLoaded,
    }
},
{
    persist: true,
})
