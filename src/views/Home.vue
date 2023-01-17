<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'

</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main">
            <div class="container">
                <div id="home-welcome" class="row">
                    <div class="col-12">
                        <nav id="home-navbar-scrollspy" class="">
                          <nav class="nav nav-pills justify-content-md-end fs-5">
                            <a class="nav-link" href="#home-welcome">Welcome</a>
                            <a class="nav-link" href="#home-how-whom">For whom OM is</a>
                            <a class="nav-link" href="#home-tools">Who makes OM</a>
                            <a class="nav-link" href="#home-roadmap">Nearby Roadmap</a>
                          </nav>
                        </nav>
                    </div>
                </div>
                <div id="home-welcome" class="row pb-5 pt-2 mx-1">
                    <div class="text-white my-1 py-4 offset-sm-0 offset-lg-2 col-sm-12 col-lg-8 text-center bg-light rounded-4">
                        <h1 class="">Welcome to OpenMagnetics!</h1>
                        <p class="fs-5">Open Magnetics (OM) is a set of online tools for designing and simulating magnetics components, based on public scientific research and knowledge, stemming from the idea that all scientific knowledge is a fundamental right and should be accessible to the whole human race.</p>
                        <p class="fs-5">OpenMagnetics is fully Open Source, which means that any code used in the models or calculations is available to the community, all data about shapes, materials, wires, stocks or properties will be downloadable. Any information about models, electromagnetism theory or design procedure will be there. And most importantly, anybody can contribute.</p>
                        <p class="fs-5">OpenMagnetics is and will always be free, not even requiring user registration. Even so, users that register will gain the opportunity to store their libraries in the server, for their private use or for sharing with the community.</p>
                    </div>
                </div>
                <div id="home-how-whom" class="row py-5 border-bottom border-top bg-light">
                    <div class="col-lg-4 text-center my-2">
                        <div class="card box-shadow bg-primary">
                            <div class="card-header bg-transparent">
                                <h2 class="text-dark"><i class="me-4 fa-brands fa-searchengin fa-1x text-secondary"></i>For Researchers<i class="ms-4 fa-solid fa-flask fa-1x text-secondary"></i></h2>
                            </div>

                            <div class="card-body" style="display: flex; justify-content: space-between; p-0 m-0">

                                <div class="text-left">
                                    <p class="text-dark text-start fs-5">You are working on improving Magnetics? OpenMagnetics is for you:</p>
                                    <ul class="text-dark text-start fs-5">
                                        <li class="">Compare your models against the state of the art.</li>
                                        <li class="">Have access to our cured datasets to create your own models.</li>
                                        <li class="">Your contribution is a place where it is used and not forgotten.</li>
                                        <li class="">Talk me data! Help creating a community based on validation, not on marketing.</li>
                                        <li class="">Have access to all our tools.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div class="col-lg-4 text-center my-2">
                        <div class="card box-shadow bg-info">
                            <div class="card-header bg-transparent">
                                <h2 class="text-dark"><i class="me-4 fa-solid fa-charging-station fa-1x text-primary"></i>For Designers<i class="ms-4 fa-solid fa-screwdriver-wrench fa-1x text-primary"></i></h2>
                            </div>

                            <div class="card-body" style="display: flex; justify-content: space-between; p-0 m-0">

                                <div class="text-left">
                                    <p class="text-dark fs-5">You are creating Magnetics? OpenMagnetics is for you:</p>
                                    <ul class="text-dark text-start fs-5">
                                        <li class="">Have access to the latests and most accurate models.</li>
                                        <li class="">All tools are accessible and all results can be exported without registration.</li>
                                        <li class="">No black magic, have access to the implementation of all the models and run them by yourself.</li>
                                        <li class="">Use our advanced automatic <a class="text-secondary" href="/simulation_core_adviser">advisers</a> to help you design your magnetic.</li>
                                        <li class="">Use, compare and access all properties from any commercially available part:</li>
                                        <ul class="text-dark text-start fs-5">
                                            <li class="">Magnetic cores and bobbins: Ferroxcube, TDK, Magnetics, Fair-Rite, Micrometals, etc.</li>
                                            <li class="">Wires: MWS Wire Industries, Rubadue, Elektrisola, New England Wire Technologies, etc.</li>
                                            <li class="">Or create your own library!</li>
                                        </ul>
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div class="col-lg-4 text-center my-2">
                        <div class="card box-shadow bg-secondary">
                            <div class="card-header bg-transparent">
                                <h2 class="text-white"><i class="me-4 fa-solid fa-pen-ruler fa-1x text-info"></i>For Manufacturers<i class="ms-4 fa-solid fa-industry fa-1x text-info"></i></h2>
                            </div>

                            <div class="card-body" style="display: flex; justify-content: space-between; p-0 m-0">

                                <div class="text-left">
                                    <p class="text-white fs-5">You are building Magnetics? OpenMagnetics is for you:</p>
                                    <ul class="text-white text-start fs-5">
                                        <li class="">Have access to data from all parts distributors.</li>
                                        <li class="">Have access to the best models to reduce iterations.</li>
                                        <li class="">Introduce your own stock and use let our advisers help you design something you can assembly today.</li>
                                        <li class="">Integrate your products in our Open Database, and let your users use them in our tools.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                <div id="home-tools" class="row py-5 mx-1">
                    <div class="text-white my-1 py-4 offset-sm-0 offset-lg-2 col-sm-12 col-lg-8 text-center bg-light rounded-4">
                        <h1>Tools and Roadmap</h1>
                        <p class="fs-5">OpenMagnetics is maintained and developed by volunteers, and we do it because we believe in what Open Source brings to the world. Each one of us makes their living by some other meaning and works on these in our free time, so there won't be any deadlines. Despite of that, we will do our best to make this tool as good as we are capable.</p>
                        <p class="fs-5">If you want to support this project, consider joining our <a href="https://discord.gg/PawVFmW6">Discord server</a> and let us know what you enjoy doing the most!.</p>
                    </div>
                </div>
                <div id="home-roadmap" class="row bg-light border-top">
                    <div class="col-lg-6 text-center ">
                        <h2 class="text-white my-5">What you can do right now</h2>
                        <ul class="text-white text-start fs-5">
                            <li class="mt-2"><a href="/operation_point">Introduce any waveform</a> (even by hand!) and get its harmonics, effective frequency, RMS and THD.</li>
                            <li class="mt-2"><a href="/core_shape_artisan">Customize any magnetic core</a> shape as you like, and get its effective parameters.</li>
                            <li class="mt-2"><a href="/core_gapping_artisan">Add gapping to your core</a>, distributed, spacer, grinded, in any column, at any position; and get its reluctance and storable energy.</li>
                            <li class="mt-2">Download the 3D model or technical drawing of your customized or commercial gapped core!</li>
                        </ul>
                    </div>
                    <div class="col-lg-6 text-center">
                        <h2 class="text-white my-5">What you'll be able to do soon</h2>
                        <ul class="text-white text-start fs-5">
                            <li class="">Calculate the inductance of any customized shape, material, number of turns, and gapping.</li>
                            <li class="">Calculate the number of turns needed to achieve your inductance in a given core.</li>
                            <li class="">Calculate the needed gap(s) in order to get the desired inductance in your magnetic.</li>
                            <li class="">Get the core losses of your core according to your favorite method, for a given excitation and ambient temperature.</li>
                            <li class="">Get the temperature rise for your core with everything else considered.</li>
                            <li class="">And many many more features, and <a href="/roadmap">you can help decide what to implement next.</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>
