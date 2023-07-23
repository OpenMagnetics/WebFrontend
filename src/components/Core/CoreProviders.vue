<script setup>
import { ref } from 'vue'
</script>
<script>
export default {
    data() {
        var chosenProvider = ''
        const providers = [
            {
                name: 'Gateway',
                image: '/images/providers/gateway/logo.svg',
                description: 'The Ferrite Gateway Machine Shop offers a bespoke service providing custom gapped and machined ferrite cores from our specialist UK facility. As well as stocking a vast array of standard ferrite cores manufactured by industry leaders, TDK, Ferroxcube, Fair-Rite and Magnetics, The Machine Shop offers bespoke ferrite machining services that gives the opportunity to have cores gapped to bespoke inductance, AL or dimensional specification without the need for high minimum order quantities and long lead times. The Machine Shop specialises in machining custom geometry ferrites utilising our exclusive channel for ferrite blocks from some of the biggest names in ferrite.',
                url: 'https://gatewaycando.com/ferrite-gapping-solutions'
            },
            {
                name: 'Join our providers!',
                image: null,
                description: 'Do you want your company name to appear here? If you work with custom cores and gapping and want to advertise here, contact us! \n It is totally free!',
                url: 'openmagnetics@protonmail.com'
            }    
        ]
        return {
            chosenProvider,
            providers,
        }
    },
    methods: {
        onToolChange(newTool) {
            console.log(newTool)
            this.$userStore.setCoreSubsection(newTool)
            this.chosenTool = newTool
        },
    },
    computed: {
        styleTooltip() {
            var relative_placement;
            relative_placement = 'right'
            return {
                    theme: {
                        placement: relative_placement,
                        width: '200px',
                        "text-align": "center",
                    },
                }
        },
    },
    mounted() {
    },
    created() {
    },
}
</script>

<template>
<div v-tooltip="styleTooltip">
    <h2 v-tooltip="'This a list of custom cores and gapping providers that we offer to our users. We have no economical relationship with them further than having ascertained they provide a legitimate service.'" class="accordion-header bg-dark text-white mt-5 mb-3 fs-4 text-center" id="CoreProvidersMenu"> Custom core and gapping providers</h2>
    <div class="accordion mb-5 " id="coreProvidersAccordion">
        <div class="accordion-item border-primary bg-primary"> 

            <div v-for="provider, index in providers">
                <h2 class="accordion-header bg-light mt-1" id="CoreProvidersMenu">
                    <button :data-test-id="'CoreProvidersMenu-' + index + '-button'" class="fs-5 accordion-button bg-light text-primary collapsed border-primary" type="button" data-bs-toggle="collapse" :data-bs-target="'#coreProvidersCollapse-' + index" aria-expanded="false" :aria-controls="'coreProvidersCollapse-' + index">
                    <img :data-test-id="'coreProvidersOne-image'" v-if="provider.image != null" class="flex-auto d-lg-block" style="object-fit: contain; max-height: 40px;" :src="provider.image">
                    <label class="ms-4"> {{provider.name}} </label>
                    </button>
                </h2>
                <div :id="'coreProvidersCollapse-' + index"  class="accordion-collapse bg-light text-white collapse text-center" :aria-labelledby="'CoreProvidersBody' + index" data-bs-parent="#coreProvidersAccordion">
                    <div class="accordion-body"> {{provider.description}} </div>
                    <a class="mb-3 fs-6 btn btn-info bg-info text-dark" type="button" :href="provider.url" target="_blank"> {{index == providers.length - 1? 'Contact us' : 'Contact them'}} </a>
                </div>
            </div>
        </div>
    </div>
</div>
</template>