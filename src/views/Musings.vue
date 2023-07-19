<script setup>
import Header from '/src/components/BasicHeader.vue'
import Musing from '/src/components/Musing.vue'
import Footer from '/src/components/Footer.vue'
</script>

<script>
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
        Musing
    },
    data() {
        return {
            number_columns: 3,
            musings: [
                {
                    id: 0, 
                    link: '/musings/1_critic_dowell_method_global_ac_resistance', 
                    title: 'Alf\'s Musings 1', 
                    section: 'Winding losses', 
                    description: 'First chapter of the series based on analyzing Dowell\'s work on winding losses.', 
                    date:'Dec 2021', 
                    imgSrc: '/images/musings/1/image3.webp', 
                    imgAlt: 'Dowell\'s Curves'
                },
                {
                    id: 1, 
                    link: '/musings/2_critic_dowell_method_mmf_inductor', 
                    title: 'Alf\'s Musings 2', 
                    section: 'Winding losses', 
                    description: 'Second chapter of the series based on analyzing Dowell\'s work on winding losses.', 
                    date:'Dec 2021', 
                    imgSrc: '/images/musings/2/image3.webp', 
                    imgAlt: 'Dowell\'s Curves'
                },
                {
                    id: 2, 
                    link: '/musings/3_critic_dowell_method_harmonics', 
                    title: 'Alf\'s Musings 3', 
                    section: 'Winding losses', 
                    description: 'Third and last chapter of the series based on analyzing Dowell\'s work on winding losses.', 
                    date:'Dec 2021', 
                    imgSrc: '/images/musings/3/image1.webp', 
                    imgAlt: 'Dowell\'s Curves'
                },
                {
                    id: 3, 
                    link: '/musings/4_roshen_method_core_losses', 
                    title: 'Alf\'s Musings 4', 
                    section: 'Core losses', 
                    description: 'Article published in How2Power.com explaining Roshen\'s model for core losses .', 
                    date:'Sep 2022', 
                    vidSrc: '/images/musings/4/image10.webm', 
                    imgAlt: 'Hysteresis Loop'
                },
                {
                    id: 4, 
                    link: '/musings/5_magnetic_components_for_dummies', 
                    title: 'Alf\'s Musings 5', 
                    section: 'Magnetics for dummies', 
                    description: 'First chapter of Magnetics for dummies, where we define what a Magnetic is.', 
                    date:'Jul 2022', 
                    imgSrc: '/images/musings/5/image5.webp', 
                    imgAlt: 'Dummy'
                },
                {
                    id: 5, 
                    link: '/musings/6_magnetic_cores_for_dummies', 
                    title: 'Alf\'s Musings 6', 
                    section: 'Magnetics for dummies', 
                    description: 'Second chapter of Magnetics for dummies, where we define what a Magnetic Core is.', 
                    date:'Aug 2022', 
                    imgSrc: '/images/musings/6/image0.webp', 
                    imgAlt: 'Dummy'
                },
                {
                    id: 6, 
                    link: '/musings/7_magnetic_core_shapes_effective_parameters', 
                    title: 'Alf\'s Musings 7', 
                    section: 'Magnetic core shapes', 
                    description: 'First chapter of the series focused on the study of the shapes using in Magnetic Cores', 
                    date:'Nov 2022', 
                    imgSrc: '/images/musings/7/image6.webp', 
                    imgAlt: 'Dummy'
                },
                {
                    id: 7, 
                    link: '/musings/8_magnetic_cores_shape_etymology_and_economy', 
                    title: 'Alf\'s Musings 8', 
                    section: 'Magnetic core shapes', 
                    description: 'Second chapter of the series focused on the study of the shapes using in Magnetic Cores', 
                    date:'Dec 2022', 
                    imgSrc: '/images/musings/8/image9.svg', 
                    imgAlt: 'Dummy'
                },
                {
                    id: 8, 
                    link: '/musings/9_inductance_methods_and_ieee_study', 
                    title: 'Alf\'s Musings 9', 
                    section: 'Inductance', 
                    description: 'First chapter of the series focused on the study of the inductance of Magnetics', 
                    date:'Dec 2022', 
                    imgSrc: '/images/musings/9/image1.webp', 
                    imgAlt: 'Table paper per topic in IEEE'
                },
                {
                    id: 9, 
                    link: '/musings/10_gap_reluctance_and_muehlethaler_method', 
                    title: 'Alf\'s Musings 10', 
                    section: 'Inductance', 
                    description: 'First chapter of the series focused on the study of the inductance of Magnetics', 
                    date:'Dec 2022', 
                    imgSrc: '/images/musings/10/image16.webp', 
                    imgAlt: 'Table paper per topic in IEEE'
                },
                {
                    id: 10, 
                    link: '/musings/11_inductance_variables_and_stenglein_method', 
                    title: 'Alf\'s Musings 11', 
                    section: 'Inductance', 
                    description: 'First chapter of the series focused on the study of the inductance of Magnetics', 
                    date:'Dec 2022', 
                    imgSrc: '/images/musings/11/image16.webp', 
                    imgAlt: ''
                },
            ]
        }
    },
    computed: {
        musings_by_column() {
          return listToMatrix(this.musings, this.number_columns);
        }
    }
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main">
            <div class="container">
                <div class="jumbotron p-3 p-xl-5 pt-1 pt-xl-2 text-white bg-light">
                    <div class="row my-2">
                        <p class="display-4 fs-2 text-center text-danger">Read our latest article!</p>

                    </div>
                    <div class="row mb-2">
                        <div class="col-xl-6 px-0">
                            <strong data-test="Musings-latest-section-text" class="d-inline-block mb-2 text-info">Core Permeability</strong>
                          <h1 class="display-4"><a data-test="Musings-latest-title-link" href="/musings/12_reluctance_magnetic_core_permeability_dependencies" class=" text-white">Alf's Musings 12</a></h1>
                          <p class="lead mb-0"><a data-test="Musings-latest-read-it-link" href="/musings/12_reluctance_magnetic_core_permeability_dependencies">Read it!</a>  </p>
                        </div>
                        <div class="col-xl-6">
                            <img data-test="Musings-latest-image" class=" ml-2 card-img-right flex-auto d-none d-xl-block" alt="Table paper per topic in IEEE" style="width: 500px;" src="/images/musings/12/image7.webp"  >
                        </div>
                    </div>
                </div>
                <div id="musing-container">
                    <template v-for="musings_row, row_index in musings_by_column">
                        <div class="row mb-2">
                            <Musing v-for="item, index in musings_row"
                                    :key="item.id"
                                    :dataTestLabel="'Musing-' + index"
                                    v-bind="item"
                            ></Musing>
                        </div>
                    </template>
                </div>
            </div>
        </main>

        <Footer class="mt-auto"/>
    </div>
</template>
