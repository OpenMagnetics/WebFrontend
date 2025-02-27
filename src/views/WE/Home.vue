<script setup>
import Header from '../../components/WE/Header.vue'
import { useCatalogStore } from '../../stores/catalog'

</script>

<script>

export default {
    components: {
    },
    data() {
        const catalogStore = useCatalogStore();
        return {
            catalogStore
        }
    },
    methods: {
    },
    computed: {
        onCatalogAdviser() {
            const catalogStore = useCatalogStore();
            catalogStore.resetCatalog();
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("catalog");
            this.$stateStore.selectTool("catalogAdviser");
            this.$stateStore.selectApplication(this.$stateStore.SupportedApplications.CommonModeChoke);

            if (this.$route.name != 'WECatalogTool')
                setTimeout(() => {this.$router.push('/we_catalog_tool');}, 100);
            else
                setTimeout(() => {this.$router.push('/we_engine_loader');}, 100);
        },
        newMagneticToolDesign() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            if (this.$route.name != 'MagneticTool')
                setTimeout(() => {this.$router.push('/magnetic_tool');}, 100);
            else
                setTimeout(() => {this.$router.go();}, 100);
        },
        newMagneticToolDesignNewTab() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("design");
            this.$stateStore.selectTool("agnosticTool");
            const routeData = this.$router.resolve({name: 'MagneticTool'});
            window.open(routeData.href, '_blank');
        },
        onInsulationCoordinator() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("insulationCoordinator");
            this.$stateStore.selectTool("insulationAdviser");

            if (this.$route.name != 'InsulationAdviser')
                setTimeout(() => {this.$router.push('/insulation_adviser');}, 100);
            else
                setTimeout(() => {this.$router.go();}, 100);
        },
        onInsulationCoordinatorNewTab() {
            this.$stateStore.resetMagneticTool();
            this.$stateStore.selectWorkflow("insulationCoordinator");
            this.$stateStore.selectTool("insulationAdviser");
            const routeData = this.$router.resolve({name: 'InsulationAdviser'});
            window.open(routeData.href, '_blank');
        },
    },
    created() {
    },
    mounted() {
    }
}
</script>
<template>
    <div class="d-flex flex-column min-vh-100 bg-white">
        <Header />
        <main role="main" class="main p-0 m-0">
            <div class="container-fluid wrap px-0">
                <div class="container content">
                    <div id="home-welcome" class="row pt-2 mx-1 mt-5">
                        <div class="text-black my-1 mt-5 pt-4 pb-2 offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4">
                            <h1 data-cy="Home-title-text" class="fs-1" style="font-family: Impact;">EL CHOCKER</h1>
                        </div>
                        <div class="text-black offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4">
                            <h5 data-cy="Home-title-text" class="text-black fw-light fs-3">Next generation CMC selector and designer. Try it!</h5>
                        </div>
                    </div>
                    <div class="row my-2">
                        <div class="offset-lg-2 col-8 d-flex justify-content-evenly">
                            <button
                                data-cy="Header-catalog-adviser-link"
                                :class="'mx-1' "
                                class="btn text-dark bg-primary border-dark mx-2 fs-3 my-5 "
                                @click="onCatalogAdviser"
                            >
                                <i class="me-2 fa-solid fa-filter"></i>{{'El Choker'}}
                            </button>
                        </div>
                    </div>
                    <div class="text-black offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4 mt-5 fs-6">
                        <h5 data-cy="Home-title-text" class="text-black fw-light">This a beta test, any recommendation done by the software must be double checked by an engineer</h5>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style>
    .wrap {
      position: relative;
    }

    .content {
      position: relative;
    }
</style>
