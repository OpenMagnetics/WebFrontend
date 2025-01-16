import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/WebSharedComponents/assets/ts/MAS.ts'
import * as Defaults from '/WebSharedComponents/assets/js/defaults.js'

export const useAdviseCacheStore = defineStore("adviseCache", () => {

    const currentMasAdvises = ref(null);
    const currentCoreAdvises = ref(null);

    function cleanMasAdvises() {
        this.currentMasAdvises = null;
    }
    function noMasAdvises() {
        return this.currentMasAdvises == null;
    }
    function cleanCoreAdvises() {
        this.currentCoreAdvises = null;
    }
    function noCoreAdvises() {
        return this.currentCoreAdvises == null;
    }

    return {
        cleanMasAdvises,
        currentMasAdvises,
        noMasAdvises,
        cleanCoreAdvises,
        currentCoreAdvises,
        noCoreAdvises,
    }
},
{
    persist: true,
}
)
