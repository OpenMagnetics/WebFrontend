<script>
export default {
    props: {
        dataTestLabel: {
            type: String,
            default: '',
        },
        acSweepSelected: {
            type: Boolean,
            default: false,
        },
    },
}
</script>

<template>
    <div class="d-flex flex-column p-0 m-0">
        <main role="main" class="main p-0 m-0">
            <div class="container-fluid wrap px-0">
                <div class="container content">
                    <div id="home-welcome" class="row pt-2 mx-1">
                        <div class="my-1 pt-4 pb-2 offset-sm-2 offset-lg-3 col-sm-8 col-lg-6 text-center rounded-4" :style="$styleStore.toolSelector.main">
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">We have everything you need!</h1>
                            <h1 data-cy="Home-title-text" class=" fw-bolder fs-1">What do you want to do with your specifications?</h1>
                        </div>
                    </div>
            <div class="container">
                <div class="row">
                    <div class="my-2 p-2 text-start col-12 rounded-4 row">
                        <h5
                            :style="$styleStore.toolSelector.explanation"
                            :data-cy="dataTestLabel + '-magnetic-magneticBuilder-explanation'"
                            class="col-6 col-md-9 py-3"
                        >
                            {{'I need a full magnetic design, but I know what I want and I want to build it myself and get the simulated behavior.'}}
                        </h5>
                        <button
                            :style="$styleStore.toolSelector.promotedButton"
                            :data-cy="dataTestLabel + '-magnetic-builder-button'"
                            class="fs-5 col-6 col-md-3 py-4 btn btn-danger"
                            @click="$emit('toolSelected', 'magneticBuilder')"
                        >
                            {{'I want build my own magnetic'}} <i class="fa-solid fa-rocket"></i>
                        </button>
                    </div>
                    <div class="my-2 p-2 text-start col-12 rounded-4 row">
                        <h5
                            :style="$styleStore.toolSelector.explanation"
                            :data-cy="dataTestLabel + '-magnetic-specifications-explanation'"
                            class="col-6 col-md-9 py-3"
                        >
                            {{'I want to get a PDF report with my specifications, so I can send it to manufacturers and get a quotation.'}}
                        </h5>
                        <button
                            :style="$styleStore.toolSelector.button"
                            :disabled="acSweepSelected"
                            :data-cy="dataTestLabel + '-magnetic-Report-button'"
                            class="col-6 col-md-3 fs-5 py-4 btn btn-primary px-xs-0 px-sm-0 px-md-2"
                            @click="$emit('toolSelected', 'magneticSpecificationsReport')"
                        >
                            {{acSweepSelected? 'Not available with AC Sweep' : 'I want to download a report'}}
                        </button>
                    </div>
                    <div class="my-2 p-2 text-start col-12 rounded-4 row">
                        <h5
                            :style="$styleStore.toolSelector.explanation"
                            :data-cy="dataTestLabel + '-magnetic-MagneticAdviser-explanation'"
                            class="col-6 col-md-9 py-3"
                        >
                            {{'I am looking for some Commercial Off-The-Shelf cores for my component, especially if they are in stock and I can order them right now.'}}
                        </h5>
                        <button
                            :style="$styleStore.toolSelector.button"
                            :disabled="acSweepSelected"
                            :data-cy="dataTestLabel + '-magnetic-core-adviser-button'"
                            class="fs-5 col-6 col-md-3 py-4 btn btn-primary"
                            @click="$emit('toolSelected', 'magneticCoreAdviser')"
                        >
                            {{acSweepSelected? 'Not available with AC Sweep' : 'Recommend me some COTS cores'}}
                        </button>
                    </div>
                    <div class="my-2 p-2 text-start col-12 rounded-4 row">
                        <h5
                            :style="$styleStore.toolSelector.explanation"
                            :data-cy="dataTestLabel + '-magnetic-specifications-explanation'"
                            class="col-6 col-md-9 py-3"
                        >
                            {{'I am looking for a full magnetic design, but I am not sure what I need, so I would like to look at several options.'}}
                        </h5>
                        <button
                            :style="$styleStore.toolSelector.button"
                            :disabled="acSweepSelected"
                            :data-cy="dataTestLabel + '-magnetic-adviser-button'"
                            class="fs-5 col-6 col-md-3 py-4 btn btn-primary"
                            @click="$emit('toolSelected', 'magneticAdviser')"
                        >
                            {{acSweepSelected? 'Not available with AC Sweep' : 'Advise me some magnetic designs'}}
                        </button>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </main>
    </div>
</template>
