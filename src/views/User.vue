<script setup >
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import { useUserStore } from '/src/stores/user'
import ElementDelete from '/src/components/User/ElementDelete.vue'
import axios from "axios"
import '/src/assets/css/vue-good-table-next.css'
import { VueGoodTable } from 'vue-good-table-next';
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCommonStore } from '/src/stores/waveform'


</script>

<script>

const operationPointCommonStore = useCommonStore()
export default {
    components: {
        VueGoodTable,
    },
    data() {
        const userStore = useUserStore()
        const operationPointsData = []
        const coresData = []
        const bobbinsData = []
        const wiresData = []
        const magneticsData = []
        const commonColumns= [
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
        const operationPointsColumns= [
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
            ]
        const coresColumns= [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Core',
                },
            ]
        const bobbinsColumns= [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Bobbin',
                },
            ]
        const wiresColumns= [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Wire',
                },
            ]
        const magneticsColumns= [
                {
                    label: 'Name',
                    field: 'name',
                    tdClass: 'text-center',
                    tooltip: 'Reference name give to Magnetic',
                },
            ]

        const selectedData = []
        return {
            dataLoaded: 0,
            requestingOperationPoints: false,
            requestingCores: false,
            requestingBobbins: false,
            requestingWires: false,
            requestingMagnetics: false,
            loggedIn: false,
            username: null,
            nameToDelete: null,
            typeToDelete: null,
            idToDelete: null,
            userStore,
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
            operationPointsColumns,
            coresColumns,
            bobbinsColumns,
            wiresColumns,
            magneticsColumns,
            commonColumns,
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
            if (!this.requestingOperationPoints) {
                this.requestingOperationPoints = true
                const url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_load'
                const data = {"username": this.userStore.getUsername.value}
                axios.post(url, data)
                .then(response => {
                    this.requestingOperationPoints = false
                    this.dataLoaded += 1
                    response.data["elements"].forEach((item, index) => {
                        const compressedCurrentData = Utils.packDataPoints(item["current"]["waveform"], item["frequency"])
                        const compressedVoltageData = Utils.packDataPoints(item["voltage"]["waveform"], item["frequency"])
                        const status = []
                        if (item['slug'] != null) {
                            status.push("published")
                            // status.push("shared")  // TODO
                            // status.push("starred")  // TODO
                        }
                        const frequencyAux = Utils.formatFrequency(item["frequency"])

                        this.operationPointsData.push({
                            id: item["_id"],
                            name: item["name"],
                            switchingFrequency: frequencyAux["label"] + " " + frequencyAux["unit"],
                            currentType: Utils.tryGuessType(compressedCurrentData, item["frequency"]),
                            voltageType: Utils.tryGuessType(compressedVoltageData, item["frequency"]),
                            status: status,
                            url: item["slug"] == null? null : "https://openmagnetics.com/operation_point/" + item["slug"],
                        })
                    })
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next

                })
                .catch(error => {
                    this.requestingOperationPoints = false
                    this.dataLoaded += 1
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next
                });
            }
        },
        loadCores() {
            if (!this.requestingCores) {
                this.requestingCores = true
                const url = import.meta.env.VITE_API_ENDPOINT + '/core_load'
                const data = {"username": this.userStore.getUsername.value}
                axios.post(url, data)
                .then(response => {
                    this.requestingCores = false
                    this.dataLoaded += 1
                    this.listCores = response.data
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next

                })
                .catch(error => {
                    this.requestingCores = false
                    this.dataLoaded += 1
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next
                });
            }
        },
        loadBobbins() {
            if (!this.requestingBobbins) {
                this.requestingBobbins = true
                const url = import.meta.env.VITE_API_ENDPOINT + '/bobbin_load'
                const data = {"username": this.userStore.getUsername.value}
                axios.post(url, data)
                .then(response => {
                    this.requestingBobbins = false
                    this.dataLoaded += 1
                    this.listBobbins = response.data
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next

                })
                .catch(error => {
                    this.requestingBobbins = false
                    this.dataLoaded += 1
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next
                });
            }
        },
        loadWires() {
            if (!this.requestingWires) {
                this.requestingWires = true
                const url = import.meta.env.VITE_API_ENDPOINT + '/wire_load'
                const data = {"username": this.userStore.getUsername.value}
                axios.post(url, data)
                .then(response => {
                    this.requestingWires = false
                    this.dataLoaded += 1
                    this.listWires = response.data
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next

                })
                .catch(error => {
                    this.requestingWires = false
                    this.dataLoaded += 1
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next
                });
            }
        },
        loadMagnetics() {
            if (!this.requestingMagnetics) {
                this.requestingMagnetics = true
                const url = import.meta.env.VITE_API_ENDPOINT + '/magnetic_load'
                const data = {"username": this.userStore.getUsername.value}
                axios.post(url, data)
                .then(response => {
                    this.requestingMagnetics = false
                    this.dataLoaded += 1
                    this.listMagnetics = response.data
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next

                })
                .catch(error => {
                    this.requestingMagnetics = false
                    this.dataLoaded += 1
                    this.scaleOperationPointsColumn()  // To avoid bug in vue-good-table-next
                });
            }
        },
        scaleOperationPointsColumn() {
            this.scaledColumns = []
            var selectedColumns = this.operationPointsColumns
            if (this.userStore.getUserSubsection.value == 'operationPoints')
                selectedColumns = this.operationPointsColumns
            if (this.userStore.getUserSubsection.value == 'cores')
                selectedColumns = this.coresColumns
            if (this.userStore.getUserSubsection.value == 'bobbins')
                selectedColumns = this.bobbinsColumns
            if (this.userStore.getUserSubsection.value == 'wires')
                selectedColumns = this.wiresColumns
            if (this.userStore.getUserSubsection.value == 'magnetics')
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
            if (this.userStore.getUserSubsection.value == 'operationPoints')
                this.selectedData = this.operationPointsData
            if (this.userStore.getUserSubsection.value == 'cores')
                this.selectedData = this.coresData
            if (this.userStore.getUserSubsection.value == 'bobbins')
                this.selectedData = this.bobbinsData
            if (this.userStore.getUserSubsection.value == 'wires')
                this.selectedData = this.wiresData
            if (this.userStore.getUserSubsection.value == 'magnetics')
                this.selectedData = this.magneticsData
            this.scaleOperationPointsColumn()
        },
        onLoad(id) {
            console.log("Load: " + id)
            var dataToLoad = null

            if (this.userStore.getUserSubsection.value == 'operationPoints')
                if (!this.requestingOperationPoints) {
                    this.requestingOperationPoints = true
                    const url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_load/' + id 
                    const data = {"username": this.userStore.getUsername.value}
                    axios.post(url, data)
                    .then(response => {
                        this.requestingOperationPoints = false
                        this.userStore.setCurrentOperationPoint(response.data["element"])
                        this.operationPointCommonStore.setDataReadOnly(false)
                        this.$router.push('/operation_point');

                    })
                    .catch(error => {
                        this.requestingOperationPoints = false
                        console.log(error.data)
                    });
                }
            // TODO add rest of cases 
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
    },
    created() {
        this.scaleOperationPointsColumn()
    },
    mounted() {
        if (this.userStore.getUsername.value == null) {
            this.$router.push('/');
        }
        this.loadOperationPoints()
        this.loadCores()
        this.loadBobbins()
        this.loadWires()
        this.loadMagnetics()

        this.changeSubsection()

        window.addEventListener('resize', () => {
            this.scaleOperationPointsColumn()
        })
        this.userStore.$subscribe((mutation, state) => {
            this.changeSubsection()
        })
    }
}
</script>

