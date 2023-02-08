<script setup>
import QuickAccess from '/src/components/Simulation/CoreSimulation/CoreCalculator/QuickAccess.vue'
import InductanceFromNumberTurnsAndGapping from '/src/components/Simulation/CoreSimulation/CoreCalculator/InductanceFromNumberTurnsAndGapping.vue'
import NumberTurnsFromGappingAndInductance from '/src/components/Simulation/CoreSimulation/CoreCalculator/NumberTurnsFromGappingAndInductance.vue'
import GappingFromNumberTurnsAndInductance from '/src/components/Simulation/CoreSimulation/CoreCalculator/GappingFromNumberTurnsAndInductance.vue'
import ModelInput from '/src/components/Simulation/CoreSimulation/CoreCalculator/ModelInput.vue'
import Output from '/src/components/Simulation/CoreSimulation/CoreCalculator/Output.vue'
</script>

<script>

export default {
    props: {
    },
    data() {
        return {
        }
    },
    watch: { 
    },
    computed: {
    },
    mounted () {
    },
    methods: {
        subSectionChanged(newValue) {
            console.log(newValue)
            this.$userStore.setSimulationCoreCalculatorSubsection(newValue)
        }
    }
}  

</script>

<template>
    <div class="container text-white">
        <div class="row">
            <div class="col-9">
                <div class="container">
                    <div class="row">
                        <div class="col-12 border-bottom pb-3">
                            <QuickAccess/>
                        </div>
                    </div>

                    <div class="accordion row" id="coreCalculatorAccordion bg-dark">
                        <div class="accordion-item border-0 col-4 m-0 p-0 bg-dark">
                            <h2 class="accordion-header" id="coreCalculatorheadingOne">
                                <button :class="$userStore.simulationCoreCalculatorSubsection == 'inductanceCalculator'? '' : 'collapsed'" class="fs-5 accordion-button text-info bg-light" type="button" data-bs-toggle="collapse" aria-expanded="false" aria-controls="coreCalculatorAccordioncollapseOne" @click="subSectionChanged('inductanceCalculator')">
                                    Inductance calculator
                                </button>
                            </h2>
                            <div id="coreCalculatorAccordioncollapseOne" :class="$userStore.simulationCoreCalculatorSubsection == 'inductanceCalculator'? 'show' : ''" class="accordion-collapse bg-light text-white collapse " aria-labelledby="inductanceCalculatorheadingOne" data-bs-parent="#coreCalculatorAccordion">
                                <div class="accordion-body">
                                    <InductanceFromNumberTurnsAndGapping/>
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item border-0 col-4 m-0 p-0 bg-dark">
                            <h2 class="accordion-header" id="coreCalculatorheadingTwo">
                                <button :class="$userStore.simulationCoreCalculatorSubsection == 'gappingCalculator'? '' : 'collapsed'" class="fs-5 accordion-button text-info bg-light" type="button" data-bs-toggle="collapse" aria-expanded="false" aria-controls="coreCalculatorAccordionCollapseTwo" @click="subSectionChanged('gappingCalculator')">
                                    Gapping calculator
                                </button>
                            </h2>
                            <div id="coreCalculatorAccordionCollapseTwo" :class="$userStore.simulationCoreCalculatorSubsection == 'gappingCalculator'? 'show' : ''" class="accordion-collapse bg-light text-white collapse" aria-labelledby="coreCalculatorheadingTwo" data-bs-parent="#coreCalculatorAccordion">
                                <div class="accordion-body">
                                    <GappingFromNumberTurnsAndInductance/>
                                </div>
                            </div>
                        </div>
                        <div class="accordion-item border-0 col-4 m-0 p-0 bg-dark">
                            <h2 class="accordion-header" id="coreCalculatorheadingThree">
                                <button :class="$userStore.simulationCoreCalculatorSubsection == 'numberTurnsCalculator'? '' : 'collapsed'" class="fs-5 accordion-button text-info bg-light" type="button" data-bs-toggle="collapse" aria-expanded="false" aria-controls="coreCalculatorAccordionCollapseThree" @click="subSectionChanged('numberTurnsCalculator')">
                                    No. turns calculator
                                </button>
                            </h2>
                            <div id="coreCalculatorAccordionCollapseThree" :class="$userStore.simulationCoreCalculatorSubsection == 'numberTurnsCalculator'? 'show' : ''" class="accordion-collapse bg-light text-white collapse" aria-labelledby="coreCalculatorheadingThree" data-bs-parent="#coreCalculatorAccordion">
                                <div class="accordion-body">
                                    <NumberTurnsFromGappingAndInductance/>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12">
                            <Output/>
                        </div>
                    </div>
                </div>

            </div>

            <div class="col-3">
                <ModelInput/>
            </div>
        </div>
    </div>
</template>
