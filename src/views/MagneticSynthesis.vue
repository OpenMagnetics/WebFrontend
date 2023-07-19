<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import Storyline from '/src/components/Storyline.vue'

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
        var activeVecticalIndex = 0;
        var activeHorizontalIndex = 0;
        const currentStoryline= [
                {
                    title: "Design Req."
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
                    title: "Winding Selection"
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
            activeVecticalIndex,
            activeHorizontalIndex,
            currentStoryline,
            storylineCoordinates,
        }
    },
    methods: {
        decreaseVecticalIndex(event) {
            console.log('decreaseVecticalIndex')
            if (this.activeVecticalIndex > 0) {
                this.activeVecticalIndex -= 1;
                this.activeHorizontalIndex = 0;
            }
        },
        increaseVerticalIndex(event) {
            console.log('increaseVerticalIndex')
            if (this.activeVecticalIndex < this.currentStoryline.length - 1) {
                this.activeVecticalIndex += 1;
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
            if (this.storylineCoordinates[tool][0] == this.activeVecticalIndex &&
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
                if (value[0] == this.activeVecticalIndex && value[1] == (this.activeHorizontalIndex + 1)){
                    traversableRight = true;
                }
            };

            return traversableRight;
        },
        traversableLeft() {
            var traversableLeft = false;
            for (const [key, value] of Object.entries(this.storylineCoordinates)) {
                if (value[0] == this.activeVecticalIndex && value[1] == (this.activeHorizontalIndex - 1)){
                    traversableLeft = true;
                }
            };

            return traversableLeft;
        },
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
                        <h4 class="text-center">Story line</h4>
                        <Storyline :activeVecticalIndex="activeVecticalIndex" :storyline="currentStoryline"/>
                    </div>
                    <div class="tool text-white bg-dark text-center offset-1 col-11 bg-light" >
                        <h2 class="">Tools</h2>
                        <button class="btn btn-outline-primary float-start" @click="decreaseVecticalIndex"> Previous tool</button>
                        <DesignRequirements v-if="checkCoordinates('DesignRequirements')"/>
                        <OperatingPoints v-if="checkCoordinates('OperatingPoints')"/>
                        <CoreAdviser v-if="checkCoordinates('CoreAdviser')"/>
                        <CoreCustomizer v-if="checkCoordinates('CoreCustomizer')"/>
                        <WireAdviser v-if="checkCoordinates('WireAdviser')"/>
                        <WireCustomizer v-if="checkCoordinates('WireCustomizer')"/>
                        <CoilAdviser v-if="checkCoordinates('CoilAdviser')"/>
                        <MagneticFinalizer v-if="checkCoordinates('MagneticFinalizer')"/>
                        <button class="asd btn btn-outline-primary float-start" @click="increaseVerticalIndex"> Next tool</button>
                        <button v-if="traversableRight()" class="btn btn-outline-primary float-end" @click="increaseHorizontalIndex"> Customize tool</button>
                        <button v-if="traversableLeft()" class="btn btn-outline-primary float-end" @click="decreaseHorizontalIndex"> Back to main tool</button>
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
