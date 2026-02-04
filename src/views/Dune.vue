<script setup>
import Header from '../components/Header.vue'
import Footer from '../components/Footer.vue'
// import CreateOrContinueModal from '../components/Toolbox/CreateOrContinueModal.vue'
import { useMasStore } from '../stores/mas'
// import Module from '../assets/js/spice.js'

import { isComplex, ResultArrayType, SimArray } from "../sim/simulationArray";

</script>
<script>

// var ngspice = {
//     ready: new Promise(resolve => {
//         Module({
//             onRuntimeInitialized () {

//                 this.FS.writeFile("/spinit", "* Standard ngspice init file\n");
//                 this.FS.writeFile("/proc/meminfo", "");
//                 ngspice = Object.assign(this, {
//                     ready: Promise.resolve()
//                 });
//                 resolve();
//             }
//         });
//     })
// };
let sim;
let progress = 0;
let threadCount = 1;
let threadCountNew = 1;
let initialSimInfo = "";
let info = "";
let isSimRunning = false;
let isSimLoaded = false;
let resultArray = new ResultArrayType();
let netList = `Ea
v1 1 0 1 pwl(0 0 .01ms 0 .02ms 1)
r1 1 2 1
a1 (2 0) (3 0) induct1
.model induct1 lcouple(num_turns=100)
a2 (3 0) iron_core
.model iron_core core (H_array = [-2000 -1000 0 1000 2000] B_array = [-.1 -.1 0 .1 .1] area = 0.00008 length = 0.04)
.save all @r1[i]
.control
tran .01m 2m
plot @r1[i]
.endc
.end`;

// const simProgressCallback = React.useCallback((n: number) => {
// setProgress(n);
// console.log(n);
// }, []);

const btRun = async () => {
    if (sim && threadCount === threadCountNew) {
        isSimRunning = true;
        //setParser(getParser(netList));
        // store.setItem("netList", netList);
        // netList = ""

        sim.setNetList(netList);
        resultArray = await sim.runSim();
        info = initialSimInfo + "\n\n" + (await sim.getInfo()) + "\n\n";
        isSimRunning = false;
    } 
    else {
        //spawn worker thread
        sim = new SimArray();
        threadCount = threadCountNew;
        await sim.init(threadCount);
        initialSimInfo = await sim.getInitInfo();
        // sim.progressCallback = simProgressCallback;
        isSimLoaded = true;
        progress = 0;
        //initialSimInfo = await sim.getInfo(); //not yet working???????
        btRun();
    }
};

export default {

    data() {
        return {
        }
    },
    methods: {
    },
    mounted() {
        // ngspice.ready.then(_ => {
        //     // console.log('Starting Execution Time Loading');
        //     // console.log(ngspice);
        //     // ngspice.FS.writeFile("/modelcard.FreePDK45", freePDK45.PDK45);
        //     // ngspice.FS.writeFile("/modelcard.PDK15", freePDK45.PDK15);
        //     // ngspice.FS.writeFile("/modelcard.ptmLP", ptm.ptmLP);
        //     // ngspice.FS.writeFile("/modelcard.ptmHP", ptm.ptmHP);
        //     // ngspice.FS.writeFile("/modelcard.ptm", ptm.ptm);
        //     // ngspice.FS.writeFile("/modelcard.skywater", skyWater.models);
        //     // ngspice.FS.writeFile("/modelcard.CMOS90", circuits.strModelCMOS90);
        //     // console.time('Execution Time Loading');
        //     // coreAdviser.clear_loaded_cores();
        //     // coreAdviser.load_cores(false, true);
        //     // console.timeEnd('Execution Time Loading');
        // });
        btRun();
    },
}
</script>

<template>
    <!-- <CreateOrContinueModal @onCreate="onCreate()" @onContinue="onContinue()"/> -->
    <div class="d-flex flex-column min-vh-100">
        <Header />
        <main role="main" class="main p-0 m-0">
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
      background-image: linear-gradient(to bottom, rgba(26, 26, 26, 0.7), rgba(26, 26, 26, 1)),
    url('/images/background_toolbox.jpg');
      background-repeat: no-repeat;
      background-position: 50% 0;
      background-size: cover;
    }

    .content {
      position: relative;
    }
</style>
