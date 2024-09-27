<script setup>
import { useMasStore } from '/src/stores/mas'
import { useHistoryStore } from '/src/stores/history'
import BasicCoreBuilder from '/src/components/Toolbox/MagneticBuilder/BasicCoreBuilder.vue'
import BasicWireBuilder from '/src/components/Toolbox/MagneticBuilder/BasicWireBuilder.vue'
import BasicCoilBuilder from '/src/components/Toolbox/MagneticBuilder/BasicCoilBuilder.vue'
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
        return {
            masStore,
            historyStore,
        }
    },
    computed: {
    },
    watch: { 
    },
    mounted () {
        this.historyStore.addToHistory(this.masStore.mas);
        this.historyStore.blockAdditions();
    },
    methods: {
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-4">
                <BasicCoreBuilder />
            </div>
            <div class="col-4">
                <BasicWireBuilder />
            </div>
            <div class="col-4">
                <BasicCoilBuilder />
            </div>
        </div>
    </div>
</template>
