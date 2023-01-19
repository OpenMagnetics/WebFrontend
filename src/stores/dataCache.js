import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useDataCacheStore = defineStore("dataCache", () => {
    const dataTimestamp = ref(null)
    const notificationsTimestamp = ref(null)
    const notificationsTtlInMilliseconds = ref(30 * 60 * 1000)  // 30 minutes
    const dataTtlInMilliseconds = ref(3 * 60 * 60 * 1000)  // 3 hours
    const commercialCores = ref([])
    const commercialShapes = ref([])
    const commercialMaterials = ref([])
    const notifications = ref([])

    function commercialShapesLoaded() {
    }
    function commercialMaterialsLoaded() {
    }

    return {
        dataTimestamp,
        notificationsTimestamp,
        notificationsTtlInMilliseconds,
        dataTtlInMilliseconds,
        commercialCores,
        commercialShapes,
        commercialMaterials,
        commercialShapesLoaded,
        commercialMaterialsLoaded,
        notifications,
    }
},
{
    persist: true,
})
