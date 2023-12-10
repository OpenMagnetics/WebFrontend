<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'

</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main">
            <div class="container">
                <div id="home-welcome" class="row pb-5 pt-2 mx-1 my-5">
                    <div class="text-white my-1 py-4 offset-sm-0 offset-lg-1 col-sm-12 col-lg-10 text-center bg-light rounded-4">
                        <h1 data-cy="Home-title-text" class="">Welcome to OpenMagnetics!</h1>
                        <h2 >The Free Open-Source platform for Magnetics</h2>
                    </div>
                </div>
                <div id="home-roadmap" class="row mx-1 mb-4">
                    <div class="offset-sm-0 col-sm-12 offset-lg-2 col-lg-8 bg-info text-center  rounded-4">
                        <h3 class="text-dark my-2">What you can do right now</h3>
                        <ul class="text-light text-start fs-5">
                            <li class="mt-2"><a href="/tool_selection" class="text-secondary">Specify a magnetic design</a> and download the report in MAS or PDF format.</li>
                            <li class="mt-2"><a href="/tool_selection" class="text-secondary">Calculate the insulation</a> needed to comply with a given requirements according to IEC 60664 and/or IEC 62368.</li>
                            <li class="mt-2"><a href="/tool_selection" class="text-secondary">Find the in-stock COTS core</a> perfect for your application, along with the number of turns, core losses, and the link to buy it right now!</li>
                            <li class="mt-2"><a href="/operation_point" class="text-secondary">Introduce any waveform</a> (even by hand!) and get its harmonics, effective frequency, RMS and THD.</li>
                            <li class="mt-2"><a href="/core_shape_artisan" class="text-secondary">Customize any magnetic core</a> shape as you like, and get its effective parameters.</li>
                            <li class="mt-2"><a href="/core_gapping_artisan" class="text-secondary">Add gapping to your core</a>, distributed, spacer, grinded, in any column, at any position; and get its reluctance and storable energy.</li>
                            <li class="mt-2">Download the 3D model or technical drawing of your customized or commercial gapped core!</li>
                        </ul>
                    </div>
                </div>
                <div id="home-roadmap" class="row mx-1 mb-4">
                    <div class="offset-sm-0 col-sm-12 offset-lg-2 col-lg-8 bg-light text-center  rounded-4">
                        <h3 class="text-white my-2">What you'll be able to do soon</h3>
                        <ul class="text-white text-start fs-5">
                            <li class="">Synthesize a full magnetic component directly from a given specifications.</li>
                            <li class="">Cross reference any magnetic core and find a in-stock replacement.</li>
                            <li class="">Cross reference any wire and find a in-stock replacement.</li>
                            <li class="">Analyze in magnetic in your browser and find its core and winding losses, leakage inductance, capacitance, etc. with accuracy equivalent to 3D FEA.</li>
                            <li class="">Customize your magnetic as you want: Custom core shape, custom gapping, custom wire, custom bobbin, custom coil.</li>
                        </ul>
                    </div>
                </div>
                <h2>
                    <div id="home-how-whom" class="row pb-5 pt-3 border-bottom border-top bg-light text-center">
                        <h2 class="text-white">OpenMagnetics is for everyone</h2>
                        <div class="col-lg-4 text-center my-2">
                            <div class="card box-shadow bg-primary">
                                <div class="card-header bg-transparent">
                                    <h3 class="text-dark"><i class="me-4 fa-brands fa-searchengin fa-1x text-secondary"></i>For Researchers<i class="ms-4 fa-solid fa-flask fa-1x text-secondary"></i></h3>
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
                                    <h3 class="text-dark"><i class="me-4 fa-solid fa-charging-station fa-1x text-primary"></i>For Designers<i class="ms-4 fa-solid fa-screwdriver-wrench fa-1x text-primary"></i></h3>
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
                                    <h3 class="text-white"><i class="me-4 fa-solid fa-pen-ruler fa-1x text-info"></i>For Manufacturers<i class="ms-4 fa-solid fa-industry fa-1x text-info"></i></h3>
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
                </h2>
                <h2>
                    <div id="home-tools" class="row py-5 mx-1">
                        <div class="text-white my-1 py-4 offset-sm-0 offset-lg-2 col-sm-12 col-lg-8 text-center bg-light rounded-4">
                            <h3>Tools and Roadmap</h3>
                            <p class="fs-5">OpenMagnetics is maintained and developed by volunteers, and we do it because we believe in what Open Source brings to the world. Each one of us makes their living by some other meaning and works on these in our free time, so there won't be any deadlines. Despite of that, we will do our best to make this tool as good as we are capable.</p>
                            <p class="fs-5">If you want to support this project, consider joining our <a href="https://discord.gg/ADKTnYhXDU" target="_blank" rel="noopener noreferrer">Discord server</a> and let us know what you enjoy doing the most!.</p>
                        </div>
                    </div>
                </h2>
            </div>
        </main>
        <Footer class="mt-auto"/>
    </div>
</template>
