<script setup >
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import { useUserStore } from '/src/stores/user'
import { useUserDatabaseStore } from '/src/stores/userDatabase'
import axios from "axios"
import '/src/assets/css/vue-good-table-next.css'
import { VueGoodTable } from 'vue-good-table-next';
import * as Utils from '/src/assets/js/utils.js'
import { useCommonStore } from '/src/stores/waveform'
import * as Defaults from '/src/assets/js/defaults.js'

import ElementDelete from '/src/components/User/ElementDelete.vue'

</script>

<script>

export default {
    components: {
        VueGoodTable,
    },
    props: {
        specificElement: {
            type: String,
            required: false,
            default: null
        },
        showTitle: {
            type: Boolean,
            required: false,
            default: true
        },
        showMenu: {
            type: Boolean,
            required: false,
            default: true
        },
        showLegend: {
            type: Boolean,
            required: false,
            default: true
        },
        commonColumns: {
            type: Array,
            required: false,
            default: [
                {
                    label: 'Status',
                    field: 'status',
                    tdClass: 'text-center',
                    tooltip: 'Marks if the Operation Point has been published or shared',
                },
                {
                    label: 'URL',
                    field: 'url',
                    tdClass: 'URL under which the Operation Point has been published',
                },
                {
                    label: 'Load',
                    field: 'load',
                    tdClass: 'text-center',
                },
                {
                    label: 'Delete',
                    field: 'delete',
                    tdClass: 'text-center',
                },
            ]
        },
        operationPointsColumns: {
            type: Array,
            required: false,
            default: [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Operation Point',
                },
                {
                    label: 'Sw. Freq.',
                    field: 'switchingFrequency',
                    type: 'number',
                    tdClass: 'text-center',
                    tooltip: 'Switching frequency of the Operation Point',
                },
                {
                    label: 'Current type',
                    field: 'currentType',
                    tdClass: 'text-center',
                    tooltip: 'Type of the Current waveform of the Operation Point',
                },
                {
                    label: 'Voltage type',
                    field: 'voltageType',
                    tdClass: 'text-center',
                    tooltip: 'Type of the Voltage waveform of the Operation Point',
                },
                {
                    label: 'Power',
                    field: 'power',
                    tdClass: 'text-center',
                    tooltip: 'Power of the Operation Point',
                },
            ]

        },
        coresColumns: {
            type: Array,
            required: false,
            default: [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Core',
                },
            ]

        },
        bobbinsColumns: {
            type: Array,
            required: false,
            default: [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Bobbin',
                },
            ]

        },
        wiresColumns: {
            type: Array,
            required: false,
            default: [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Wire',
                },
            ]

        },
        magneticsColumns: {
            type: Array,
            required: false,
            default: [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Magnetic',
                },
            ]
        },
    },
    data() {
        const userStore = useUserStore()
        const userDatabaseStore = useUserDatabaseStore()
        const operationPointCommonStore = useCommonStore()
        const operationPointsData = []
        const coresData = []
        const bobbinsData = []
        const wiresData = []
        const magneticsData = []

        const selectedData = []
        return {
            dataLoaded: 0,
            loggedIn: false,
            username: null,
            nameToDelete: null,
            typeToDelete: null,
            idToDelete: null,
            userDatabaseStore,
            userStore,
            operationPointCommonStore,
            operationPointsColor: "bg-light text-primary",
            coresColor: "bg-light text-primary",
            bobbinsColor: "bg-light text-primary",
            wiresColor: "bg-light text-primary",
            magneticsColor: "bg-light text-primary",
            scaledColumns: [],
            selectedData,
            operationPointsData,
            coresData,
            bobbinsData,
            wiresData,
            magneticsData,
        }
    },
    methods: {
        onClickOperationPoints() {
            this.userStore.setUserSubsection("operationPoints")
        },
        onClickCores() {
            this.userStore.setUserSubsection("cores")
        },
        onClickBobbins() {
            this.userStore.setUserSubsection("bobbins")
        },
        onClickWires() {
            this.userStore.setUserSubsection("wires")
        },
        onClickMagnetics() {
            this.userStore.setUserSubsection("magnetics")
        },
        loadOperationPoints() {
            if (this.userDatabaseStore.operationPoints == null) {
                setTimeout(() => this.loadOperationPoints(), 500);
                this.operationPointsData = []
            }
            else {
                const processedData = []
                this.userDatabaseStore.operationPoints.forEach((item, index) => {
                    const compressedCurrentData = Utils.packDataPoints(item["current"]["waveform"], item["frequency"])
                    const compressedVoltageData = Utils.packDataPoints(item["voltage"]["waveform"], item["frequency"])

                    const currentAux = Utils.sampleWaveform(compressedCurrentData, item["frequency"], Defaults.defaultOperationPointSaveConfiguration["numberPoints"])
                    const voltageAux = Utils.sampleWaveform(compressedVoltageData, item["frequency"], Defaults.defaultOperationPointSaveConfiguration["numberPoints"])

                    const status = []
                    if (item['slug'] != null) {
                        status.push("published")
                        // status.push("shared")  // TODO
                        // status.push("starred")  // TODO
                    }
                    const frequencyAux = Utils.formatFrequency(item["frequency"])

                    const powerRaw = Utils.getRootMeanSquare(currentAux["sampledWaveform"]) * Utils.getRootMeanSquare(voltageAux["sampledWaveform"])
                    const powerAux = Utils.formatPower(powerRaw)


                    this.operationPointsData.push({
                        id: item["_id"],
                        name: item["name"],
                        switchingFrequency: frequencyAux["label"] + " " + frequencyAux["unit"],
                        currentType: Utils.tryGuessType(compressedCurrentData, item["frequency"]),
                        voltageType: Utils.tryGuessType(compressedVoltageData, item["frequency"]),
                        power: Utils.removeTrailingZeroes(powerAux["label"], 2) + " " + powerAux["unit"],
                        status: status,
                        url: item["slug"] == null? null : "https://openmagnetics.com/operation_point/" + item["slug"],
                    })
                })
                this.dataLoaded += 1
                this.scaleColumns()  // To avoid bug in vue-good-table-next
                this.changeSubsection()
            }
        },
        loadCores() {
            if (this.userDatabaseStore.cores == null) {
                setTimeout(() => this.loadCores(), 500);
                this.coresData = []
            }
            else {
                const processedData = []
                this.userDatabaseStore.cores.forEach((item, index) => {
                    this.coresData.push({
                        id: item["_id"],
                        name: item["name"],
                    })
                })
                this.dataLoaded += 1
                this.scaleColumns()  // To avoid bug in vue-good-table-next
                this.changeSubsection()
            }
        },
        loadBobbins() {
            if (this.userDatabaseStore.bobbins == null) {
                setTimeout(() => this.loadBobbins(), 500);
                this.bobbinsData = []
            }
            else {
                const processedData = []
                this.userDatabaseStore.bobbins.forEach((item, index) => {
                    this.bobbinsData.push({
                        id: item["_id"],
                        name: item["name"],
                    })
                })
                this.dataLoaded += 1
                this.scaleColumns()  // To avoid bug in vue-good-table-next
                this.changeSubsection()
            }
        },
        loadWires() {
            if (this.userDatabaseStore.wires == null) {
                setTimeout(() => this.loadWires(), 500);
                this.wiresData = []
            }
            else {
                const processedData = []
                this.userDatabaseStore.wires.forEach((item, index) => {
                    this.wiresData.push({
                        id: item["_id"],
                        name: item["name"],
                    })
                })
                this.dataLoaded += 1
                this.scaleColumns()  // To avoid bug in vue-good-table-next
                this.changeSubsection()
            }
        },
        loadMagnetics() {
            if (this.userDatabaseStore.magnetics == null) {
                setTimeout(() => this.loadMagnetics(), 500);
                this.magneticsData = []
            }
            else {
                const processedData = []
                this.userDatabaseStore.magnetics.forEach((item, index) => {
                    this.magneticsData.push({
                        id: item["_id"],
                        name: item["name"],
                    })
                })
                this.dataLoaded += 1
                this.scaleColumns()  // To avoid bug in vue-good-table-next
                this.changeSubsection()
            }
        },
        scaleColumns() {
            this.scaledColumns = []
            var selectedColumns = this.operationPointsColumns 

            if ((this.userStore.getUserSubsection.value == 'operationPoints' && this.specificElement == null) || this.specificElement == 'operationPoints' )
                selectedColumns = this.operationPointsColumns
            if ((this.userStore.getUserSubsection.value == 'cores' && this.specificElement == null) || this.specificElement == 'cores')
                selectedColumns = this.coresColumns
            if ((this.userStore.getUserSubsection.value == 'bobbins' && this.specificElement == null) || this.specificElement == 'bobbins')
                selectedColumns = this.bobbinsColumns
            if ((this.userStore.getUserSubsection.value == 'wires' && this.specificElement == null) || this.specificElement == 'wires')
                selectedColumns = this.wiresColumns
            if ((this.userStore.getUserSubsection.value == 'magnetics' && this.specificElement == null) || this.specificElement == 'magnetics')
                selectedColumns = this.magneticsColumns

            selectedColumns.forEach((item, index) => {
                const newItem = Utils.deepCopy(item)
                if (window.innerWidth < 700) {
                    var slice = 4
                    if (window.innerWidth < 400)
                        slice = 0
                    else if (window.innerWidth < 500)
                        slice = 1
                    else if (window.innerWidth < 600)
                        slice = 2
                    newItem.label = newItem.label.slice(0, slice) + '.'
                }
                this.scaledColumns.push(newItem)
            })

            this.commonColumns.forEach((item, index) => {
                const newItem = Utils.deepCopy(item)
                if (window.innerWidth < 700) {
                    var slice = 4
                    if (window.innerWidth < 400)
                        slice = 0
                    else if (window.innerWidth < 500)
                        slice = 1
                    else if (window.innerWidth < 600)
                        slice = 2
                    newItem.label = newItem.label.slice(0, slice) + '.'
                }
                this.scaledColumns.push(newItem)
            })
        },
        changeSubsection() {
            this.operationPointsColor = this.userStore.getUserSubsection.value == 'operationPoints'? 'bg-primary text-light' : 'bg-light text-primary'
            this.coresColor = this.userStore.getUserSubsection.value == 'cores'? 'bg-primary text-light' : 'bg-light text-primary'
            this.bobbinsColor = this.userStore.getUserSubsection.value == 'bobbins'? 'bg-primary text-light' : 'bg-light text-primary'
            this.wiresColor = this.userStore.getUserSubsection.value == 'wires'? 'bg-primary text-light' : 'bg-light text-primary'
            this.magneticsColor = this.userStore.getUserSubsection.value == 'magnetics'? 'bg-primary text-light' : 'bg-light text-primary'
            if ((this.userStore.getUserSubsection.value == 'operationPoints' && this.specificElement == null) || this.specificElement == 'operationPoints' )
                this.selectedData = this.operationPointsData
            if ((this.userStore.getUserSubsection.value == 'cores' && this.specificElement == null) || this.specificElement == 'cores')
                this.selectedData = this.coresData
            if ((this.userStore.getUserSubsection.value == 'bobbins' && this.specificElement == null) || this.specificElement == 'bobbins')
                this.selectedData = this.bobbinsData
            if ((this.userStore.getUserSubsection.value == 'wires' && this.specificElement == null) || this.specificElement == 'wires')
                this.selectedData = this.wiresData
            if ((this.userStore.getUserSubsection.value == 'magnetics' && this.specificElement == null) || this.specificElement == 'magnetics')
                this.selectedData = this.magneticsData
            this.scaleColumns()
        },
        onLoad(id) {
            console.log("Load: " + id)
            var dataToLoad = null

            dataToLoad = this.userDatabaseStore.getOperationPointsById(id)
            console.log(dataToLoad)
            this.userStore.setGlobalOperationPoint(dataToLoad)
            this.operationPointCommonStore.setDataReadOnly(false)
            if (this.specificElement == null) {
                // Because this means we are in the User menu
                this.$router.push('/operation_point');
            }

            this.$emit("onLoadOperationPoint")

        },
        onDelete(id) {
            this.userStore.setIdToDelete(id)

            if (this.userStore.getUserSubsection.value == 'operationPoints')
                this.typeToDelete = "operation point"
            if (this.userStore.getUserSubsection.value == 'cores')
                this.typeToDelete = "core"
            if (this.userStore.getUserSubsection.value == 'bobbins')
                this.typeToDelete = "bobbin"
            if (this.userStore.getUserSubsection.value == 'wires')
                this.typeToDelete = "wire"
            if (this.userStore.getUserSubsection.value == 'magnetics')
                this.typeToDelete = "magnetic"

            this.selectedData.forEach((item) => {
                if (item["id"] == id)
                    this.nameToDelete = item["name"]
            })

            console.log("Delete: " + id)
        },
        onDeleteElement(id) {
            console.log("To Delete: " + id)
            this.selectedData.forEach((item, index) => {
                if (item["id"] == id){
                    console.log(index)
                    this.selectedData.splice(index, 1);
                }
            })

            console.log("Deleted: " + id)
        },
    },
    computed: {
        getTitle() {
            return this.userStore.getUsername.value + "'s section"
        },
        getTableGridSize() {
            if (this.showMenu) 
                return "col-lg-9"
            else
                return "col-lg-12"
        },
    },
    created() {
        this.scaleColumns()
    },
    mounted() {
        Utils.tryLoadElements(this.userDatabaseStore, this.userStore.getUsername.value)
        if (this.userStore.getUsername.value == null && this.specificElement == null) {
            this.$router.push('/');
        }
        this.loadOperationPoints()
        this.loadCores()
        this.loadBobbins()
        this.loadWires()
        this.loadMagnetics()

        this.changeSubsection()

        window.addEventListener('resize', () => {
            this.scaleColumns()
        })
        this.userStore.$subscribe((mutation, state) => {
            this.changeSubsection()
        })
    }
}
</script>

