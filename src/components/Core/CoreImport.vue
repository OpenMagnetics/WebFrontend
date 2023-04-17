<script setup>
import { ref, onMounted } from 'vue'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import { useCoreStore } from '/src/stores/core'
import * as download from 'downloadjs'

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
            console.log("this.$userStore.globalCore")
            console.log(this.$userStore.globalCore)
            Utils.getCoreParameters(this.$userStore, () => {this.$router.go();}, () => {})

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
        <button data-test="CoreImport-corner-close-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="CoreImportOffCanvasLabelClose"></button>
    </div>
    <div class="offcanvas-body">
        <input data-test="CoreImport-MAS-file-button" type="file" ref="masFileReader" @change="readMASFile()" class="btn btn-primary mt-1 rounded-3"/>

        <button data-test="CoreImport-import-button" class="mt-5 btn text-light bg-primary float-start fs-5 px-4" data-bs-dismiss="offcanvas" @click="onImport">Import</button>
    </div>
</div>

</template>