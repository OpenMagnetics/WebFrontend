<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'
import { toTitleCase } from '/src/assets/js/utils.js'

import DesignRequirements from '/src/components/Synthesis/DesignRequirements.vue'
import OperatingPoints from '/src/components/Synthesis/OperatingPoints.vue'
import CoreAdviser from '/src/components/Synthesis/CoreAdviser.vue'
import CoreCustomizer from '/src/components/Synthesis/CoreCustomizer.vue'
import WireAdviser from '/src/components/Synthesis/WireAdviser.vue'
import WireCustomizer from '/src/components/Synthesis/WireCustomizer.vue'
import CoilAdviser from '/src/components/Synthesis/CoilAdviser.vue'
import MagneticFinalizer from '/src/components/Synthesis/MagneticFinalizer.vue'

</script>

<script>
export default {
    data() {
        var activeVerticalIndex = 0;
        var activeHorizontalIndex = 0;
        // var selectedTool = "";
        const currentStoryline= [
                {
                    title: "Design Requirements"
                },
                {
                    title: "Operation Points"
                },
                {
                    title: "Core Selection"
                },
                {
                    title: "Wire Selection"
                },
                {
                    title: "Coil Selection"
                },
                {
                    title: "Magnetic Finalizer"
                }
            ];
        const storylineCoordinates = {
            'DesignRequirements': [0, 0],
            'DesignRequirementsAdv': [0, 1],
            'OperatingPoints': [1, 0],
            'CoreAdviser': [2, 0],
            'CoreCustomizer': [2, 1],
            'WireAdviser': [3, 0],
            'WireCustomizer': [3, 1],
            'CoilAdviser': [4, 0],
            'MagneticFinalizer': [5, 0],
        }
        return {
            activeVerticalIndex,
            activeHorizontalIndex,
            currentStoryline,
            storylineCoordinates,
            // selectedTool,
        }
    },
    methods: {
        decreaseVerticalIndex(event) {
            console.log('decreaseVerticalIndex')
            if (this.activeVerticalIndex > 0) {
                this.activeVerticalIndex -= 1;
                this.activeHorizontalIndex = 0;
            }
        },
        increaseVerticalIndex(event) {
            console.log('increaseVerticalIndex')
            if (this.activeVerticalIndex < this.currentStoryline.length - 1) {
                this.activeVerticalIndex += 1;
                this.activeHorizontalIndex = 0;
            }
        },
        increaseHorizontalIndex(event) {
            this.activeHorizontalIndex += 1;
        },
        decreaseHorizontalIndex(event) {
            this.activeHorizontalIndex -= 1;
        },
        checkCoordinates(tool) {
            if (this.storylineCoordinates[tool][0] == this.activeVerticalIndex &&
                this.storylineCoordinates[tool][1] == this.activeHorizontalIndex) {
                return true
            }
            else {
                return false
            }
        },
        traversableRight() {
            var traversableRight = false;
            for (const [key, value] of Object.entries(this.storylineCoordinates)) {
                if (value[0] == this.activeVerticalIndex && value[1] == (this.activeHorizontalIndex + 1)){
                    traversableRight = true;
                }
            };

            return traversableRight;
        },
        traversableLeft() {
            var traversableLeft = false;
            for (const [key, value] of Object.entries(this.storylineCoordinates)) {
                if (value[0] == this.activeVerticalIndex && value[1] == (this.activeHorizontalIndex - 1)){
                    traversableLeft = true;
                }
            };

            return traversableLeft;
        },
    },
    computed: {
        selectedTool() {
            for (const [key, value] of Object.entries(this.storylineCoordinates)) {
                if (value[0] == this.activeVerticalIndex && value[1] == this.activeHorizontalIndex){
                    return key;
                }
            };
            return "Me he perdio"
        }
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main">
            <div class="container mx-auto ">
                <div class="row">
                    <div class="storyline text-white text-center col-1 bg-light border border-primary m-0 p-1">
                        <h4 class="text-center">Storyline</h4>
                        <Storyline :activeVerticalIndex="activeVerticalIndex" :storyline="currentStoryline"/>
                    </div>
                    <div class="tool text-white bg-dark text-center offset-1 col-11 bg-light" >
                        <div>
                            <button data-cy="magnetic-synthesis-previous-tool-button" class="btn btn-outline-primary float-start mb-2" @click="decreaseVerticalIndex"> Previous tool</button>
                            <h2 data-cy="magnetic-synthesis-title-text" class="">
                                {{toTitleCase(selectedTool)}}
                            </h2>
                        </div>
                            
                        <DesignRequirements :dataTestLabel="'MagneticSynthesis-DesignRequirements'" v-if="checkCoordinates('DesignRequirements')"/>
                        <OperatingPoints :dataTestLabel="'MagneticSynthesis-OperatingPoints'" v-if="checkCoordinates('OperatingPoints')"/>
                        <CoreAdviser :dataTestLabel="'MagneticSynthesis-CoreAdviser'" v-if="checkCoordinates('CoreAdviser')"/>
                        <CoreCustomizer :dataTestLabel="'MagneticSynthesis-CoreCustomizer'" v-if="checkCoordinates('CoreCustomizer')"/>
                        <WireAdviser :dataTestLabel="'MagneticSynthesis-WireAdviser'" v-if="checkCoordinates('WireAdviser')"/>
                        <WireCustomizer :dataTestLabel="'MagneticSynthesis-WireCustomizer'" v-if="checkCoordinates('WireCustomizer')"/>
                        <CoilAdviser :dataTestLabel="'MagneticSynthesis-CoilAdviser'" v-if="checkCoordinates('CoilAdviser')"/>
                        <MagneticFinalizer :dataTestLabel="'MagneticSynthesis-MagneticFinalizer'" v-if="checkCoordinates('MagneticFinalizer')"/>
                        <button data-cy="magnetic-synthesis-next-tool-button" class="btn btn-outline-primary float-start mt-2" @click="increaseVerticalIndex"> Next tool</button>
                        <button data-cy="magnetic-synthesis-customize-tool-button" v-if="traversableRight()" class="btn btn-outline-primary float-end mt-2" @click="increaseHorizontalIndex"> Customize tool</button>
                        <button data-cy="magnetic-synthesis-main-tool-button" v-if="traversableLeft()" class="btn btn-outline-primary float-end mt-2" @click="decreaseHorizontalIndex"> Back to main tool</button>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>


<style lang="css">

.tool {
    min-height: 84vh;
    overflow: hidden;
}
.storyline {
    max-height: auto;
    position: fixed;
    overflow: hidden;
}

</style>