<template>
    <main role="main">
        <ElementDelete @delete_operation_point="onDeleteElement">
            <template #elementType>
                {{typeToDelete}}
            </template>
            <template #elementName>
                {{nameToDelete}}
            </template>
        </ElementDelete>
        <div class="container">
            <div v-if="showTitle" class="row">
                <div class="offset-1 col-lg-10 text-center">
                    <h3 class="text-white my-3">{{getTitle}}</h3>
                </div>
            </div>
            <div class="row mt-2">
                <div v-if="showMenu" class="col-lg-3 text-center">
                    <div class="list-group" style="margin: 0" >
                        <button :class="operationPointsColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickOperationPoints">My operation points<span class="badge text-bg-secondary opacity-80 float-end">{{operationPointsData.length}}</span> </button>
                        <button :class="coresColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickCores">My cores (soon)<span class="badge text-bg-secondary opacity-80 float-end">{{coresData.length}}</span> </button>
                        <button :class="bobbinsColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickBobbins">My bobbins (soon)<span class="badge text-bg-secondary opacity-80 float-end">{{bobbinsData.length}}</span> </button>
                        <button :class="wiresColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickWires">My wires (soon)<span class="badge text-bg-secondary opacity-80 float-end">{{wiresData.length}}</span> </button>
                        <button :class="magneticsColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickMagnetics">My magnetics (soon)<span class="badge text-bg-secondary opacity-80 float-end">{{magneticsData.length}}</span> </button>
                    </div>
                </div>
                <div :class="getTableGridSize" class="container">
                    <div row>
                        <vue-good-table
                            :columns="scaledColumns"
                            :rows="selectedData"
                            theme="open-magnetics"
                            max-height="58vh"
                            :fixed-header="true"
                            :search-options="{
                                enabled: true
                            }"
                            >
                            <template #table-row="props">
                                <span v-if="props.column.field == 'load'">
                                    <button type="button" class="btn btn-primary"  data-bs-dismiss="modal" @click="onLoad(props.row.id)"><i class="fa-solid fa-upload"></i></button>
                                </span>
                                <span v-else-if="props.column.field == 'delete'">
                                    <i class="fa-solid fa-file-xmark"></i>
                                    <button type="button" class="btn btn-primary" @click="onDelete(props.row.id)" data-bs-toggle="modal" data-bs-target="#deleteElementModal" ><i class="fa-solid fa-trash-can"></i></button>
                                </span>
                                <span v-else-if="props.column.field == 'status'">
                                    <span v-for="item, index in props.row.status">
                                        <i v-if="item == 'starred'" class="text-primary mx-1 fa-solid fa-star"></i>
                                        <i v-if="item == 'published'" class="text-primary mx-1 fa-solid fa-eye"></i>
                                        <i v-if="item == 'shared'" class="text-primary mx-1 fa-solid fa-share-nodes"></i>
                                    </span> 
                                </span>
                                <span v-else-if="props.column.field == 'url'">
                                    <a v-if="props.row.url != null" class="text-success" :href="props.row.url">Link</a>
                                </span>
                                <span v-else>
                                    {{props.formattedRow[props.column.field]}}
                                </span>
                            </template>
                        </vue-good-table>
                    </div>
                    <div v-if="dataLoaded == 0" class="row">
                        <img class="mx-auto d-block" alt="loading" style="width: 250px; height: auto;" src="/images/loading.gif">

                    </div>
                </div>
            </div>
            <div v-if="showLegend" class="row mt-2">
                <span class="col-lg-7 col-9 offset-lg-3 text-white my-3 d-flex justify-content-between"> 
                    <h5 class="text-white mx-1">Legend: </h5>
                    <span>
                        <i class="text-primary mx-1 fa-solid fa-star"></i>
                        <label class="text-white mx-1">Favorite </label>
                    </span>
                    <span>
                        <i class="text-primary mx-1 fa-solid fa-eye"></i>
                        <label class="text-white mx-1">Published </label>
                    </span>
                    <span>
                        <i class="text-primary mx-1 fa-solid fa-share-nodes"></i>
                        <label class="text-white mx-1">Shared </label>
                    </span>
                    <span>
                        <i class="text-light bg-primary mx-1 p-2 rounded fa-solid fa-upload"></i>
                        <label class="text-white mx-1">Load </label>
                    </span>
                    <span>
                        <i class="text-light bg-primary mx-1 p-2 rounded fa-solid fa-trash-can"></i>
                        <label class="text-white mx-1">Delete </label>
                    </span>
                </span>
            </div>
        </div>
    </main>
</template>
