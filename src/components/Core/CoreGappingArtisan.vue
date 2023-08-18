<script setup>
import GapInput from '/src/components/Core/CoreGappingArtisan/GapInput.vue'
import GapModelInput from '/src/components/Core/CoreGappingArtisan/GapModelInput.vue';
import TechnicalDrawer from '/src/components/Core/CoreGappingArtisan/TechnicalDrawer.vue';
import { useCoreStore } from '/src/stores/core'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
</script>

<script>

export default {
    data() {
        var numberColumns = 3;

        const columnData = [];
        const residualGap = null;

        this.$mkf.ready.then(_ => {
            const aux = Utils.deepCopy(this.$userStore.globalCore);
            aux['geometricalDescription'] = null;
            aux['processedDescription'] = null;

            var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

            this.$userStore.globalCore = core;
            this.numberColumns = core['processedDescription']['columns'].length;
            this.residualGap = this.$mkf.get_constants().get('residualGap');

            if (this.$userStore.globalCore['functionalDescription']['gapping'].length > 0) {
                for (let i = 0; i < numberColumns; i++) {
                    this.columnData.push({
                        gapType: 'Residual',
                        gaps: [{
                            length: this.residualGap,
                            height: 0,
                            globalGapIndex: i,
                        }]
                    })        
                }
            }
            else {
                for (let i = 0; i < numberColumns; i++) {
                    this.columnData.push({
                        gapType: 'Residual',
                        gaps: []
                    })        
                }
            }

        });

        const coreStore = useCoreStore();

        return {
            numberColumns,
            coreStore,
            columnData,
            residualGap,
            recentChange: false,
            tryingToSend: false,
        }
    },
    computed: {
        columnDataLengthGreaterThanZero() {
            return this.columnData.length > 0
        },
        leftSideTitle() {
            return "Left Lateral Column"
        },
        centralSideTitle() {
            if (this.numberColumns > 2)
                return "Central Column"
            else if (this.$userStore.globalCore['functionalDescription']['shape']['family'] == 'ep') 
                return "Central Column"
            else
                return "Left Column"
        },
        rightSideTitle() {
            if (this.numberColumns > 2)
                return "Right Lateral Column"
            else
                return "Right Column"
        },
        centralSideBackgroundImage() {
            if (this.numberColumns > 2)
                return "'/images/columns/centralColumn.svg'"
            else if (this.$userStore.globalCore['functionalDescription']['shape']['family'] == 'ep') 
                return "'/images/columns/centralColumn.svg'"
            else
                return "/images/columns/leftColumn.svg"
        },
    },
    mounted () {
        if (this.$userStore.globalCore['processedDescription'] != null){
            this.getNumberColumns()
            this.columnData = this.decodeStoredGap()
        }
        else {
            this.$mkf.ready.then(_ => {
                const aux = Utils.deepCopy(this.$userStore.globalCore);
                aux['geometricalDescription'] = null;
                aux['processedDescription'] = null;

                var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

                this.$userStore.globalCore = core;
                this.getNumberColumns();
                this.columnData = this.decodeStoredGap();

            }).catch(error => {
            });
        }

        this.$userStore.$onAction((action) => {
            if (action.name == "updateAllLengths") {
                this.getNumberColumns()
                console.log("this.columnData called from updateAllLengths")
                this.columnData = this.decodeStoredGap()
            }
        })

        this.coreStore.$onAction((action) => {
            if (action.name == "requestGappingTechnicalDrawing") {
                this.recentChange = true
                this.tryToSend()
            }
            if (action.name == "quickGappingChanged") {
                this.getNumberColumns()
                console.log("this.columnData called from quickGappingChanged")
                this.columnData = this.decodeStoredGap()
            }
            if (action.name == "quickShapeChanged") {
                this.$mkf.ready.then(_ => {
                    const aux = Utils.deepCopy(this.$userStore.globalCore);
                    aux['geometricalDescription'] = null;
                    aux['processedDescription'] = null;

                console.warn(aux)
                    var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

                    this.$userStore.globalCore = core;
                    this.getNumberColumns();
                    this.columnData = this.decodeStoredGap();
                    this.recentChange = true;
                    this.tryToSend();

                }).catch(error => {
                });
            }
        })
    },
    methods: {
        getNumberColumns() {
            if ('processedDescription' in this.$userStore.globalCore && this.$userStore.globalCore['processedDescription'] != null) {
                this.numberColumns = this.$userStore.globalCore['processedDescription']['columns'].length
            }
        },
        getClosestColumn(gap, columns) {
            var currentDistance = Infinity
            var closestColumn = -1
            for (let i = 0; i < columns.length; i++) {
                const distance = Math.pow(gap['coordinates'][0] - columns[i]['coordinates'][0], 2) + Math.pow(gap['coordinates'][2] - columns[i]['coordinates'][2], 2)
                if (distance < currentDistance) {
                    currentDistance = distance
                    closestColumn = i;
                }
            }
            return closestColumn
        },
        decodeStoredGap() {
            const columnData = []
            const gapping = this.$userStore.globalCore['functionalDescription']['gapping']
            const columns = this.$userStore.globalCore['processedDescription']['columns']
            columns.forEach((item) => {
                columnData.push ({
                    gapType: null,
                    gaps: [],
                    coordinates: item['coordinates'],
                })
            })

            var firstGuessGapType = []

            if (this.numberColumns == gapping.length) {
                var allHaveType = true
                var allSpacer = true
                var haveGapEqualLength = true
                for (let i = 0; i < this.numberColumns; i++) {
                    allHaveType &= ("type" in gapping[i])
                }

                if (allHaveType) {
                    for (let i = 0; i < this.numberColumns; i++) {
                        allSpacer &= gapping[i]['type'] == 'additive'
                    }
                    if (allSpacer){
                        for (let i = 0; i < this.numberColumns; i++) {
                            firstGuessGapType.push({
                                gapType: "Spacer",
                                coordinates: columns[i]['coordinates']
                            })
                        }
                    }
                    else {
                        for (let i = 0; i < this.numberColumns; i++) {
                            if (gapping[i]['type'] == 'residual') {
                                firstGuessGapType.push({
                                    gapType: "Residual",
                                    coordinates: columns[i]['coordinates']
                                })
                            }
                            else {
                                firstGuessGapType.push({
                                    gapType: "Grinded",
                                    coordinates: columns[i]['coordinates']
                                })
                            }
                        }
                    }
                }
                else {
                    for (let i = 0; i < this.numberColumns - 1; i++) {
                        haveGapEqualLength &= (gapping[i]['length'] == gapping[i + 1]['length'])
                    }

                    if (haveGapEqualLength) {
                        if (gapping[0]['length'] != this.residualGap) {
                            for (let i = 0; i < this.numberColumns; i++) {
                                firstGuessGapType.push({
                                    gapType: "Spacer",
                                    coordinates: columns[i]['coordinates']
                                })
                            }
                        }
                        else {
                            for (let i = 0; i < this.numberColumns; i++) {
                                if (gapping[i]['type'] == 'residual') {
                                    firstGuessGapType.push({
                                        gapType: "Residual",
                                        coordinates: columns[i]['coordinates']
                                    })
                                }
                                else {
                                    firstGuessGapType.push({
                                        gapType: "Grinded",
                                        coordinates: columns[i]['coordinates']
                                    })
                                }
                            }
                        }
                    }
                }
            }
            else {
                for (let i = 0; i < this.numberColumns; i++) {
                    var numberGapsInColumn = 0;
                    var sampleLengthInColumn = null
                    gapping.forEach((item, index) => {
                        if (item['coordinates'][0] == columnData[i]['coordinates'][0] &&
                            item['coordinates'][2] == columnData[i]['coordinates'][2]) {
                            numberGapsInColumn += 1;
                            sampleLengthInColumn = item['length']
                        }
                    })
                    if ((numberGapsInColumn == 1) && (sampleLengthInColumn == this.residualGap)) {
                        firstGuessGapType.push({
                            gapType: "Residual",
                            coordinates: columns[i]['coordinates']
                        })
                    }
                    else {
                        firstGuessGapType.push({
                            gapType: "Grinded",
                            coordinates: columns[i]['coordinates']
                        })
                    }
                }
            }

            gapping.forEach((item, index) => {
                var columnIndex = null;
                var firstGuessGapTypeIndex = null;
                for (let i = 0; i < columnData.length; i++) {
                    if (item['coordinates'][0] == columnData[i]['coordinates'][0] &&
                        item['coordinates'][2] == columnData[i]['coordinates'][2]) {
                        columnIndex = i;
                        break;
                    }
                }
                for (let i = 0; i < firstGuessGapType.length; i++) {
                    if (item['coordinates'][0] == firstGuessGapType[i]['coordinates'][0] &&
                        item['coordinates'][2] == firstGuessGapType[i]['coordinates'][2]) {
                        firstGuessGapTypeIndex = i;
                        break;
                    }
                }

                columnData[columnIndex]['gaps'].push({
                    length: item['length'],
                    height: item['coordinates'][1],
                    globalGapIndex: index
                })

                if (columnData[columnIndex]['gaps'].length > 1){
                    columnData[columnIndex]['gapType'] = 'Distributed'
                }
                else {
                    columnData[columnIndex]['gapType'] = firstGuessGapType[firstGuessGapTypeIndex]['gapType']
                }

            })

            return columnData
        },
        changeAllOtherGapTypes(newType, columnIndex) {
            const aux = this.columnData;
            const gapIndexesInThisColumn = []
            aux.forEach((item, index) => {
                if (index != columnIndex) {
                    item['gapType'] = newType
                    // item['gaps'].splice(1);
                }
            })
            this.columnData[columnIndex]['gaps'].forEach((item, index) => {
                gapIndexesInThisColumn.push(item['globalGapIndex'])
            })
            this.$userStore.globalCore['functionalDescription']['gapping'].forEach((item, index) => {
                if (!gapIndexesInThisColumn.includes(index)) {
                    if (newType == "Spacer"){
                        item['type'] = "additive"
                    }
                    else if (newType == "Residual"){
                        item['type'] = "residual"
                    }
                    else {
                        item['type'] = "subtractive"
                    }
                }
            })
            this.columnData = Utils.deepCopy(aux);
        },
        gapTypeChanged(newType, columnIndex) {
            if (newType == "Spacer") {
                this.columnData[columnIndex]['gapType'] = newType
                this.changeAllOtherGapTypes("Spacer", columnIndex)
            }
            else {
                if (this.columnData[0]['gapType'] == "Spacer") {
                    this.columnData[columnIndex]['gapType'] = newType
                    this.changeAllOtherGapTypes("Residual", columnIndex)
                }
                else {
                    // We update it to provoke a change and trigger the watchs
                    const aux = this.columnData;
                    aux[columnIndex]['gapType'] = newType
                    this.columnData = Utils.deepCopy(this.columnData);
                }
            }
            this.recentChange = true
            this.tryToSend()
        },
        compute_gapping_technical_drawing() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_gapping_technical_drawing'

            this.coreStore.requestingGappingTechnicalDrawing()
            this.$axios.post(url, this.$userStore.globalCore)
            .then(response => {
                this.coreStore.setGappingTechnicalDrawing(response.data)
            })
            .catch(error => {
                console.error(error.data)
            });
        },
        tryToSend() {
            if (!this.tryingToSend) {
                this.recentChange = false
                this.tryingToSend = true
                setTimeout(() => {
                    if (!this.hasError) {
                        if (this.recentChange) {
                            this.tryingToSend = false
                            this.tryToSend()
                        }
                        else {
                            this.$mkf.ready.then(_ => {
                                const aux = Utils.deepCopy(this.$userStore.globalCore);
                                aux['geometricalDescription'] = null;
                                aux['processedDescription'] = null;

                                var core = JSON.parse(this.$mkf.calculate_core_data(JSON.stringify(aux), false));

                                this.$userStore.globalCore = core;
                                this.tryingToSend = false;
                                this.compute_gapping_technical_drawing();

                            }).catch(error => { 
                                this.tryingToSend = false;
                            });

                        }
                    }
                }
                , 100);
            }
        },
        onGappingChange() {
            this.recentChange = true
            this.tryToSend()
        },
    }
}
</script>
<template> 
    <div v-if="$userStore.globalCore['functionalDescription']['shape']['family'] == 't'" class="container">
        <div class="row">
            <div class="offset-1 col-lg-10 text-center">
                <p class="text-white fs-4 mt-5">We have decided to leave the implementation of gapped toroids for the future</p>
                <p class="text-white fs-4 my-3">If you really want a gapped toroid, you can vote for this feature in our roadmap!</p>
                <p> <router-link class="fs-4 text-primary" to="/roadmap">Roadmap</router-link> </p>
                <p> <router-link class="text-primary" to="/roadmap"><i class="fa-solid fa-road fa-4x bd-placeholder-img rounded-circle text-primary" width="40" height="40" xmlns="http://www.w3.org/2000/svg" role="img" focusable="false"></i></router-link> </p>
                
            </div>
        </div>
    </div>
    <div v-else class="container columns-container">
        <div v-if="$userStore.globalCore['processedDescription'] != null && columnDataLengthGreaterThanZero" class="row">
            <div v-if="numberColumns > 2" :class="'col-xl-3'" class="text-center">
                <GapInput :title="leftSideTitle" :index="2" imageFile="/images/columns/leftColumn.svg" :columnData="columnData[2]" @gapTypeChanged="gapTypeChanged" @onGappingChange="onGappingChange"/>
            </div>
            <div :class="'col-xl-3'" class="text-center">
                <GapInput :title="centralSideTitle" :index="0" :imageFile="centralSideBackgroundImage" :columnData="columnData[0]" @gapTypeChanged="gapTypeChanged" @onGappingChange="onGappingChange"/>
            </div>
            <div :class="'col-xl-3'" class="text-center">
                <GapInput :title="rightSideTitle" :index="1" imageFile="/images/columns/rightColumn.svg" :columnData="columnData[1]" @gapTypeChanged="gapTypeChanged" @onGappingChange="onGappingChange"/>
            </div>
            <div :class="numberColumns > 2? '' : 'offset-3'" class="col-xl-3 text-center">
                <GapModelInput />
                <TechnicalDrawer />
            </div>
        </div>
    </div>
</template>

<style scoped>
@media (min-width: 1200px) {
    .columns-container {
        background-size: contain; 
        background-repeat: no-repeat;
        background-position: center;
        overflow: hidden;
        overflow-y: auto; 
    }
}
.custom-tooltip {
    --bs-tooltip-bg: var(--bs-primary);
}
</style>