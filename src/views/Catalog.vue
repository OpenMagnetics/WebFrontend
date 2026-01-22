<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
import { toTitleCase } from '/WebSharedComponents/assets/js/utils.js'
import { useCatalogStore } from '../stores/catalog'

import Catalog from '../components/Toolbox/Catalog.vue'

</script>

<script>
export default {
    data() {
        const catalogStore = useCatalogStore();
        catalogStore.catalogUrl = "/cmcs.ndjson"
        catalogStore.catalogCoreMaterialDatabase = "/core_materials.ndjson"
        catalogStore.catalogCoreShapeDatabase = "/core_shapes.ndjson"
        catalogStore.catalogWireDatabase = "/wires.ndjson"

        fetch(catalogStore.catalogCoreMaterialDatabase)
        .then((data) => data.text())
        .then((data) => {
            this.catalogString = data;
        })
        .catch((error) => {
            console.error('Failed to fetch catalog core material database:', error);
        })

        return {
            catalogStore,
        }
    },
}
</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main p-0 m-0">
            <Catalog
                class="container content pt-2"
                :catalogInput="catalogStore.catalogUrl"
                :name="'Test Catalog'"
                :dataTestLabel="'Catalog'"
            />
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>

<style>
    .wrap {
      position: relative;
    }

    .wrap:before {
      content: ' ';
      display: block;
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 1;
      background-image: linear-gradient(to bottom, rgba(26, 26, 26, 0.8), rgba(26, 26, 26, 1)),
    url('/images/background_home.png');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
    }

    .content {
      position: relative;
    }
</style>