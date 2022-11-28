<script setup>
import Visualizer from '/src/components/Core/CoreShapeArtisan/Visualizer.vue'
import Input from '/src/components/Core/CoreShapeArtisan/Input.vue'
import Output from '/src/components/Core/CoreShapeArtisan/Output.vue'
import TechnicalDrawer from '/src/components/Core/CoreShapeArtisan/TechnicalDrawer.vue'

</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-lg-2">
                <Input/>
            </div>
            <div class="col-lg-6 container">
                <div class="row">
                    <div class="col-12" style="height: 45vh">
                        <Visualizer/>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <Output />
                    </div>
                </div>
            </div>
            <div class="col-lg-4 container">
                <TechnicalDrawer />
            </div>
        </div>
    </div>
</template>

<style type="text/css">
.scrollable-column {
  max-height: 27vh;
  overflow: hidden;
  overflow-y: auto; 
}
</style>