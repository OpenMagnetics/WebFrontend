<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'
import { useUserStore } from '/src/stores/user'
import { useCoreStore } from '/src/stores/core'
import CoreOperationPointTool from '/src/components/Core/CoreOperationPointTool.vue'
import CoreOperationPointLoad from '/src/components/Core/CoreOperationPointLoad.vue'
import CorePublish from '/src/components/Core/CorePublish.vue'
import axios from "axios";

const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const commonStore = useCommonStore()
const userStore = useUserStore()
const coreStore = useCoreStore()

const selected = ref()
const updateOperationPointToolKey = ref(0)
const coreNameSelected = ref(coreStore.getCore.value == null? Defaults.defaultCoreName : coreStore.getCore.value)

const isLoggedIn = ref(false)
const currentCoreId = ref(null)
if (userStore.getGlobalCore.value != null) {
    if (!coreStore.isDataReadOnly.value && "_id" in userStore.getGlobalCore.value) {
        coreId.value = userStore.getGlobalCore.value["_id"]
    }
}
const saveMessage = ref(currentCoreId.value == null? "Create and add to library" : "Save changes")

const $cookies = inject('$cookies');
var publishedSlug = null

const schema = Yup.object().shape({
    coreName: Yup.string()
        .required('Name cannot be empty').min(1),
});

function onCoreName(event) {
    commonStore.setCoreName(coreNameSelected.value)
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

function onNewCore() {
    currentCoreId.value = null
} 

function saveToDB(anonymousUser=false) {
    return "Saving"
} 

const colorSaveButton = computed(() => {
    if (saveMessage.value == "Error, try against later")
        return "bg-danger"
    else
        return "bg-secondary"
})

onMounted(()=> {
    isLoggedIn.value = userStore.isLoggedIn.value

    userStore.$subscribe((mutation, state) => {
        isLoggedIn.value = userStore.isLoggedIn.value
    })
})

function onLoadOperationPoint() {
    updateOperationPointToolKey.value += 1
}

function handleSubmit(params) {
}
</script>

<template>
    <div class="container text-white mt-2 mb-2 pb-3 border-bottom">
        <div class="row gx-1">
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 ">
                <div class="row gx-2">
                    <button class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#newCoreModal" @new_core="onNewCore">New</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5 disabled">Import</button>

                </div>
            </div>
            <div class="col-11 col-sm-8 col-md-8 col-lg-8 col-xl-8 pe-5 ps-3">
                <Form :validation-schema="schema" v-slot="{ handleSubmit, errors }" class="form-inline row" @submit="handleSubmit($event, onSubmit)">
                    <label class="medium-text col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Core Name:</label>
                    <Field name="coreName" type="text" :class="{ 'is-invalid': errors.coreName }" :placeholder="Defaults.defaultCoreNamePlaceHolder"  @change="onCoreName" :value="Defaults.defaultCoreName" class= "small-text bg-light text-white rounded-2 col-sm-8 col-md-8 col-lg-9 col-xl-9" v-model="coreNameSelected"/>

                    <div class="invalid-feedback">{{errors.coreName}}</div>
                </Form>
                <button class="btn text-white bg-secondary xt mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 offset-lg-1" data-bs-toggle="offcanvas" data-bs-target="#OperationPointOffCanvas" aria-controls="OperationPointOffCanvas">View/Edit excitation</button>

                <button :disabled="!isLoggedIn" class="btn text-white bg-secondary xt mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 offset-lg-1" data-bs-toggle="modal" data-bs-target="#loadOperationPointModal">Load new excitation</button>

            </div>
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 container">
                <div class="row">
                    <button :class="colorSaveButton" class="btn text-white py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-12 col-xl-12" :disabled="!isLoggedIn || (saveMessage != 'Save changes' && saveMessage != 'Create and add to library')" @click="onSaveToDB">{{saveMessage}}</button>
                    <button class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#publishCoreModal">Publish</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5 disabled" data-bs-toggle="offcanvas" data-bs-target="#ExportOffCanvas" aria-controls="ExportOffCanvas">Export</button>

                </div>
            </div>
        </div>
    </div>
    <CoreOperationPointTool :key="updateOperationPointToolKey"/>
    <CoreOperationPointLoad @onLoadOperationPoint="onLoadOperationPoint"/>
    <CorePublish :isLoggedIn="isLoggedIn" @published="onPublish"/>

</template>