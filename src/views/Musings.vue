<script setup>
import Header from '/src/components/Header.vue'
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
            number_columns: 2,
            musings: [
                {
                    id: 0, 
                    link: '/musings/1', 
                    title: 'Alf\'s Musings 1', 
                    section: 'Winding losses', 
                    description: 'First chapter of the series based on analyzing Dowell\'s work on winding losses.', 
                    date:'Dec 2021', 
                    imgSrc: '/images/musings/1/image3.png', 
                    imgAlt: 'Dowell\'s Curves'
                },
                {
                    id: 1, 
                    link: '/musings/2', 
                    title: 'Alf\'s Musings 2', 
                    section: 'Winding losses', 
                    description: 'Second chapter of the series based on analyzing Dowell\'s work on winding losses.', 
                    date:'Dec 2021', 
                    imgSrc: '/images/musings/2/image3.png', 
                    imgAlt: 'Dowell\'s Curves'
                },
                {
                    id: 2, 
                    link: '/musings/3', 
                    title: 'Alf\'s Musings 3', 
                    section: 'Winding losses', 
                    description: 'Third and last chapter of the series based on analyzing Dowell\'s work on winding losses.', 
                    date:'Dec 2021', 
                    imgSrc: '/images/musings/3/image1.png', 
                    imgAlt: 'Dowell\'s Curves'
                },
                {
                    id: 3, 
                    link: '/musings/4', 
                    title: 'Alf\'s Musings 4', 
                    section: 'Core losses', 
                    description: 'Article published in How2Power.com explaining Roshen\'s model for core losses .', 
                    date:'Sep 2022', 
                    imgSrc: '/images/musings/4/image10.gif', 
                    imgAlt: 'Hysteresis Loop'
                },
                {
                    id: 4, 
                    link: '/musings/5', 
                    title: 'Alf\'s Musings 5', 
                    section: 'Magnetics for dummies', 
                    description: 'First chapter of Magnetics for dummies, where we define what a Magnetic is.', 
                    date:'Jul 2022', 
                    imgSrc: '/images/musings/5/image5.png', 
                    imgAlt: 'Dowell\'s Curves'
                }
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
        <main role="main">
            <div class="container">
                <div class="jumbotron p-3 p-xl-5 text-white bg-light">
                    <div class="row mb-2">
                        <div class="col-xl-6 px-0">
                            <strong class="d-inline-block mb-2 text-info">Core losses</strong>
                          <h1 class="display-4"><a href="/musings/9" class="   text-white">Alf's Musings 9</a></h1>
                          <p class="lead mb-0"><a href="/musings/9">Read it!</a>  </p>
                        </div>
                        <div class="col-xl-6">
                            <img class=" ml-2 card-img-right flex-auto d-none d-xl-block" alt="Dowell's Curves" style="width: 500px;" src="/images/musings/9/image1.png"  >
                        </div>
                    </div>
                </div>
                <div id="musing-container">
                    <template v-for="musings_row, row_index in musings_by_column">
                        <div class="row mb-2">
                            <Musing v-for="item, index in musings_row"
                                    :key="item.id"
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
