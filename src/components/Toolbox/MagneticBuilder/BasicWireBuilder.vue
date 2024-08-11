<script setup>
import { useMasStore } from '/src/stores/mas'
import Core3DVisualizer from '/src/components/Common/Core3DVisualizer.vue'
import BasicWireSelector from '/src/components/Toolbox/MagneticBuilder/BasicWireSelector.vue'
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
        return {
            masStore
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
    },
    methods: {
    }
}
</script>

<template>
    <div class="container">
        <div class="row" style="height: 30vh">
            <Core3DVisualizer 
                :dataTestLabel="`${dataTestLabel}-Core3DVisualizer`"
                :core="masStore.mas.magnetic.core"
                :fullCoreModel="true"
                :loadingGif="'/images/loading.gif'"
            />
        </div>
        <div class="row">
            <BasicWireSelector />
        </div>
    </div>
</template>
