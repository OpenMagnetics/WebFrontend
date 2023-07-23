<script setup>
import { Form, Field } from 'vee-validate';
import * as Yup from 'yup';

</script>

<script>
export default {
    data() {
        const slug = "example"
        const usedSlugs = []
        const schema = Yup.object().shape({
            slug: Yup.lazy(value => { return Yup.string().lowercase().trim().required().notOneOf(usedSlugs, 'Slug is already in use, please choose a different one').label("Slug")}),
        });
        return {
            posting: false,
            usedSlugs,
            schema,
            slug,
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
            if (this.$userStore.username == null) {
                data["username"] = "anonymous"
            }
            else {
                data["username"] = this.$userStore.username
            }
            data["slug"] = this.slug
            const url = import.meta.env.VITE_API_ENDPOINT + '/operation_point_publish'

            this.$axios.post(url, data)
            .then(response => {
                if (response.data['status'] == 'slug exists'){
                    this.usedSlugs.push(response.data['slug'].toLowerCase())
                    this.$refs.formRef.validate()
                    this.posting = false
                }
                else if (response.data['status'] == 'published'){
                    this.$emit("published", response.data['slug'])
                    this.isPublished = true
                    setTimeout(() => this.posting = false, 2000);
                }
                
            })
            .catch(error => {
                this.posting = false
            });
        }
    },
    computed: {
        getURL() {
            return window.location.href + "/" + this.slug
        }
    },
    mounted() {
        if (this.publishedSlug != null) {
            this.isPublished = true
            this.slug = this.publishedSlug
        }
    }
}
</script>
<template>
    <div class="modal fade" id="publishOperationPointModal" tabindex="-1" aria-labelledby="publishOperationPointModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content bg-dark text-white">
                <div class="modal-header">
                    <p class="modal-title fs-5" id="publishOperationPointModalLabel">Publish operation point</p>
                    <button data-test-id="OperationPointPublish-corner-close-button" type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="publishOperationPointModalClose"></button>
                </div>
                <div class="modal-body row mt-4">
                    <p v-if="isLoggedIn" class="modal-title fs-6 text-center col-12" >Your operation point will be saved into your account and anybody with the following link will be able to access it</p>
                    <p v-else class="modal-title fs-6 text-center col-12" >Anybody with the following link will be able to access this operation point:</p>
                    <a data-test-id="OperationPointPublish-slug-link" class="text-primary my-3 offset-1 col-6"  :href="getURL">{{getURL}}</a>

                    <Form ref="formRef" :validation-schema="schema" v-slot="{ errors }" class="form-inline row">
                        <label class="medium-text col-sm-4 col-md-4 col-lg-4 col-xl-4 text-md-end">Edit identifier?</label>
                        <Field data-test-id="OperationPointPublish-slug-input" name="slug" type="text" :class="{ 'is-invalid': errors.slug }" class= "small-text bg-light text-white rounded-2 col-sm-8 col-md-8 col-lg-8 col-xl-8" v-model="slug"/>

                        <div class="invalid-feedback">{{errors.slug}}</div>
                    </Form>
                    <p class="text-success modal-title fs-6 text-center my-2 col-12" >{{isPublished? "Your operation point is published, but you can still change the identifier" : " "}}</p>
                    <img data-test-id="OperationPointPublish-loading" v-if="posting" class="mx-auto d-block" alt="loading" style="width: 150px; height: auto;" src="/images/loading.gif">
                    <button data-test-id="OperationPointPublish-publish-button" v-if="!posting" class="btn text-dark bg-primary mt-2 offset-1 col-5" @click="onPublish" >{{isPublished? "Update" : "Publish"}}</button>
                    <button data-test-id="OperationPointPublish-close-button" v-if="!posting" class="btn btn-dark text-primary border-primary mx-auto d-block mt-2 offset-1 col-5" data-bs-dismiss="modal" >Close</button>

                </div>
            </div>
        </div>
    </div>
</template>