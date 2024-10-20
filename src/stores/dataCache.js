import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useDataCacheStore = defineStore("dataCache", () => {
    const wireDataTimestamp = ref(null);
    const ttlInMilliseconds = ref(3 * 60 * 60 * 1000);  // 3 hours
    var wireData = ref({
        wireConductingDiametersPerStandard: {},
        wireCoatingsPerWireType: {},
    });


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


    return {
        isWireDataValid,
        setWireDataTimestamp,
        wireData,
        wireDataTimestamp,
    }
},
{
    persist: true,
})
