<script setup>
import Header from '/src/components/Header.vue'
import Milestone from '/src/components/Milestone.vue'
import Footer from '/src/components/Footer.vue'
</script>

<script>
import axios from "axios";
function getCookie(name) {
    var r = document.cookie.match("\\b" + name + "=([^;]*)\\b");
    return r ? r[1] : undefined;
}
function listToMatrix(list, elementsPerSubArray) {
    var matrix = [], i, k;

    for (i = 0, k = -1; i < list.length; i++) {
        if (i % elementsPerSubArray === 0) {
            k++;
            matrix[k] = [];
        }

        matrix[k].push(list[i]);
    }

    return matrix;
}
export default {
    components: {
        Milestone
    },
    data() {
        return {
            milestones: [
                {
                    id: 0,
                    title: 'Steinmetz Equation',
                    section: 'Core losses', 
                    description: 'Implement Steinmetz Equation, the first and simplest of method for calculating the Core Losses of a magnetic core from a few coefficients provided by the manufacturer.',
                    imgSrc: '/images/roadmap/steinmetz.png',
                    imgAlt: 'Charles Proteus Steinmetz',
                    state: "To Do"
                },
                {
                    id: 1,
                    title: 'Improved Generalized Steinmetz Equation',
                    section: 'Core losses', 
                    description: 'Implement Steinmetz Equation, an extension to the Steinmetz equation that enables estimation of losses in magnetic core materials with nonsinusoidal flux waveforms.',
                    state: "To Do"
                },
                {
                    id: 2,
                    title: 'Barg\'s model',
                    section: 'Core losses', 
                    description: 'Implement Barg\'s model for Core losses, as described in "Core Loss Calculation of Symmetric Trapezoidal Magnetic Flux Density Waveform".',
                    imgSrc: '/images/roadmap/barg.png',
                    imgAlt: 'Flux density waveform',
                    state: "To Do"
                },
                {
                    id: 3,
                    title: 'Roshen\'s model',
                    section: 'Core losses', 
                    description: 'Implement Roshen\'s model for Core losses, as described in "Ferrite Core Loss for Power Magnetic Components Design" and "A Practical, Accurate and Very General Core Loss Model for Nonsinusoidal Waveforms".',
                    imgSrc: '/images/roadmap/roshen.png',
                    imgAlt: 'Roshen minor loop',
                    state: "To Do"
                },
                {
                    id: 4,
                    title: 'Zhang method',
                    section: 'Gap Reluctance', 
                    description: 'Implement Zhang method for calculating the Reluctance of the gaps in the magnetic core, and therefore the Inductance of the final component.',
                    imgSrc: '/images/roadmap/zhang.png',
                    imgAlt: 'Zhang gap example',
                    state: "To Do"
                },
                {
                    id: 5,
                    title: 'Stenglein method',
                    section: 'Gap Reluctance', 
                    description: 'Implement Stenglein method for calculating the Reluctance of the gaps in the magnetic core, and therefore the Inductance of the final component. Especial model for large gaps',
                    imgSrc: '/images/roadmap/stenglein.png',
                    imgAlt: 'Stenglein gap example',
                    state: "To Do"
                },
                {
                    id: 6,
                    title: 'Balakrishnan method',
                    section: 'Gap Reluctance', 
                    description: 'Implement Balakrishnan method for calculating the Reluctance of the gaps in the magnetic core, and therefore the Inductance of the final component.',
                    imgSrc: '/images/roadmap/balakrishnan.png',
                    imgAlt: 'Balakrishnan gap example',
                    state: "To Do"
                },
                {
                    id: 7,
                    title: 'Mühlethaler method',
                    section: 'Gap Reluctance', 
                    description: 'Implement Mühlethaler method for calculating the Reluctance of the gaps in the magnetic core, and therefore the Inductance of the final component.',
                    imgSrc: '/images/roadmap/muehlethaler.png',
                    imgAlt: 'Mühlethaler gap example',
                    state: "To Do"
                },
                {
                    id: 8,
                    title: 'Partridge method',
                    section: 'Gap Reluctance', 
                    description: 'Implement Partridge method for calculating the Reluctance of the gaps in the magnetic core, and therefore the Inductance of the final component.',
                    state: "To Do"
                },
                {
                    id: 9,
                    title: 'Effective Length method',
                    section: 'Gap Reluctance', 
                    description: 'Implement Effective Length method for calculating the Reluctance of the gaps in the magnetic core, and therefore the of the final component Inductance.',
                    state: "To Do"
                },
                {
                    id: 10,
                    title: 'Effective Area method',
                    section: 'Gap Reluctance', 
                    description: 'Implement Effective Area method for calculating the Reluctance of the gaps in the magnetic core, and therefore the Inductance of the final component.',
                    state: "To Do"
                },
                {
                    id: 11,
                    title: 'Core Recommender',
                    section: 'Magnetic Design', 
                    description: 'Implement an algorithm that is able to recommend a magnetic core from a given specifications. The recommendation can be from Commercial Off-The-Shelf cores, or Custom Core from any family.',
                    state: "To Do"
                },
                {
                    id: 12,
                    title: 'Shape Artisan',
                    section: 'Magnetic Design', 
                    description: 'Implement an online tool for customizing any type of family of cores, by either introducing the dimensions or dragging a 2D schema. Do you want a PQ42? an RM23? You have them.',
                    imgSrc: '/images/roadmap/shape_artisan.png',
                    imgAlt: 'Custom shape example',

                    state: "To Do"
                },
                {
                    id: 13,
                    title: 'Waveform Artisan',
                    section: 'Magnetic Design', 
                    description: 'Implement an online tool for introducing and customizing electrical waveforms by drawing in a canvas and adjusting the levels by dragging.',
                    imgSrc: '/images/roadmap/waveform_artisan.png',
                    imgAlt: 'Draggable waveform example',
                    state: "To Do"
                },
                {
                    id: 14,
                    title: 'Custom Effective Parameters',
                    section: 'Core losses', 
                    description: 'Implement the calculation of effective length, area, and volume, together with minimun area; for any commercial or custom shape.',
                    state: 'Done on August 2022'
                },
                {
                    id: 15,
                    title: 'Magnetic Data Structure',
                    section: 'Magnetic Design', 
                    description: 'Define a structure that is able to describe any magnetic component without any ambiguity; including core, wires, winding structure, connectors, assembly, excitation, electromagnetic and thermal behavior',
                    imgSrc: '/images/roadmap/data_structure.png',
                    imgAlt: 'Magnetic Agnostic Structure example',
                    state: 'Done on August 2022'
                },
                {
                    id: 16,
                    title: 'Custom shape 3D model',
                    section: 'Magnetic Design', 
                    description: 'Implement functionality to model, visualize and download in STEP format any Commercial Off-The-Shelf or Custom shape, ready to be used in Finite Element Simulation.',
                    state: 'Done on September 2022'
                },
                {
                    id: 17,
                    title: 'Automatic Technical Drawing',
                    section: 'Magnetic Design', 
                    description: 'Implement functionality to automatically create a Technical Drawing for any Commercial Off-The-Shelf or Custom core.',
                    state: 'To Do'
                }
            ]
        }
    },
    computed: {
        btn_class() {
            if (this.alreadyVoted) {
                return "btn btn-danger mx-3";
            }
            else {
                return "btn btn-secondary mx-3";
            }
        }
    },
    mounted() {
        axios.post('http://' + import.meta.env.VITE_API_ENDPOINT + '/get_all_number_votes', {})
        .then(response => {
            var votesList = response.data;
            var orderedMilestone = [];
            var existingIds = [];

            this.milestones.forEach((item, index) => {
                existingIds.push(item["id"])
            });
            votesList.forEach((item, index) => {
                if (item["milestone_id"] in existingIds) {
                    orderedMilestone.push(this.milestones[item["milestone_id"]])
                }
            });
            this.milestones.forEach((item, index) => {
                if (!orderedMilestone.includes(item)) {
                    orderedMilestone.push(item)
                }
            });
            this.milestones = orderedMilestone
        })
        .catch(error => {
            console.log(error.data);
        });
    }
}
</script>

<template>
    <Header />
    <main role="main">
        <div class="container mx-auto">
                <div class="row mb-2">
                    <div class="col-xl-12 px-0">
                        <h1 class="display-4 text-center text-secondary">Open Magnetics Roadmap</h1>
                        <p class="lead my-0 text-center text-white">We believe that a tool must be defined by its users, especially an Open-Source tool, in which the users can contribute.</p>
                        <p class="lead my-0 text-center text-white">This roadmap is our first step toward that goal, so even users that cannot program and help us with the models, can contribute with their vision of what should be implemented in our tool.</p>
                        <h3 class="my-2  text-center text-white">Feel free to vote those features your think we should implement first!</h3 >
                    </div>
                </div>

                <div id="milestone-container">
                    <div class="row mb-2">
                        <Milestone v-for="item, index in milestones"
                                :key="item.id"
                                :index="index"
                                v-bind="item"
                        ></Milestone>
                    </div>
                </div>
        </div>
    </main>
    <Footer />
</template>
