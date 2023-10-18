<script setup>
import OperationPoint from '/src/views/OperationPoint.vue'
import Core from '/src/views/Core.vue'
import { useCommonStore } from '/src/stores/waveform'
import { useCoreStore } from '/src/stores/core'
import { deepCopy } from '/src/assets/js/utils.js'

</script>
<script>

export default {
    data() {
        const operationPointCommonStore = useCommonStore()
        const coreStore = useCoreStore()
        return {
            operationPointLoaded: false,
            coreLoaded: false,
            operationPointCommonStore,
            coreStore,
        }
    },
    methods: {
    },
    mounted() {
        const slug = this.$route.params.slug;
        console.log("slug")
        console.log(this.$route.fullPath)
        console.log(slug)

        if (this.$route.fullPath.includes("operation_point")){
            if (slug != null) {
                const url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_load/' + slug 
                const data = {"username": null}
                this.$axios.post(url, data)
                .then(response => {
                    if (response.data == null)
                        this.$router.push('/');
                    else {
                        this.$userStore.setGlobalOperationPoint(response.data["element"])
                        this.operationPointCommonStore.setDataReadOnly(true)
                        this.operationPointLoaded = true
                    }

                })
                .catch(error => {
                    console.error("Error loading from slug")
                    console.error(error.data)
                });
            }
        }

        if (this.$route.fullPath.includes("core")){
            if (slug != null) {
                const url = import.meta.env.VITE_API_ENDPOINT + '/core_load/' + slug 
                const data = {"username": null}
                this.$axios.post(url, data)
                .then(response => {
                    if (response.data == null)
                        this.$router.push('/');
                    else {

                        this.$userStore.globalCore = response.data["element"]
                        this.$mkf.ready.then(_ => {
                            const aux = deepCopy(this.$userStore.globalCore);
                            aux['geometricalDescription'] = null;
                            aux['processedDescription'] = null;

                            if (typeof aux['functionalDescription']['shape'] === 'string' || aux['functionalDescription']['shape'] instanceof String) {
                                aux['functionalDescription']['shape'] = findCoreShape(this.$dataCacheStore, aux['functionalDescription']['shape']);
                            }

                            var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

                            this.$userStore.globalCore = core;
                            this.coreStore.setDataReadOnly(true);
                            this.coreLoaded = true;
                        }).catch(error => { 
                            console.error(error)
                        });

                    }

                })
                .catch(error => {
                    console.error("Error loading from slug")
                    console.error(error.data)
                });
            }
        }

    },
    created() {
    },
}
</script>


<template>
    <OperationPoint v-if="operationPointLoaded"/>
    <Core v-if="coreLoaded"/>
    <div v-else class="d-flex align-middle align-self-center">
        <img class="mx-auto my-auto" alt="loading" style="width: 35vw; height: auto;" src="/images/loading.gif">
    </div>
</template>

