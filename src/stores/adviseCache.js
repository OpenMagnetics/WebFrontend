import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as MAS from '/src/assets/ts/MAS.ts'
import * as Defaults from '/src/assets/js/defaults.js'

export const useAdviseCacheStore = defineStore("adviseCache", () => {

    const advises = ref(null);
    const advisesCache = ref({});
    const advisesTimestamp = ref(null)
    const advisesTtlInMilliseconds = 24 * 60 * 60 * 1000 // 24 hours

    function areAdvisesValid() {
        if (this.advisesTimestamp == null || (this.advisesTimestamp + this.advisesTtlInMilliseconds < Date.now())) {
            Object.keys(this.advisesCache).forEach(function(k) { delete this.advisesCache[k]})
            return false;
        }
        else {
            return true;
        }
    }


    function resetCache() {
        this.advisesCache = {};
        this.advises = null;
        this.advisesTimestamp = null;
        console.log("Resetting cache!!!!!!!!!!!!!")
    }

    return {
        resetCache,
        advises,
        advisesCache,
        advisesTimestamp,
        areAdvisesValid,
    }
},
{
    persist: true,
}
)
