<script setup>
import Header from '/src/components/Header.vue'
import Footer from '/src/components/Footer.vue'

</script>

<template>
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main p-0 m-0">
            <div class="container-fluid wrap px-0">
                <div class="container content">
                    <div id="home-welcome" class="row pt-2 mx-1 mt-5">
                        <div class="text-white my-1 mt-5 pt-4 pb-2 offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4">
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">The free open-source platform for magnetics design and simulation.</h1>
                        </div>
                        <div class="text-white offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4">
                            <h5 data-cy="Home-title-text" class="text-white fw-light">We believe that the access to knowledge and tools are a right, not a privilege, so we offer the best tools in the market for free, so the whole of humanity can benefit.</h5>
                        </div>
                    </div>
                    <div class="row my-2">
                        <div class="offset-2 col-8 d-flex justify-content-evenly">
                            <a href="https://github.com/OpenMagnetics/" target="_blank" rel="noopener noreferrer" class="btn text-dark bg-success border-dark mx-2">Give a star on Github! <i class="fa-brands fa-github"></i> </a>
                            <a href="/tool_selection" class="btn text-dark bg-primary border-dark mx-2">Start designing!<i class="ms-2 fa-solid fa-toolbox"></i> </a>
                            <a href="https://www.linkedin.com/company/openmagnetics" target="_blank" class="btn text-dark bg-info border-dark mx-2">Follow us on LinkedIn! <i class="fa-brands fa-linkedin"></i> </a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="container">
                <div class="row mb-1 mt-5">
                    <h3 class="text-white text-center my-2">What you can do right now</h3>
                </div>
                <div class="row mt-2 offset-2 col-8 mb-5">
                    <div class="container">
                        <div class="row ">
                            <div class="card p-0 col-lg col-sm-12 mt-3">
                                <div class="card-body">
                                    <i class="text-white fa-solid fa-wand-sparkles fa-2x mb-4"></i>
                                    <h5 class="card-title text-white"><a href="/tool_selection" class="text-primary">Magnetic Synthesis</a></h5>
                                    <p class="card-text text-white">Input your specifications, get a full manufacturable magnetic design. That simple.</p>
                                </div>
                            </div>
                            <div class="card p-0 mx-lg-3 mx-sm-0 col-lg col-sm-12 mt-3">
                                <div class="card-body">
                                    <i class="text-white fa-solid fa-bolt-lightning fa-2x mb-4"></i>
                                    <h5 class="card-title text-white"><a href="/tool_selection" class="text-primary">Calculate insulation</a></h5>
                                    <p class="card-text text-white">Get the insulation coodination needed to comply with IEC 60664, IEC 62368, IEC 61558, and IEC 60335.</p>
                                </div>
                            </div>
                            <div class="card p-0 col-lg col-sm-12 mt-3">
                                <div class="card-body">
                                    <i class="text-white fa-solid fa-cart-shopping fa-2x mb-4"></i>
                                    <h5 class="card-title text-white"><a href="/tool_selection" class="text-primary">Find COTS Core</a></h5>
                                    <p class="card-text text-white">Find the in-stock COTS core perfect for your application, along with the number of turns, core losses, and the link to buy it right now!</p>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="card p-0 col-lg col-sm-12 mt-3">
                                <div class="card-body">
                                    <i class="text-white fa-solid fa-wave-square fa-2x mb-4"></i>
                                    <h5 class="card-title text-white"><a href="/operation_point" class="text-primary">Process waveforms</a></h5>
                                    <p class="card-text text-white">Introduce any waveform (even by hand!) and get its harmonics, effective frequency, RMS and THD.</p>
                                </div>
                            </div>
                            <div class="card p-0 mx-lg-3 mx-sm-0 col-lg col-sm-12 mt-3">
                                <div class="card-body">
                                    <i class="text-white fa-solid fa-magnet fa-2x mb-4"></i>
                                    <h5 class="card-title text-white"><a href="/core_shape_artisan" class="text-primary">Customize core</a></h5>
                                    <p class="card-text text-white">Customize any magnetic core shape as you like, and get its effective parameters.</p>
                                </div>
                            </div>
                            <div class="card p-0 col-lg col-sm-12 mt-3">
                                <div class="card-body">
                                    <i class="text-white fa-solid fa-arrows-left-right-to-line fa-2x mb-4"></i>
                                    <h5 class="card-title text-white"><a href="/core_gapping_artisan" class="text-primary">Customize gapping</a></h5>
                                    <p class="card-text text-white">Add gapping to your core, distributed, spacer, ground, in any column, at any position; and get its reluctance and storable energy.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="home-roadmap" class="row mx-1 mb-4 mt-5">
                    <div class="offset-sm-0 col-sm-12 offset-lg-2 col-lg-8 bg-light text-center  rounded-4">
                        <h3 class="text-white my-2">What you'll be able to do soon</h3>
                        <ul class="text-white text-start fs-5">
                            <li class="">Cross reference any magnetic core and find a in-stock replacement.</li>
                            <li class="">Cross reference any wire and find a in-stock replacement.</li>
                            <li class="">Analyze in magnetic in your browser and find its core and winding losses, leakage inductance, capacitance, etc. with accuracy equivalent to 3D FEA.</li>
                            <li class="">Customize your magnetic as you want: Custom core shape, custom gapping, custom wire, custom bobbin, custom coil.</li>
                        </ul>
                    </div>
                </div>
                <h2>
                    <div id="home-how-whom" class="row pb-5 pt-3 border-bottom border-top bg-light text-center">
                        <h2 class="text-white mb-3">OpenMagnetics is for everyone</h2>
                        <div class="col-lg-4 text-center my-2">
                            <div class="card box-shadow bg-dark">
                                <div class="card-header bg-transparent">
                                    <h3 class="text-white"><i class="me-4 fa-brands fa-searchengin fa-1x text-secondary"></i>For Researchers<i class="ms-4 fa-solid fa-flask fa-1x text-secondary"></i></h3>
                                </div>

                                <div class="card-body" style="display: flex; justify-content: space-between; p-0 m-0">

                                    <div class="text-left">
                                        <p class="text-white text-start fs-5">You are working on improving Magnetics? OpenMagnetics is for you:</p>
                                        <ul class="text-white text-start fs-5">
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
                            <div class="card box-shadow bg-dark">
                                <div class="card-header bg-transparent">
                                    <h3 class="text-white"><i class="me-4 fa-solid fa-charging-station fa-1x text-primary"></i>For Designers<i class="ms-4 fa-solid fa-screwdriver-wrench fa-1x text-primary"></i></h3>
                                </div>

                                <div class="card-body" style="display: flex; justify-content: space-between; p-0 m-0">

                                    <div class="text-left">
                                        <p class="text-white fs-5">You are creating Magnetics? OpenMagnetics is for you:</p>
                                        <ul class="text-white text-start fs-5">
                                            <li class="">Have access to the latests and most accurate models.</li>
                                            <li class="">All tools are accessible and all results can be exported without registration.</li>
                                            <li class="">No black magic, have access to the implementation of all the models and run them by yourself.</li>
                                            <li class="">Use our advanced automatic <a class="text-secondary" href="/simulation_core_adviser">advisers</a> to help you design your magnetic.</li>
                                            <li class="">Use, compare and access all properties from any commercially available part:</li>
                                            <ul class="text-white text-start fs-5">
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
                            <div class="card box-shadow bg-dark">
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