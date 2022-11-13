<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import * as Defaults from '/src/assets/js/waveformDefaults.js'
import * as Utils from '/src/assets/js/waveformUtils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import { useUserStore } from '/src/stores/user'
import OperationPointExport from '/src/components/OperationPoint/OperationPointExport.vue'
import OperationPointImport from '/src/components/OperationPoint/OperationPointImport.vue'
import OperationPointNew from '/src/components/OperationPoint/OperationPointNew.vue'
import OperationPointPublish from '/src/components/OperationPoint/OperationPointPublish.vue'
import axios from "axios";

const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const commonStore = useCommonStore()
const userStore = useUserStore()

const selected = ref()
const emit = defineEmits(['voltage-type-change', 'current-type-change'])
const currentSelected = ref(currentStore.getType.value == null? Defaults.defaultCurrentType : currentStore.getType.value)
const voltageSelected = ref(voltageStore.getType.value == null? Defaults.defaultVoltageType : voltageStore.getType.value)
const operationPointNameSelected = ref(commonStore.getOperationPointName.value == null? Defaults.defaultOperationName : commonStore.getOperationPointName.value)
const voltageRef = ref(null)
const currentRef = ref(null)
const isLoggedIn = ref(false)
const currentOperationPointId = ref(null)
if (userStore.getCurrentOperationPoint.value != null) {
    if (!commonStore.isDataReadOnly.value) {
        currentOperationPointId.value = userStore.getCurrentOperationPoint.value["_id"]
    }
}
const saveMessage = ref(currentOperationPointId.value == null? "Create and add to library" : "Save changes")

const $cookies = inject('$cookies');
var publishedSlug = null

const schema = Yup.object().shape({
    voltageType: Yup.string()
        .required('Please, choose a Voltage waveform type'),
    currentType: Yup.string()
        .required('Please, choose a Current waveform type'),
    operationPointName: Yup.string()
        .required('Name cannot be empty').min(1),
});

const voltageCompatibilities = {
    "Custom": {
        "totally": ["Custom"],
        "none": [],
    },
    "Square": {
        "totally": ["Triangular"],
        "none": ["Triangular with Dead-Time"],
    },
    "Square with Dead-Time": {
        "totally": ["Triangular with Dead-Time"],
        "none": ["Triangular"],
    },
    "Sinusoidal": {
        "totally": ["Sinusoidal"],
        "none": ["Triangular with Dead-Time"],
    },
}

const currentCompatibilities = {
    "Custom": {
        "totally": ["Custom"],
        "none": [],
    },
    "Triangular": {
        "totally": ["Square"],
        "none": ["Square with Dead-Time"],
    },
    "Triangular with Dead-Time": {
        "totally": ["Square with Dead-Time"],
        "none": ["Square"],
    },
    "Sinusoidal": {
        "totally": ["Sinusoidal"],
        "none": ["Square with Dead-Time"],
    },
    "Square": {
        "totally": ["Triangular"],
        "none": ["Triangular with Dead-Time"],
    },
}

function onVoltageChange(event) {
    emit("voltage-type-change", event.target.value)
    voltageStore.setOutput("label", voltageSelected.value)
    if (voltageCompatibilities[event.target.value]['none'].includes(currentSelected.value)) {
        const found = voltageCompatibilities[event.target.value]['none'].find(element => element == currentSelected.value);
        currentRef.value.setErrors(["Voltage of type '" + found +"' is not recommended with current of type '" + currentSelected.value + "'. We recommend change the current to '" + voltageCompatibilities[event.target.value]['totally'][0] + "' instead."])
    }
    else {
        currentRef.value.setErrors([])

    }
}

function onCurrentChange(event) {
    emit("current-type-change", event.target.value)
    currentStore.setOutput("label", currentSelected.value)
    if (currentCompatibilities[event.target.value]['none'].includes(voltageSelected.value)) {
        const found = currentCompatibilities[event.target.value]['none'].find(element => element == voltageSelected.value);
        voltageRef.value.setErrors(["Current of type '" + found +"' is not recommended with voltage of type '" + voltageSelected.value + "'. We recommend change the current to '" + currentCompatibilities[event.target.value]['totally'][0] + "' instead."])
    }
    else {
        voltageRef.value.setErrors([])
    }
}

function onOperationPointName(event) {
    commonStore.setOperationPointName(operationPointNameSelected.value)
}

function onVoltageChangeFromImport(newType) {
    const event = {target: {value: newType}}
    voltageSelected.value = newType
    onVoltageChange(event)
}

function onCurrentChangeFromImport(newType) {
    const event = {target: {value: newType}}
    currentSelected.value = newType
    onCurrentChange(event)
}

function onSaveToDB(event) {
    const result = saveToDB(false)
    saveMessage.value = result
    console.log(saveMessage.value)

} 

function onExport(event) {
    saveToDB(true)
}

function onPublish(slug) {
    publishedSlug = slug
    saveToDB(false)
} 

function onNewOperationPoint() {
    console.log("currentOperationPointId")
    currentOperationPointId.value = null
} 

