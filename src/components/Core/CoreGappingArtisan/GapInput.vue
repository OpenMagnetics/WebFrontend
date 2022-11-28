<script setup>
import axios from "axios";
</script>
<script>
export default {
    props: {
        id: {
            type: Number,
            required: true
        },
    },
    data() {

        const gapTypeSelected = "Residual"
        const schema = Yup.object().shape({
            gapType: Yup.string()
                .required('Please, choose a type of gap'),
            operationPointName: Yup.string()
                .required('Name cannot be empty').min(1),
        });

        return {
        }
    },
    computed: {
    },
    mounted () {
    },
    methods: {
        onGapTypeChange() {
            console.log("onGapTypeChange")
        }
    }
}
</script>

<template>
    <div class="container">
        <div class="row">
            <Form :validation-schema="schema" v-slot="{ errors }" class="form-inline row">
                <label class="medium-text  mt-2 col-sm-4 col-md-4 col-lg-3 col-xl-3 text-md-end">Gap type:</label>
                <Field :name="'gapType' + id" :ref="'gapType' + id + 'Ref'" as="select" :class="{ 'is-invalid': errors.gapType }" @change="onGapTypeChange" class= "small-text bg-light text-white rounded-2 mt-2 col-sm-8 col-md-8 col-lg-3 col-xl-3" v-model="gapTypeSelected">
                    <option disabled value="">Please select one</option>
                    <option value="Residual">Residual</option>
                    <option value="Spacer">Spacer</option>
                    <option value="Grinded">Grinded</option>
                    <option value="Distributed">Distributed</option>
                </Field>
                <div class="invalid-feedback">{{errors.gapType}}</div>
            </Form>
        </div>
    </div>
</template>