import { defineStore } from 'pinia'
import { ref } from 'vue'

// The outdated core material the last loaded design carries (services/coreMaterialFreshness.js),
// shown above the builder until the user switches to the library's copy or keeps the file's.
// Not persisted: it describes one load, and a reload must not resurrect it over a design the user
// has edited since.
export const useCoreMaterialNoticeStore = defineStore('coreMaterialNotice', () => {
    const outdatedCoreMaterial = ref(null);

    function set(finding) {
        outdatedCoreMaterial.value = finding;
    }

    function clear() {
        outdatedCoreMaterial.value = null;
    }

    return { outdatedCoreMaterial, set, clear };
});
