<script setup>
import { useMasStore } from '/src/stores/mas'
import { useHistoryStore } from '/src/stores/history'
import { checkAndFixMas, download } from '/src/assets/js/utils.js'
</script>


<script>

export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
    },
    data() {
        const masStore = useMasStore();
        const historyStore = useHistoryStore();
        const masExported = false;
        const loading = false;
        return {
            masStore,
            historyStore,
            masExported,
            loading,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
        undo() {
            console.log("undo");
            const newMas = this.historyStore.back();
            this.masStore.mas = newMas;
            this.historyStore.historyPointerUpdated();
            this.historyStore.blockAdditions();
            setTimeout(() => {this.historyStore.unblockAdditions();}, 2000);
        },
        redo() {
            console.log("redo");
            const newMas = this.historyStore.forward();
            this.masStore.mas = newMas;
            this.historyStore.historyPointerUpdated();
            this.historyStore.blockAdditions();
            setTimeout(() => {this.historyStore.unblockAdditions();}, 2000);
        },
        load() {
            console.log("load");
            this.loading = true;
            // console.log(this.$refs.masFileReader);
            this.$refs.masFileReader.click()
            setTimeout(() => {this.loading = false;}, 2000);
        },
        exportMAS() {
            console.log("export");
            download(JSON.stringify(this.masStore.mas, null, 4), "custom_magnetic.json", "text/plain");
            this.masExported = true
            setTimeout(() => this.masExported = false, 2000);
        },
        readMASFile(event) {
            const fr = new FileReader();

            fr.onload = e => {
                const newMas = JSON.parse(e.target.result);
                if (newMas.magnetic != null) {
                    checkAndFixMas(newMas, this.$mkf).then(response => {
                        this.masStore.mas = response;
                        this.masStore.importedMas();
                        this.$userStore.magneticBuilderSubsection = "magneticBuilder";
                        for (var i = 0; i < this.masStore.magneticManualOperatingPoints.length; i++) {
                            this.masStore.magneticManualOperatingPoints[i] = true;
                        }
                        this.historyStore.addToHistory(this.masStore.mas);
                        this.historyStore.blockAdditions();
                        this.$emit('toolSelected', "magneticBuilder");
                    })
                    .catch(error => {
                        console.error(error.data)
                    });
                }

            }
            fr.readAsText(this.$refs['masFileReader'].files.item(0));
        },
    }
}
</script>

<template>
    <div class="container">
        <div class="row ">
            <button :disabled="!historyStore.isBackPossible()" class="btn btn-primary offset-sm-0 offset-lg-1 col-2 col-lg-1" @click="undo">
                <i class="fa-solid fa-arrow-rotate-left"></i>
            </button>
            <button :disabled="!historyStore.isForwardPossible()" class="btn btn-primary offset-sm-0 offset-lg-1 col-2 col-lg-1" @click="redo">
                <i class="fa-solid fa-arrow-rotate-right"></i>
            </button>
            <input data-cy="CoreImport-MAS-file-button" type="file" ref="masFileReader" @change="readMASFile()" class="btn btn-primary mt-1 rounded-3" hidden />
            <button v-if="!loading" class="btn btn-primary offset-1 col-3" @click="load">
                {{'Load MAS'}}
            </button>
            <button v-else class="btn btn-primary offset-1 col-3" @click="load">
                {{'Loading'}}
            </button>
            <button class="btn btn-primary offset-1 col-3" @click="exportMAS">
                {{'Export MAS'}}
            </button>
        </div>
    </div>
</template>
