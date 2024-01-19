import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useDataCacheStore = defineStore("dataCache", () => {
    const timestamp = ref(null)
    const ttlInMilliseconds = ref(3 * 60 * 60 * 1000)  // 3 hours
    const standards = ref({})
    var masData = ref({coreMaterials: [], coreShapes: [], wireMaterials: []})

    function dataLoaded() {
    }

    function reset() {
        this.timestamp = null
        this.standards = {}
    }

    return {
        reset,
        timestamp,
        ttlInMilliseconds,
        dataLoaded,
        standards,
        masData,
    }
},
{
    persist: true,
})
