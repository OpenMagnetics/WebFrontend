<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import { defaultCurrentType, 
         defaultVoltageType, 
         defaultOperationName, 
         defaultOperationPointExcitationSaveConfiguration, 
         defaultOperationNamePlaceHolder } from '/src/assets/js/defaults.js'
import { getOperationPointData } from '/src/assets/js/utils.js'
import { useCurrentStore,
         useVoltageStore,
         useCommonStore } from '/src/stores/waveform'
import OperationPointExport from '/src/components/OperationPoint/OperationPointExport.vue'
import OperationPointImport from '/src/components/OperationPoint/OperationPointImport.vue'
import OperationPointNew from '/src/components/OperationPoint/OperationPointNew.vue'
import OperationPointPublish from '/src/components/OperationPoint/OperationPointPublish.vue'
</script>

<script>
export default {
    emits: ["voltage-type-change", "current-type-change"],
    components: {
    },
    props: {
    },
    data() {
        const currentStore = useCurrentStore()
        const voltageStore = useVoltageStore()
        const commonStore = useCommonStore()

        const selected = null
        const currentSelected = currentStore.type == null? defaultCurrentType : currentStore.type
        const voltageSelected = voltageStore.type == null? defaultVoltageType : voltageStore.type
        const operationPointNameSelected = commonStore.getOperationPointName.value == null? defaultOperationName : commonStore.getOperationPointName.value
        const voltageRef = null
        const currentRef = null
        const isLoggedIn = false
        var publishedSlug = null
        var currentOperationPointId = null
        console.log(this.$userStore.globalOperationPoint)
        if (this.$userStore.globalOperationPoint != null) {
            if ("slug" in this.$userStore.globalOperationPoint) {
                publishedSlug = this.$userStore.globalOperationPoint["slug"]
            }
            if (!commonStore.dataReadOnly) {
                currentOperationPointId = this.$userStore.globalOperationPoint["_id"]
            }
        }
        const saveMessage = currentOperationPointId == null? "Create and add to library" : "Save changes"

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

        return {
            currentStore,
            voltageStore,
            commonStore,
            selected,
            currentSelected,
            voltageSelected,
            operationPointNameSelected,
            voltageRef,
            currentRef,
            isLoggedIn,
            publishedSlug,
            currentOperationPointId,
            saveMessage,
            schema,
            voltageCompatibilities,
            currentCompatibilities,
        }
    },
    methods: {
        saveToDB(anonymousUser=false) {
            const operationPointData = getOperationPointData(this.commonStore, this.currentStore, this.voltageStore, defaultOperationPointExcitationSaveConfiguration)
            if (anonymousUser) {
                operationPointData["username"] = "anonymous"
            }
            else {
                if (this.$userStore.getUsername.value == null) {
                    operationPointData["username"] = "anonymous"
                }
                else {
                    operationPointData["username"] = this.$userStore.getUsername.value
                }
            }
            operationPointData["slug"] = this.publishedSlug
            const url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_save' + (this.currentOperationPointId == null? '' : ('/' + this.currentOperationPointId))
            console.log(url)
            console.log(this.currentOperationPointId)
            this.$axios.post(url, operationPointData)
            .then(response => {
                console.log(response.data);
                if (response.data["id"] != null){
                    this.currentOperationPointId = response.data["id"]
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
        onVoltageChange(event) {
            this.voltageStore.setType(event.target.value)
            this.$emit("voltage-type-change", event.target.value)
            this.voltageStore.setOutput("label", this.voltageSelected)
            if (this.voltageCompatibilities[event.target.value]['none'].includes(this.currentSelected)) {
                const found = this.voltageCompatibilities[event.target.value]['none'].find(element => element == this.currentSelected);
                this.$refs.currentRef.setErrors(["Voltage of type '" + found +"' is not recommended with current of type '" + this.currentSelected + "'. We recommend change the current to '" + this.voltageCompatibilities[event.target.value]['totally'][0] + "' instead."])
            }
            else {
                this.$refs.currentRef.setErrors([])

            }
        },
        onCurrentChange(event) {
            this.currentStore.setType(event.target.value)
            this.$emit("current-type-change", event.target.value)
            this.currentStore.setOutput("label", this.currentSelected)
            if (this.currentCompatibilities[event.target.value]['none'].includes(this.voltageSelected)) {
                const found = this.currentCompatibilities[event.target.value]['none'].find(element => element == this.voltageSelected);
                this.$refs.voltageRef.setErrors(["Current of type '" + found +"' is not recommended with voltage of type '" + this.voltageSelected + "'. We recommend change the current to '" + this.currentCompatibilities[event.target.value]['totally'][0] + "' instead."])
            }
            else {
                this.$refs.voltageRef.setErrors([])
            }
        },
        onOperationPointName(event) {
            this.commonStore.setOperationPointName(this.operationPointNameSelected)
        },
        onVoltageChangeFromImport(newType) {
            const event = {target: {value: newType}}
            this.voltageSelected = newType
            this.onVoltageChange(event)
        },
        onCurrentChangeFromImport(newType) {
            const event = {target: {value: newType}}
            this.currentSelected = newType
            this.onCurrentChange(event)
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
            this.publishedSlug = slug
            this.saveToDB(false)
        },

        onNewOperationPoint() {
            console.log("currentOperationPointId")
            this.currentOperationPointId = null
            this.$userStore.resetGlobalOperationPoint()
        },
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
        this.commonStore.setOperationPointName(this.operationPointNameSelected)
        this.currentStore.setOutput("label", this.currentSelected)
        this.voltageStore.setOutput("label", this.voltageSelected)

        this.isLoggedIn = this.$userStore.isLoggedIn

        this.$userStore.$subscribe((mutation, state) => {
            this.isLoggedIn = this.$userStore.isLoggedIn
        })
    },
}

</script>

<template>
    <div class="container text-white mt-2 mb-2 pb-3 border-bottom">
        <div class="row gx-1">
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 ">
                <div class="row gx-2">
                    <button data-test-id="OperationPointHeader-new-modal-button" class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#newOperationPointModal" @click="onNewOperationPoint">New</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button data-test-id="OperationPointHeader-import-modal-button" class="btn text-white bg-secondary py-1 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="offcanvas" data-bs-target="#ImportOffCanvas" aria-controls="ImportOffCanvas">Import</button>

                </div>
            </div>
            <div class="col-11 col-sm-8 col-md-8 col-lg-8 col-xl-8 pe-5 ps-3">
                <Form :validation-schema="schema" v-slot="{ errors }" class="form-inline row">
                    <label class="medium-text col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Op. Point Name:</label>
                    <Field data-test-id="OperationPointHeader-name-input" name="operationPointName" type="text" :class="{ 'is-invalid': errors.operationPointName }" :placeholder="defaultOperationNamePlaceHolder"  @change="onOperationPointName" :value="defaultOperationName" class= "small-text bg-light text-white rounded-2 col-sm-8 col-md-8 col-lg-9 col-xl-9" v-model="operationPointNameSelected"/>

                    <label class="medium-text mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Voltage type:</label>
                    <Field data-test-id="OperationPointHeader-voltage-type-select-input" name="voltageType" ref="voltageRef" as="select" :class="{ 'is-invalid': errors.voltageType }" @change="onVoltageChange" :value="voltageSelected" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="voltageSelected">
                        <option data-test-id="OperationPointHeader-voltage-type-NA-option-input" disabled value="">Please select one</option>
                        <option data-test-id="OperationPointHeader-voltage-type-custom-option-input" value="Custom">Custom</option>
                        <option data-test-id="OperationPointHeader-voltage-type-square-option-input" value="Square">Square</option>
                        <option data-test-id="OperationPointHeader-voltage-type-square-with-dead-time-option-input" value="Square with Dead-Time">Square with Dead-Time</option>
                        <option data-test-id="OperationPointHeader-voltage-type-sinusoidal-option-input" value="Sinusoidal">Sinusoidal</option>
                    </Field>

                    <label class="medium-text  mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Current type:</label>
                    <Field data-test-id="OperationPointHeader-current-type-select-input" name="currentType" ref="currentRef" as="select" :class="{ 'is-invalid': errors.currentType }" @change="onCurrentChange" :value="currentSelected" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="currentSelected">
                        <option data-test-id="OperationPointHeader-current-type-NA-option-input" disabled value="">Please select one</option>
                        <option data-test-id="OperationPointHeader-current-type-custom-option-input" value="Custom">Custom</option>
                        <option data-test-id="OperationPointHeader-current-type-triangular-option-input" value="Triangular">Triangular</option>
                        <option data-test-id="OperationPointHeader-current-type-sinusoidal-option-input" value="Sinusoidal">Sinusoidal</option>
                        <option data-test-id="OperationPointHeader-current-type-flyback-option-input" disabled value="Sinusoidal">Flyback (coming soon)</option>
                        <option data-test-id="OperationPointHeader-current-type-PSFB-option-input" disabled value="Sinusoidal">PS Full Bridge (coming soon)</option>
                    </Field>

                    <div data-test-id="OperationPointHeader-name-error-text" class="invalid-feedback">{{errors.operationPointName}}</div>
                    <div data-test-id="OperationPointHeader-voltage-type-error-text" class="invalid-feedback">{{errors.voltageType}}</div>
                    <div data-test-id="OperationPointHeader-current-type-error-text" class="invalid-feedback">{{errors.currentType}}</div>
                </Form>
            </div>
            <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2 container">
                <div class="row">
                    <button data-test-id="OperationPointHeader-create-save-button" :class="colorSaveButton" class="btn text-white py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-12 col-xl-12" :disabled="!isLoggedIn || (saveMessage != 'Save changes' && saveMessage != 'Create and add to library')" @click="onSaveToDB">{{saveMessage}}</button>
                    <button data-test-id="OperationPointHeader-publish-modal-button" class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="modal" data-bs-target="#publishOperationPointModal">{{publishedSlug == null? 'Publish' : 'Published'}}</button>
                    <div class="col-12 col-sm-2 col-md-2 col-lg-2 col-xl-2"> </div>
                    <button data-test-id="OperationPointHeader-export-modal-button" class="btn text-white bg-secondary py-1 px-2 my-1 col-10 col-sm-12 col-md-12 col-lg-5 col-xl-5" data-bs-toggle="offcanvas" data-bs-target="#ExportOffCanvas" aria-controls="ExportOffCanvas">Export</button>
                </div>
            </div>
        </div>
    </div>
    <OperationPointImport @voltage-type-change="onVoltageChangeFromImport" @current-type-change="onCurrentChangeFromImport"/>
    <OperationPointExport @exported="onExport"/>
    <OperationPointNew />
    <OperationPointPublish :isLoggedIn="isLoggedIn" :publishedSlug="publishedSlug" @published="onPublish"/>

</template>