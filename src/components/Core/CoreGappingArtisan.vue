<script setup>
import GapInput from '/src/components/Core/CoreGappingArtisan/GapInput.vue'
import GapModelInput from '/src/components/Core/CoreGappingArtisan/GapModelInput.vue';
import { useUserStore } from '/src/stores/user'
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import axios from "axios";
</script>

<script>

export default {
    data() {
        const userStore = useUserStore();
        const numberColumns = userStore.globalCore['processedDescription']['columns'].length
        const columnData = []
        for (let i = 0; i < numberColumns; i++) {
            columnData.push({
                gapType: 'Residual',
                gaps: [{
                    length: Defaults.engineConstants['residualGap'],
                    height: 0,
                    globalGapIndex: i,
                }]
            })        
        }

        return {
            numberColumns,
            userStore,
            columnData,
            recentChange: false,
            tryingToSend: false,
        }
    },
    computed: {
        leftSideTitle() {
            return "Left Lateral Column"
        },
        centralSideTitle() {
            if (this.numberColumns > 2)
                return "Central Column"
            else if (this.userStore.globalCore['functionalDescription']['shape']['family'] == 'ep') 
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
            else if (this.userStore.globalCore['functionalDescription']['shape']['family'] == 'ep') 
                return "'/images/columns/centralColumn.svg'"
            else
                return "/images/columns/leftColumn.svg"
        },
    },
    mounted () {
        this.getNumberColumns()
        this.columnData = this.decodeUserStoreGap()

        this.userStore.$onAction((action) => {
            if (action.name == "updateAllLengths") {
                this.getNumberColumns()
                this.columnData = this.decodeUserStoreGap()
            }
        })
    },
    methods: {
        getNumberColumns() {
            if ('processedDescription' in this.userStore.globalCore) {
                this.numberColumns = this.userStore.globalCore['processedDescription']['columns'].length
            }
        },
        decodeUserStoreGap() {

            const columnData = []
            const gapping = this.userStore.globalCore['functionalDescription']['gapping']
            const columns = this.userStore.globalCore['processedDescription']['columns']
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
                        if (gapping[0]['length'] != Defaults.engineConstants['residualGap']) {
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
                    if ((numberGapsInColumn == 1) && (sampleLengthInColumn == Defaults.engineConstants['residualGap'])) {
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
            this.userStore.globalCore['functionalDescription']['gapping'].forEach((item, index) => {
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
        },
        getCoreParameters() {
            const url = import.meta.env.VITE_API_ENDPOINT + '/core_compute_core_parameters'

            const aux = Utils.deepCopy(this.userStore.globalCore)
            aux['geometricalDescription'] = null
            aux['processedDescription'] = null
            axios.post(url, aux)
            .then(response => {
                const globalCore = this.userStore.globalCore
                globalCore['functionalDescription'] = response.data['functionalDescription']
                globalCore['geometricalDescription'] = response.data['geometricalDescription']
                globalCore['processedDescription'] = response.data['processedDescription']
                this.userStore.setGlobalCore(globalCore)

            })
            .catch(error => { 
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
                            this.tryingToSend = false
                            this.getCoreParameters()
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
    <div class="container columns-container">
        <div class="row">
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