<template>
    <Header />
    <ElementDelete @delete_operation_point="onDeleteElement">
        <template #elementType>
            {{typeToDelete}}
        </template>
        <template #elementName>
            {{nameToDelete}}
        </template>
    </ElementDelete>
    <main role="main">
        <div class="container">
            <div class="row">
                <div class="offset-1 col-lg-10 text-center">
                    <h3 class="text-white my-3">{{getTitle}}</h3>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-lg-3 text-center">
                    <div class="list-group" style="margin: 0" >
                        <button :class="operationPointsColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickOperationPoints">My operation points<span class="badge text-bg-secondary opacity-80 float-end">{{operationPointsData.length}}</span> </button>
                        <button :class="coresColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickCores">My cores (soon)<span class="badge text-bg-secondary opacity-80 float-end">{{coresData.length}}</span> </button>
                        <button :class="bobbinsColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickBobbins">My bobbins (soon)<span class="badge text-bg-secondary opacity-80 float-end">{{bobbinsData.length}}</span> </button>
                        <button :class="wiresColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickWires">My wires (soon)<span class="badge text-bg-secondary opacity-80 float-end">{{wiresData.length}}</span> </button>
                        <button :class="magneticsColor" class="py-3 list-group-item list-group-item-action border-primary border-opacity-50 fs-5 text-start" @click="onClickMagnetics">My magnetics (soon)<span class="badge text-bg-secondary opacity-80 float-end">{{magneticsData.length}}</span> </button>
                    </div>
                </div>
                <div class="col-lg-9 container">
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
                                    <button type="button" class="btn btn-primary" @click="onLoad(props.row.id)"><i class="fa-solid fa-upload"></i></button>
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
            <div class="row mt-2">
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
    <Footer />
</template>
