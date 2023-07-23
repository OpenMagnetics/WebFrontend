<script setup>
import { ref } from 'vue'
const emit = defineEmits(['tool_change'])
</script>

<template>
<div class="accordion" id="coreToolAccordion">
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="CoreToolMenuHeadingShapeArtisan">
            <button data-test-id="CoreToolMenu-shapeArtisan-button" :class="$userStore.coreSubsection == 'shapeArtisan'? '' : 'collapsed'" class="fs-5 accordion-button bg-light text-primary" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo" @click="$emit('tool_change', 'shapeArtisan')">
                Shape Artisan
            </button>
        </h2>
        <div id="collapseTwo" :class="$userStore.coreSubsection == 'shapeArtisan'? 'show' : ''" class="accordion-collapse bg-light text-white collapse " aria-labelledby="CoreToolMenuHeadingShapeArtisan" data-bs-parent="#coreToolAccordion">
            <div class="accordion-body">
                Advanced tool for customizing the shape of a magnetic core, given a family.
            </div>
        </div>
    </div>
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="CoreToolMenuHeadingGappingArtisan">
            <button data-test-id="CoreToolMenu-gappingArtisan-button" :class="$userStore.coreSubsection == 'gappingArtisan'? '' : 'collapsed'" class="fs-5 accordion-button bg-light text-primary" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree" @click="$emit('tool_change', 'gappingArtisan')">
                Gapping Artisan
            </button>
        </h2>
        <div id="collapseThree" :class="$userStore.coreSubsection == 'gappingArtisan'? 'show' : ''" class="accordion-collapse bg-light text-white collapse" aria-labelledby="CoreToolMenuHeadingGappingArtisan" data-bs-parent="#coreToolAccordion">
            <div class="accordion-body">
                Advanced tool for customizing the number and position of gaps in the magnetic core.
            </div>
        </div>
    </div>
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="CoreToolMenuHeadingMaterialArtisan">
            <button data-test-id="CoreToolMenu-materialArtisan-button" :class="$userStore.coreSubsection == 'materialArtisan'? '' : 'collapsed'" class="fs-5 accordion-button bg-light text-primary" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour" aria-expanded="false" aria-controls="collapseFour" @click="$emit('tool_change', 'materialArtisan')">
                Material Artisan
            </button>
        </h2>
        <div id="collapseFour" :class="$userStore.coreSubsection == 'materialArtisan'? 'show' : ''" class="accordion-collapse bg-light text-white collapse" aria-labelledby="CoreToolMenuHeadingMaterialArtisan" data-bs-parent="#coreToolAccordion">
            <div class="accordion-body">
                Advanced tool for customizing the material of a magnetic core.
            </div>
        </div>
    </div>
</div>
</template>