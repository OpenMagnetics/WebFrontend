<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'

</script>

<template>
    <Header />
    <main role="main">
        <div class="container marketing">
            <div class="row">
                <div class="col-lg-1">
                </div>
                <div class="col-lg-10 text-center">
                    <h2 class="text-white my-5">These Are Not the Droids You Are Looking For</h2>
                    <i class="fa-solid fa-user-ninja fa-9x bd-placeholder-img rounded-circle text-primary" width="140" height="140" xmlns="http://www.w3.org/2000/svg" role="img" focusable="false"></i>
                    <p class="text-white my-5">We are in stealth mode, but if you cannot restrain your curiosity, you can contact us at</p>
                    <h2 class="lead"><a href="mailto:openmagnetics@protonmail.com" class="text-primary">openmagnetics@protonmail.com</a> </h2>
                </div>
                <div class="col-lg-1">
                </div>
            </div>
        </div>
    </main>
    <Footer />
</template>
