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
        this.historyStore.$onAction((action) => {
            if (action.name == "addToHistory") {
                this.$emit("canContinue", this.isMagneticBuilt());
            }
        })
    },
    methods: {
        isMagneticBuilt() {
            if (this.masStore.mas.magnetic.core.functionalDescription.material == null) {
                return false;
            }
            if (this.masStore.mas.magnetic.core.functionalDescription.shape == null) {
                return false;
            }
            if (this.masStore.mas.magnetic.core.functionalDescription.gapping == null) {
                return false;
            }
            if (this.masStore.mas.magnetic.coil.functionalDescription.length == 0) {
                return false;
            }
            if (this.masStore.mas.magnetic.coil.bobbin == null) {
                return false;
            }
            if (this.masStore.mas.magnetic.coil.bobbin == "") {
                return false;
            }
            if (this.masStore.mas.magnetic.coil.bobbin == "Dummy") {
                return false;
            }
            this.masStore.mas.magnetic.coil.functionalDescription.forEach((winding) => {
                if (winding.wire == null) {
                    return false;
                }
                if (winding.wire == "") {
                    return false;
                }
                if (winding.wire == "Dummy") {
                    return false;
                }
            })
            if (this.masStore.mas.magnetic.coil.turnsDescription == null) {
                return false;
            }
            return true;
        }
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
