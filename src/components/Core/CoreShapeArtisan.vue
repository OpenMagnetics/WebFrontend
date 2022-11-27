<script setup>
import CoreShapeArtisanVisualizer from '/src/components/Core/CoreShapeArtisanVisualizer.vue'
import CoreShapeArtisanInput from '/src/components/Core/CoreShapeArtisanInput.vue'
import CoreShapeArtisanOutput from '/src/components/Core/CoreShapeArtisanOutput.vue'
import CoreShapeArtisanTechnicalDrawer from '/src/components/Core/CoreShapeArtisanTechnicalDrawer.vue'

</script>

<template>
    <div class="container">
        <div class="row">
            <div class="col-lg-2">
                <CoreShapeArtisanInput/>
            </div>
            <div class="col-lg-6 container">
                <div class="row">
                    <div class="col-12" style="height: 45vh">
                        <CoreShapeArtisanVisualizer/>
                    </div>
                </div>
                <div class="row">
                    <div class="col-12">
                        <CoreShapeArtisanOutput />
                    </div>
                </div>
            </div>
            <div class="col-lg-4 container">
                <CoreShapeArtisanTechnicalDrawer />
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