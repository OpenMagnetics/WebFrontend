import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useInventoryCacheStore = defineStore("inventoryCache", () => {
    var coreInventory = ref([])
    function reset() {
        this.coreInventory = []
    }

    return {
        reset,
        coreInventory,
    }
},
{
    persist: false,
})
