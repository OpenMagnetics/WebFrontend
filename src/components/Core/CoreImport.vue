<script setup>
import { ref, onMounted } from 'vue'
import * as Defaults from '/src/assets/js/defaults.js'
import { findCoreShape, deepCopy } from '/src/assets/js/utils.js'
import { useCoreStore } from '/src/stores/core'
import download from 'downloadjs'

</script>

<script>
export default {
    data() {
        const coreStore = useCoreStore();
        const usedSlugs = []
        const importedCore = {}
        return {
            coreStore,
            posting: false,
            usedSlugs,
            importedCore,
        }
    },
    props: {
        isLoggedIn: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    methods: {
        onImport(event) {
            this.$userStore.globalCore = this.importedCore
            this.$mkf.ready.then(_ => {
                const aux = deepCopy(this.$userStore.globalCore);
                aux['geometricalDescription'] = null;
                aux['processedDescription'] = null;

                if (typeof aux['functionalDescription']['shape'] === 'string' || aux['functionalDescription']['shape'] instanceof String) {
                    aux['functionalDescription']['shape'] = findCoreShape(this.$dataCacheStore, aux['functionalDescription']['shape']);
                }

                console.log(aux['functionalDescription']['shape'])

                var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

                this.$userStore.globalCore = core;
                this.$userStore.setGlobalCore(core)
                this.$router.go();
            }).catch(error => { 
                console.error(error)
                this.tryingToSend = false;
            });

        },
        readMASFile(event) {
            const fr = new FileReader();

            fr.onload = e => {
                const data = JSON.parse(e.target.result);
                console.log("data")
                console.log(data)
                this.importedCore = data
            }
            fr.readAsText(this.$refs['masFileReader'].files.item(0));
        },
    },
    mounted() {
    },
}

</script>

<template>
    <div class="offcanvas offcanvas-start bg-light" tabindex="-1" id="CoreImportOffCanvas" aria-labelledby="CoreImportOffCanvasLabel">
    <div class="offcanvas-header">
        <h5 class="offcanvas-title text-white fs-3" id="CoreImportOffCanvasLabel">Import options</h5>
        <button data-cy="CoreImport-corner-close-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="CoreImportOffCanvasLabelClose"></button>
    </div>
    <div class="offcanvas-body">
        <input data-cy="CoreImport-MAS-file-button" type="file" ref="masFileReader" @change="readMASFile()" class="btn btn-primary mt-1 rounded-3"/>

        <button data-cy="CoreImport-import-button" class="mt-5 btn text-light bg-primary float-start fs-5 px-4" data-bs-dismiss="offcanvas" @click="onImport">Import</button>
    </div>
</div>

</template>