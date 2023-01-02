<script setup>
import { ref, onMounted, computed, inject } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import { useUserStore } from '/src/stores/user'
import { useCoreStore } from '/src/stores/core'
import CoreImport from '/src/components/Core/CoreImport.vue'
import CoreExport from '/src/components/Core/CoreExport.vue'
import CorePublish from '/src/components/Core/CorePublish.vue'
import CoreNew from '/src/components/Core/CoreNew.vue'
import CoreQuickAccess from '/src/components/Core/CoreQuickAccess.vue'
import axios from "axios";
</script>

<script>

export default {
    data() {
        const userStore = useUserStore();
        const coreStore = useCoreStore();
        const coreNameSelected = userStore.globalCore == null? Defaults.defaultCoreName : userStore.globalCore['functionalDescription']['name'];
        const isLoggedIn = false
        var publishedSlug = null
        var currentCoreId = null
        if (userStore.globalCore != null) {
            if ("slug" in userStore.globalCore) {
                publishedSlug = userStore.globalCore["slug"]
            }
            if (!coreStore.isDataReadOnly.value && "_id" in userStore.globalCore) {
                currentCoreId = userStore.globalCore["_id"]
            }
        }
        var saveMessage = currentCoreId == null? "Create and add to library" : "Save changes"

        const schema = Yup.object().shape({
            coreName: Yup.string()
                .required('Name cannot be empty').min(1),
        });


        return {
            userStore,
            coreStore,
            coreNameSelected,
            isLoggedIn,
            currentCoreId,
            saveMessage,
            publishedSlug,
            schema,
        }
    },
    computed: {
        colorSaveButton() {
            if (this.saveMessage == "Error, try against later")
                return "bg-danger"
            else
                return "bg-secondary"
        }
    },
    mounted() {
        this.isLoggedIn = this.userStore.isLoggedIn
        console.log("publishedSlug")
        console.log(this.publishedSlug)

        this.userStore.$subscribe((mutation, state) => {
            this.isLoggedIn = this.userStore.isLoggedIn
        })
    },
    methods: {
        saveToDB(anonymousUser=false) {
            console.log("coreData")
            const coreData = Utils.getCoreData(this.userStore, Defaults.defaultCoreSaveConfiguration)
            console.log(coreData)
            console.log(anonymousUser)
            console.log("this.userStore.getUsername")
            console.log(this.userStore.getUsername.value)
            if (anonymousUser) {
                coreData["username"] = "anonymous"
            }
            else {
                if (this.userStore.getUsername.value == null) {
                    coreData["username"] = "anonymous"
                }
                else {
                    coreData["username"] = this.userStore.getUsername.value
                }
            }
            coreData["slug"] = this.publishedSlug
            const url = import.meta.env.VITE_API_ENDPOINT + '/core_save' + (this.currentCoreId == null? '' : ('/' + this.currentCoreId))
            console.log(url)
            console.log(this.currentCoreId)
            console.log("coreData")
            console.log(coreData)
            axios.post(url, coreData)
            .then(response => {
                console.log(response.data);
                if (response.data["id"] != null){
                    this.currentCoreId = response.data["id"]
                }
                setTimeout(() => this.saveMessage = "Save changes", 1000);
            })
            .catch(error => {
                console.log(error.data);
                this.saveMessage = "Error, try against later"
                setTimeout(() => this.saveMessage = "Save changes", 10000);

            });
            return "Saving"
        },
        onCoreName(event) {
            this.userStore.globalCore['functionalDescription']['name'] = this.coreNameSelected
        },
        onSaveToDB(event) {
            const result = this.saveToDB(false)
            this.saveMessage = result
            console.log(this.saveMessage)
        },
        onExport(event) {
            this.saveToDB(true)
        },
        onPublish(slug) {
            console.log("published")
            this.publishedSlug = slug
            this.saveToDB(false)
        },
        onNewCore() {
            this.currentCoreId = null
            this.userStore.resetGlobalCore()
            this.$router.go();
        },
        onLoadCore() {
        },
        handleSubmit(params) {
        },
    }
}
</script>

<template>
    <div class="container text-white mt-2 mb-2 pb-3 border-bottom">
        <div class="row gx-1">
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 ">
                <div class="row gx-2">
                    <button class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#newCoreModal">New</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="offcanvas" data-bs-target="#CoreImportOffCanvas" aria-controls="CoreImportOffCanvas">Import</button>

                </div>
            </div>
            <div class="col-11 col-sm-8 col-md-8 col-lg-8 col-xl-8 pe-5 ps-3">
                <Form :validation-schema="schema" v-slot="{ handleSubmit, errors }" class="form-inline row" @submit="handleSubmit($event, onSubmit)">
                    <label class="medium-text col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Core Name:</label>
                    <Field name="coreName" type="text" :class="{ 'is-invalid': errors.coreName }" :placeholder="Defaults.defaultCoreNamePlaceHolder"  @change="onCoreName" :value="Defaults.defaultCoreName" class= "small-text bg-light text-white rounded-2 col-sm-8 col-md-8 col-lg-9 col-xl-9" v-model="coreNameSelected"/>

                    <div class="invalid-feedback">{{errors.coreName}}</div>
                </Form>
                <CoreQuickAccess/>

            </div>
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 container">
                <div class="row">
                    <button :class="colorSaveButton" class="btn text-white py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-12 col-xl-12" :disabled="!isLoggedIn || (saveMessage != 'Save changes' && saveMessage != 'Create and add to library')" @click="onSaveToDB">{{saveMessage}}</button>
                    <button class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#publishCoreModal">{{publishedSlug == null? 'Publish' : 'Published'}}</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="offcanvas" data-bs-target="#CoreExportOffCanvas" aria-controls="CoreExportOffCanvas">Export</button>

                </div>
            </div>
        </div>
    </div>
    <CoreImport/>
    <CoreExport @exported="onExport"/>
    <CoreNew @onNewCore="onNewCore"/>
    <CorePublish :isLoggedIn="isLoggedIn" :publishedSlug="publishedSlug" @published="onPublish"/>

</template>