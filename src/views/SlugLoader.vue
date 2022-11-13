<script setup>
import OperationPoint from '/src/views/OperationPoint.vue'
import axios from "axios"
import { useUserStore } from '/src/stores/user'
import { useCommonStore } from '/src/stores/waveform'
import * as Utils from '/src/assets/js/waveformUtils.js'

</script>
<script>

export default {
    data() {
        const userStore = useUserStore()
        const operationPointCommonStore = useCommonStore()
        return {
            operationPointLoaded: false,
            userStore,
            operationPointCommonStore,
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
                console.log(url)
                console.log(data)
                axios.post(url, data)
                .then(response => {
                    console.log(response.data)
                    if (response.data == null)
                        this.$router.push('/');
                    else {
                        this.userStore.setCurrentOperationPoint(response.data["element"])
                        this.operationPointCommonStore.setDataReadOnly(true)
                        this.operationPointLoaded = true
                    }

                })
                .catch(error => {
                    console.log(error.data)
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
    <img v-else class="mx-auto d-block" alt="loading" style="width: 50vw; height: auto;" src="/images/loading.gif">
</template>

