<script setup>
import { ref } from 'vue'
const emit = defineEmits(['tool_change'])
</script>


<template>
<div class="accordion" id="coreSimulationToolAccordion">
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="SimulationToolMenuHeadingCoreCalculator">
            <button data-test="SimulationToolMenu-coreCalculator-button" :class="$userStore.coreSimulationSubsection == 'coreCalculator'? '' : 'collapsed'" class="fs-5 accordion-button bg-light text-primary" type="button" data-bs-toggle="collapse" data-bs-target="#coreSimulationToolAccordioncollapseOne" aria-expanded="false" aria-controls="coreSimulationToolAccordioncollapseOne" @click="$emit('tool_change', 'coreCalculator')">
                Core Calculator
            </button>
        </h2>
        <div id="coreSimulationToolAccordioncollapseOne" :class="$userStore.coreSimulationSubsection == 'coreCalculator'? 'show' : ''" class="accordion-collapse bg-light text-white collapse " aria-labelledby="SimulationToolMenuHeadingCoreCalculator" data-bs-parent="#coreSimulationToolAccordion">
            <div class="accordion-body">
                Tool for finding the right combination of inductance, core, number of turns or gaps for your design.
            </div>
        </div>
    </div>
    <div class="accordion-item border-primary">
        <h2 class="accordion-header bg-light" id="SimulationToolMenuHeadingCoreAdviser">
            <button data-test="SimulationToolMenu-coreAdviser-button" :class="$userStore.coreSimulationSubsection == 'coreAdviser'? '' : 'collapsed'" class="fs-5 accordion-button bg-light text-primary" type="button" data-bs-toggle="collapse" data-bs-target="#coreSimulationToolAccordionCollapseTwo" aria-expanded="false" aria-controls="coreSimulationToolAccordionCollapseTwo" @click="$emit('tool_change', 'coreAdviser')">
                Core Adviser
            </button>
        </h2>
        <div id="coreSimulationToolAccordionCollapseTwo" :class="$userStore.coreSimulationSubsection == 'coreAdviser'? 'show' : ''" class="accordion-collapse bg-light text-white collapse" aria-labelledby="SimulationToolMenuHeadingCoreAdviser" data-bs-parent="#coreSimulationToolAccordion">
            <div class="accordion-body">
                Advanced tool for getting the appropiate core for a given excitations to your magnetic.
            </div>
        </div>
    </div>
</div>
</template>