<script setup>
import { ref } from 'vue'

const emit = defineEmits(['tool_change'])
</script>


<template>
<div class="accordion" id="coreToolAccordion">
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="headingOne">
            <button class="fs-5 accordion-button bg-light text-primary border-primary" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne" @click="$emit('tool_change', 'showCoreCalculator')">
                Core Calculator
            </button>
        </h2>
        <div id="collapseOne" class="accordion-collapse bg-light text-white collapse show" aria-labelledby="headingOne" data-bs-parent="#coreToolAccordion">
            <div class="accordion-body">
                The basic tool for creating a magnetic core. It includes models for calculating the Inductance, Gapping, Number of Turns and commercial Cores.
            </div>
        </div>
    </div>
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="headingTwo">
            <button class="fs-5 accordion-button bg-light text-primary collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo" @click="$emit('tool_change', 'showShapeArtisan')">
                Shape Artisan
            </button>
        </h2>
        <div id="collapseTwo" class="accordion-collapse bg-light text-white collapse" aria-labelledby="headingTwo" data-bs-parent="#coreToolAccordion">
            <div class="accordion-body">
                Advanced tool for customizing the shape of a magnetic core, given a family.
            </div>
        </div>
    </div>
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="headingThree">
            <button class="fs-5 accordion-button bg-light text-primary collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree" @click="$emit('tool_change', 'showGappingArtisan')">
                Gapping Artisan
            </button>
        </h2>
        <div id="collapseThree" class="accordion-collapse bg-light text-white collapse" aria-labelledby="headingThree" data-bs-parent="#coreToolAccordion">
            <div class="accordion-body">
                Advanced tool for customizing the number and position of gaps in the magnetic core.
            </div>
        </div>
    </div>
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="headingFour">
            <button class="fs-5 accordion-button bg-light text-primary collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseFour" aria-expanded="false" aria-controls="collapseFour" @click="$emit('tool_change', 'showMaterialArtisan')">
                Material Artisan
            </button>
        </h2>
        <div id="collapseFour" class="accordion-collapse bg-light text-white collapse" aria-labelledby="headingFour" data-bs-parent="#coreToolAccordion">
            <div class="accordion-body">
                Advanced tool for customizing the material of a magnetic core.
            </div>
        </div>
    </div>
</div>
</template>