function saveToDB(anonymousUser=false) {
    const operationPointData = Utils.getOperationPointData(commonStore, currentStore, voltageStore, Defaults.defaultOperationPointSaveConfiguration)
    if (anonymousUser) {
        operationPointData["username"] = "anonymous"
    }
    else {
        if (userStore.getUsername.value == null) {
            operationPointData["username"] = "anonymous"
        }
        else {
            operationPointData["username"] = userStore.getUsername.value
        }
    }
    operationPointData["slug"] = publishedSlug
    const url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_save' + (currentOperationPointId.value == null? '' : ('/' + currentOperationPointId.value))
    console.log(url)
    console.log(currentOperationPointId.value)
    axios.post(url, operationPointData)
    .then(response => {
        console.log(response.data);
        if (response.data["id"] != null){
            currentOperationPointId.value = response.data["id"]
        }
        setTimeout(() => saveMessage.value = "Save changes", 1000);
    })
    .catch(error => {
        console.log(error.data);
        saveMessage.value = "Error, try against later"
        setTimeout(() => saveMessage.value = "Save changes", 10000);

    });
    return "Saving"
} 

const colorSaveButton = computed(() => {
    if (saveMessage.value == "Error, try against later")
        return "bg-danger"
    else
        return "bg-secondary"
})

onMounted(()=> {
    commonStore.setOperationPointName(operationPointNameSelected.value)
    currentStore.setOutput("label", currentSelected.value)
    voltageStore.setOutput("label", voltageSelected.value)

    isLoggedIn.value = userStore.isLoggedIn.value

    userStore.$subscribe((mutation, state) => {
        isLoggedIn.value = userStore.isLoggedIn.value
    })
})

</script>

<template>
    <div class="container text-white mt-3 mb-3 pb-3 border-bottom">
        <div class="row gx-1">
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 ">
                <div class="row gx-2">
                    <button class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#newOperationPointModal" @new_operation_point="onNewOperationPoint">New</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="offcanvas" data-bs-target="#ImportOffCanvas" aria-controls="ImportOffCanvas">Import</button>

                </div>
            </div>
            <div class="col-11 col-sm-8 col-md-8 col-lg-8 col-xl-8 pe-5 ps-3">
                <Form :validation-schema="schema" v-slot="{ errors }" class="form-inline row">
                    <label class="medium-text col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Op. Point Name:</label>
                    <Field name="operationPointName" type="text" :class="{ 'is-invalid': errors.operationPointName }" :placeholder="Defaults.defaultOperationNamePlaceHolder"  @change="onOperationPointName" :value="Defaults.defaultOperationName" class= "small-text bg-light text-white rounded-2 col-sm-8 col-md-8 col-lg-9 col-xl-9" v-model="operationPointNameSelected"/>

                    <label class="medium-text mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Voltage type:</label>
                    <Field name="voltageType" ref="voltageRef" as="select" :class="{ 'is-invalid': errors.voltageType }" @change="onVoltageChange" :value="voltageSelected" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="voltageSelected">
                        <option disabled value="">Please select one</option>
                        <option value="Custom">Custom</option>
                        <option value="Square">Square</option>
                        <option value="Square with Dead-Time">Square with Dead-Time</option>
                        <option value="Sinusoidal">Sinusoidal</option>
                    </Field>

                    <label class="medium-text  mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Current type:</label>
                    <Field name="currentType" ref="currentRef" as="select" :class="{ 'is-invalid': errors.currentType }" @change="onCurrentChange" :value="currentSelected" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="currentSelected">
                        <option disabled value="">Please select one</option>
                        <option value="Custom">Custom</option>
                        <option value="Triangular">Triangular</option>
                        <option value="Sinusoidal">Sinusoidal</option>
                        <option disabled value="Sinusoidal">Flyback (coming soon)</option>
                        <option disabled value="Sinusoidal">PS Full Bridge (coming soon)</option>
                    </Field>

                    <div class="invalid-feedback">{{errors.operationPointName}}</div>
                    <div class="invalid-feedback">{{errors.voltageType}}</div>
                    <div class="invalid-feedback">{{errors.currentType}}</div>
                </Form>
            </div>
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 container">
                <div class="row">
                    <button :class="colorSaveButton" class="btn text-white py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-12 col-xl-12" :disabled="!isLoggedIn || (saveMessage != 'Save changes' && saveMessage != 'Create and add to library')" @click="onSaveToDB">{{saveMessage}}</button>
                    <button class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#publishOperationPointModal">Publish</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="offcanvas" data-bs-target="#ExportOffCanvas" aria-controls="ExportOffCanvas">Export</button>

                </div>
            </div>
        </div>
    </div>
    <OperationPointImport @voltage-type-change="onVoltageChangeFromImport" @current-type-change="onCurrentChangeFromImport"/>
    <OperationPointExport @exported="onExport"/>
    <OperationPointNew />
    <OperationPointPublish :isLoggedIn="isLoggedIn" @published="onPublish"/>

</template>