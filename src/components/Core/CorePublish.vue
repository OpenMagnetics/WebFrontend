<script setup>
import { ref } from 'vue'
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';
import * as Defaults from '/src/assets/js/defaults.js'
import * as Utils from '/src/assets/js/utils.js'
import { useCurrentStore } from '/src/stores/waveform'
import { useVoltageStore } from '/src/stores/waveform'
import { useCommonStore } from '/src/stores/waveform'

</script>

<script>

const currentStore = useCurrentStore()
const voltageStore = useVoltageStore()
const commonStore = useCommonStore()
const formRef = ref(null)
const slug = ref("example")

export default {
    data() {
        const usedSlugs = []
        const schema = Yup.object().shape({
            slug: Yup.lazy(value => { return Yup.string().lowercase().trim().required().notOneOf(usedSlugs, 'Slug is already in use, please choose a different one').label("Slug")}),
        });
        return {
            posting: false,
            usedSlugs,
            schema,
            isPublished: false,
        }
    },
    props: {
        isLoggedIn: {
            type: Boolean,
            required: false,
            default: false,
        },
        publishedSlug: {
            type: String,
            required: false,
            default: null,
        },
    },
    methods: {
        onPublish(event) {
            this.posting = true

            const data = {}
            if (this.$userStore.getUsername.value == null) {
                data["username"] = "anonymous"
            }
            else {
                data["username"] = this.$userStore.getUsername.value
            }
            data["slug"] = slug.value
            const url = import.meta.env.VITE_API_ENDPOINT + '/core_publish'

            this.$axios.post(url, data)
            .then(response => {
                if (response.data['status'] == 'slug exists'){
                    this.usedSlugs.push(response.data['slug'].toLowerCase())
                    formRef.value.validate()
                    this.posting = false
                }
                else if (response.data['status'] == 'published'){
                    this.$emit("published", response.data['slug'])
                    this.isPublished = true
                    setTimeout(() => this.posting = false, 2000);
                }
                
            })
            .catch(error => {
                console.error("Error in core publish")
                this.posting = false
            });
        }
    },
    computed: {
        getURL() {
            return window.location.href + "/" + slug.value
        }
    },
    mounted() {
        if (this.publishedSlug != null) {
            this.isPublished = true
            slug.value = this.publishedSlug
        }
    }
}
</script>
<template>
    <div class="modal fade" id="publishCoreModal" tabindex="-1" aria-labelledby="publishCoreModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <p class="modal-title fs-5" id="publishCoreModalLabel">Publish core</p>
                    <button data-test="CorePublish-corner-close-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="publishCoreModalClose"></button>
                </div>
                <div class="modal-body row mt-4">
                    <p v-if="isLoggedIn" class="modal-title fs-6 text-center col-12" >Your core will be saved into your account and anybody with the following link will be able to access it</p>
                    <p v-else class="modal-title fs-6 text-center col-12" >Anybody with the following link will be able to access this core:</p>
                    <a data-test="CorePublish-slug-link" class="text-primary my-3 offset-1 col-6"  :href="getURL">{{getURL}}</a>

                    <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline row">
                        <label class="medium-text col-sm-4 col-md-4 col-lg-4 col-xl-4 text-md-end">Edit identifier?</label>
                        <Field data-test="CorePublish-slug-input" name="slug" type="text" :class="{ 'is-invalid': errors.slug }" class= "small-text bg-light text-white rounded-2 col-sm-8 col-md-8 col-lg-8 col-xl-8" v-model="slug"/>

                        <div class="invalid-feedback">{{errors.slug}}</div>
                    </Form>
                    <p class="text-success modal-title fs-6 text-center my-2 col-12" >{{isPublished? "Your core is published, but you can still change the identifier" : " "}}</p>
                    <img data-test="CorePublish-loading" v-if="posting" class="mx-auto d-block" alt="loading" style="width: 150px; height: auto;" src="/images/loading.gif">
                    <button data-test="CorePublish-publish-button" v-if="!posting" class="btn text-dark bg-primary mt-2 offset-1 col-5" @click="onPublish" >{{isPublished? "Update" : "Publish"}}</button>
                    <button data-test="CorePublish-close-button" v-if="!posting" class="btn btn-dark text-primary border-primary mx-auto d-block mt-2 offset-1 col-5" data-bs-dismiss="modal" >Close</button>

                </div>
            </div>
        </div>
    </div>
</template>