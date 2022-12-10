<script setup >
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'
import UserInventory from '/src/components/User/UserInventory.vue'

</script>


<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <UserInventory />
        <Footer class="mt-auto"/>
    </div>
</template>
