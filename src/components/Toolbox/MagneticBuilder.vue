<script setup>
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
        return {
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
        <div class="row">
            <div class="col-4">
                <BasicCoreBuilder />
            </div>
            <div class="col-4">
                <BasicWireBuilder />
            </div>
<!--             <div class="col-4">
                <h2 class="text-white my-5">Coil - Coming next</h2>
            </div> -->
            <div class="col-4">
                <BasicCoilBuilder />
            </div>
        </div>
    </div>
</template>
