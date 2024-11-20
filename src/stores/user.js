import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'

export const useUserStore = defineStore("user", () => {

    const magneticSpecificationsReportSubsection = ref("designRequirements");
    const magneticSpecificationsReportCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'magneticSpecificationsSummary': false,
    })

    const magneticAdviserSubsection = ref("designRequirements");
    const magneticAdviserCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'magneticAdviser': false,
        'magneticBuilder': false,
        'magneticSummary': false,
    })

    const magneticBuilderSubsection = ref("designRequirements");
    const magneticBuilderCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'magneticBuilder': false,
        'magneticSummary': false,
    })

    const magneticCoreAdviserSubsection = ref("designRequirements");
    const magneticCoreAdviserCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'magneticCoreAdviser': false,
        'magneticCoreSummary': false,
    })

    const magneticToolSubsection = ref("welcome");
    const magneticToolCanContinue = ref({
        'welcome': true,
        'designRequirements': false,
        'operatingPoints': false,
        'toolSelector': false,
    });


    const filterMagneticAdviserSubsection = ref("filterDesignRequirements");
    const filterMagneticAdviserCanContinue = ref({
        'filterDesignRequirements': false,
        'operatingPoints': false,
        'magneticAdviser': false,
        'magneticBuilder': false,
        'magneticSummary': false,
    })

    const filterMagneticBuilderSubsection = ref("filterDesignRequirements");
    const filterMagneticBuilderCanContinue = ref({
        'filterDesignRequirements': false,
        'operatingPoints': false,
        'magneticBuilder': false,
        'magneticSummary': false,
    })

    const magneticSelectedTool = ref("magneticTool");
    const filterMagneticSelectedTool = ref("magneticTool");
    const anyDesignLoaded = ref(false);
    const showWelcome = ref(true);
    const magneticCoreAdviserSelectedAdvise = ref(0);
    const magneticAdviserSelectedAdvise = ref(0);
    const wire2DVisualizerPlotCurrentDensity = ref(0);
    const wire2DVisualizerPlotCurrentViews = ref({});
    const wire2DVisualizerShowAnyway = ref(false);
    const magnetic2DVisualizerPlotCurrentView = ref(null);
    const magnetic2DVisualizerPlotMagneticField = ref(0);
    const magnetic2DVisualizerPlotFringingField = ref(1);

    const insulationAdviserSubsection = ref("insulationRequirements")
    const insulationAdviserCanContinue = ref({
        'insulationRequirements': false
    })

    function isAnyDesignLoaded() {
        return this.anyDesignLoaded;
    }

    function designLoaded() {
        this.anyDesignLoaded = true;
    }

    function resetMagneticTool() {
        this.anyDesignLoaded = false;
        this.magneticSelectedTool = "magneticTool";
        this.filterMagneticSelectedTool = "magneticTool";
        this.magneticToolSubsection = "welcome";
        this.magneticSpecificationsReportSubsection = "designRequirements";
        this.magneticAdviserSubsection = "designRequirements";
        this.magneticBuilderSubsection = "designRequirements";
        this.magneticCoreAdviserSubsection = "designRequirements";
        this.magneticToolCanContinue = {
            'welcome': true,
            'designRequirements': false,
            'operatingPoints': false,
            'toolSelector': false,
        };

        this.magneticSpecificationsReportCanContinue = {
            'designRequirements': false,
            'operatingPoints': false,
            'magneticSpecificationsSummary': false,
        };
    
        this.magneticCoreAdviserCanContinue = {
            'designRequirements': false,
            'operatingPoints': false,
            'magneticCoreAdviser': false,
            'magneticSummary': false,
        };
    
        this.magneticAdviserCanContinue = {
            'designRequirements': false,
            'operatingPoints': false,
            'magneticBuilder': false,
            'magneticAdviser': false,
            'magneticSummary': false,
        };
    
        this.magneticBuilderCanContinue = {
            'designRequirements': false,
            'operatingPoints': false,
            'magneticBuilder': false,
            'magneticCoreSummary': false,
        };
    
        this.filterMagneticAdviserCanContinue = {
            'filterDesignRequirements': false,
            'operatingPoints': false,
            'magneticBuilder': false,
            'magneticAdviser': false,
            'magneticSummary': false,
        };
    
        this.filterMagneticBuilderCanContinue = {
            'filterDesignRequirements': false,
            'operatingPoints': false,
            'magneticBuilder': false,
            'magneticCoreSummary': false,
        };

    }




    const loggedIn = ref(false)
    const ipAddress = ref(0)
    const username = ref(null)
    const readNotifications = ref([])
    const idToDelete = ref(null)
    const userSubsection = ref("operationPoints")

    const simulationUseCurrentAsInput = ref(1)
    const selectedModels = ref({
        gapReluctance: Defaults.reluctanceModelDefault,
        coreLosses: Defaults.coreLossesModelDefault,
        coreTemperature: Defaults.coreTemperatureModelDefault,
    })
    const isLoggedIn = computed(() => {
        return loggedIn
    })
    const getUsername = computed(() => {
        return username
    })
    const getUserSubsection = computed(() => {
        return userSubsection
    })
    const getIdToDelete = computed(() => {
        return idToDelete
    })

    const dump = computed(() => {
        return {
            "magneticSynthesisSubsection": magneticSynthesisSubsection.value,
            "magneticCoreAdviserSelectedAdvise": magneticCoreAdviserSelectedAdvise.value,
            "magneticAdviserSelectedAdvise": magneticAdviserSelectedAdvise.value,



            "loggedIn": loggedIn.value,
            "ipAddress": ipAddress.value,
            "username": username.value,
            "readNotifications": readNotifications.value,
            "globalOperationPoint": globalOperationPoint.value,
            "globalCore": globalCore.value,
            "userSubsection": userSubsection.value,
            "coreSubsection": coreSubsection.value,
            "coreSimulationSubsection": coreSimulationSubsection.value,
            "simulationCoreCalculatorSubsection": simulationCoreCalculatorSubsection.value,
            "simulationUseCurrentAsInput": simulationUseCurrentAsInput.value,
            "selectedModels": selectedModels.value,
        }
    })



    function reset() {

        this.loggedIn = false
        this.username = null
        this.idToDelete = null
        this.userSubsection = "operationPoints"
        this.wire2DVisualizerPlotCurrentDensity = 0;
        this.magnetic2DVisualizerPlotMagneticField = 0;
        this.magnetic2DVisualizerPlotFringingField = 1;
        this.wire2DVisualizerPlotCurrentViews = {};
        this.magnetic2DVisualizerPlotCurrentView = null;

        this.readNotifications = []
        this.loggedIn = false
        this.ipAddress = 0
        this.username = null
        this.idToDelete = null
        this.simulationUseCurrentAsInput = 1
        this.selectedModels = {
            gapReluctance: Defaults.reluctanceModelDefault,
            coreLosses: Defaults.coreLossesModelDefault,
            coreTemperature: Defaults.coreTemperatureModelDefault,
        }
    }

    function setUsername(username) {
        this.username = username
    }
    function setUserSubsection(userSubsection) {
        this.userSubsection = userSubsection
    }
    function setCoreSubsection(coreSubsection) {
        this.coreSubsection = coreSubsection
    }
    function setCoreSimulationSubsection(coreSimulationSubsection) {
        this.coreSimulationSubsection = coreSimulationSubsection
    }
    function login() {
        this.loggedIn = true
    }
    function logout() {
        this.loggedIn = false
    }
    function setIdToDelete(idToDelete) {
        this.idToDelete = idToDelete
    }
    function setSelectedModels(variable, model) {
        this.selectedModels[variable] = model
    }
    function setSimulationUseCurrentAsInput(simulationUseCurrentAsInput) {
        this.simulationUseCurrentAsInput = simulationUseCurrentAsInput
    }
    function armDeadManSwitch() {
    }
    function disarmDeadManSwitch() {
    }
    return {
        magneticSelectedTool,
        filterMagneticSelectedTool,
        showWelcome,
        magneticCoreAdviserSelectedAdvise,
        magneticAdviserSelectedAdvise,
        magneticToolSubsection,
        magneticToolCanContinue,
        magneticSpecificationsReportCanContinue,
        magneticCoreAdviserCanContinue,
        magneticCoreAdviserSubsection,
        magneticAdviserCanContinue,
        magneticBuilderCanContinue,
        magneticAdviserSubsection,
        magneticBuilderSubsection,
        magneticSpecificationsReportSubsection,
        filterMagneticAdviserSubsection,
        filterMagneticAdviserCanContinue,
        filterMagneticBuilderSubsection,
        filterMagneticBuilderCanContinue,

        insulationAdviserSubsection,
        insulationAdviserCanContinue,
        resetMagneticTool,
        isAnyDesignLoaded,
        designLoaded,
        anyDesignLoaded,

        wire2DVisualizerPlotCurrentDensity,
        wire2DVisualizerPlotCurrentViews,
        wire2DVisualizerShowAnyway,
        magnetic2DVisualizerPlotCurrentView,
        magnetic2DVisualizerPlotMagneticField,
        magnetic2DVisualizerPlotFringingField,


        dump,
        armDeadManSwitch,
        disarmDeadManSwitch,
        loggedIn,
        ipAddress,
        username,
        readNotifications,
        isLoggedIn,
        getUsername,
        setUsername,
        login,
        logout,
        userSubsection,
        getUserSubsection,
        setUserSubsection,

        simulationUseCurrentAsInput,
        setSimulationUseCurrentAsInput,

        idToDelete,
        getIdToDelete,
        setIdToDelete,
        setSelectedModels,
        selectedModels,
        reset,
    }
},
{
    persist: true,
})
