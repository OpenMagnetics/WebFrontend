import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useDataCacheStore = defineStore("dataCache", () => {
    const wireDataTimestamp = ref(null);
    const ttlInMilliseconds = ref(3 * 60 * 60 * 1000);  // 3 hours
    var wireData = ref({
        wireConductingDiametersPerStandard: {},
        wireCoatingsPerWireType: {},
    });


    const timestamp = ref(null)
    const standards = ref({})
    var masData = ref({coreMaterials: [], coreShapes: [], wireMaterials: []})

    function dataLoaded() {
    }

    function isWireDataValid() {
        if (this.wireDataTimestamp == null)
            return false;

        if (this.wireDataTimestamp + this.ttlInMilliseconds < Date.now())
            return false;

        return true;
    }

    function setWireDataTimestamp() {
        this.wireDataTimestamp = Date.now();
    }

    function reset() {
        this.timestamp = null
        this.standards = {}
    }

    return {
        isWireDataValid,
        setWireDataTimestamp,
        wireData,
        wireDataTimestamp,

        masData,
        reset,
        timestamp,
        ttlInMilliseconds,
        dataLoaded,
        standards,
    }
},
{
    persist: true,
})
