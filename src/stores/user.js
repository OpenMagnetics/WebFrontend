import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import * as Utils from '/src/assets/js/utils.js'
import * as Defaults from '/src/assets/js/defaults.js'

export const useUserStore = defineStore("user", () => {

    const magneticSynthesisSubsection = ref("designRequirements")
    const magneticSynthesisCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'coreAdviser': false,
        'coreSimulation': false,
        'coreCustomization': false,
        'wireAdviser': false,
        'wireCustomization': false,
        'coilAdviser': false,
        'magneticFinalizer': false,
    })

    const magneticSpecificationSubsection = ref("designRequirements")
    const magneticSpecificationCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'magneticFinalizer': false,
    })

    const magneticAdviserSubsection = ref("designRequirements")
    const magneticAdviserCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'magneticAdviser': false,
        'magneticFinalizer': false,
    })

    const magneticBuilderSubsection = ref("designRequirements")
    const magneticBuilderCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'magneticBuilder': false,
        'magneticFinalizer': false,
    })

    const magneticCoreAdviserSubsection = ref("designRequirements")
    const magneticCoreAdviserCanContinue = ref({
        'designRequirements': false,
        'operatingPoints': false,
        'coreAdviser': false,
        'magneticFinalizer': false,
    })
    const coreAdviserSelectedAdvise = ref(0)
    const magneticAdviserSelectedAdvise = ref(0)
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

    function resetMagneticSpecification() {
        this.magneticSpecificationSubsection = "designRequirements";
        this.magneticSpecificationCanContinue = {
            'designRequirements': false,
            'operatingPoints': false,
            'magneticFinalizer': false,
        };
    }

    function resetMagneticCoreAdviser() {
        this.magneticCoreAdviserSubsection = "designRequirements";
        this.magneticCoreAdviserCanContinue = {
            'designRequirements': false,
            'operatingPoints': false,
            'coreAdviser': false,
            'magneticFinalizer': false,
        };
    }

    function resetMagneticAdviser() {
        this.magneticAdviserSubsection = "designRequirements";
        this.magneticAdviserCanContinue = {
            'designRequirements': false,
            'operatingPoints': false,
            'magneticAdviser': false,
            'magneticFinalizer': false,
        };
    }

    function resetMagneticBuilder() {
        this.magneticBuilderSubsection = "designRequirements";
        this.magneticBuilderCanContinue = {
            'designRequirements': false,
            'operatingPoints': false,
            'magneticBuilder': false,
            'magneticFinalizer': false,
        };
        this.wire2DVisualizerPlotCurrentDensity = 0;
        this.magnetic2DVisualizerPlotMagneticField = 0;
        this.magnetic2DVisualizerPlotFringingField = 1;
        this.wire2DVisualizerPlotCurrentViews = {};
        this.wire2DVisualizerShowAnyway = false;
        this.magnetic2DVisualizerPlotCurrentView = null;
    }



    const loggedIn = ref(false)
    const ipAddress = ref(0)
    const username = ref(null)
    const readNotifications = ref([])
    const globalOperationPoint = ref(Utils.deepCopy(Defaults.defaultOperationPointExcitation))
    const globalCore = ref(Utils.deepCopy(Defaults.defaultCore))
    const globalSimulation = ref(Utils.deepCopy(Defaults.defaultSimulation))
    const idToDelete = ref(null)
    const userSubsection = ref("operationPoints")
    const coreSubsection = ref("shapeArtisan")
    const coreSimulationSubsection = ref("coreCalculator")
    const simulationCoreCalculatorSubsection = ref("inductanceCalculator")
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
    const getCoreSubsection = computed(() => {
        return coreSubsection
    })
    const getCoreSimulationSubsection = computed(() => {
        return coreSimulationSubsection
    })
    const getGlobalOperationPoint = computed(() => {
        return globalOperationPoint
    })
    const getGlobalCore = computed(() => {
        return globalCore
    })
    const getIdToDelete = computed(() => {
        return idToDelete
    })

    const dump = computed(() => {
        return {
            "magneticSynthesisSubsection": magneticSynthesisSubsection.value,
            "coreAdviserSelectedAdvise": coreAdviserSelectedAdvise.value,
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

    function resetGlobalOperationPoint() {
        this.globalOperationPoint = Utils.deepCopy(Defaults.defaultOperationPointExcitation)
    }

    function resetGlobalCore() {
        this.globalCore = Utils.deepCopy(Defaults.defaultCore)
    }

    function resetGlobalSimulation() {
        this.globalSimulation = Utils.deepCopy(Defaults.defaultSimulation)
        this.coreSimulationSubsection = "coreCalculator"
        this.simulationCoreCalculatorSubsection = "inductanceCalculator"
        this.simulationUseCurrentAsInput = 1
        this.selectedModels = {
            gapReluctance: Defaults.reluctanceModelDefault,
            coreLosses: Defaults.coreLossesModelDefault,
            coreTemperature: Defaults.coreTemperatureModelDefault,
        }
    }

    function reset() {

        this.loggedIn = false
        this.username = null
        this.globalOperationPoint = Utils.deepCopy(Defaults.defaultOperationPointExcitation)
        this.globalCore = Utils.deepCopy(Defaults.defaultCore)
        this.globalSimulation = Utils.deepCopy(Defaults.defaultSimulation)
        this.idToDelete = null
        this.userSubsection = "operationPoints"
        this.coreSubsection = "shapeArtisan"
        this.wire2DVisualizerPlotCurrentDensity = 0;
        this.magnetic2DVisualizerPlotMagneticField = 0;
        this.magnetic2DVisualizerPlotFringingField = 1;
        this.wire2DVisualizerPlotCurrentViews = {};
        this.magnetic2DVisualizerPlotCurrentView = null;

        this.readNotifications = []
        this.loggedIn = false
        this.ipAddress = 0
        this.username = null
        this.globalOperationPoint = Utils.deepCopy(Defaults.defaultOperationPointExcitation)
        this.globalCore = Utils.deepCopy(Defaults.defaultCore)
        this.globalSimulation = Utils.deepCopy(Defaults.defaultSimulation)
        this.idToDelete = null
        this.userSubsection = "operationPoints"
        this.coreSubsection = "shapeArtisan"
        this.coreSimulationSubsection = "coreCalculator"
        this.simulationCoreCalculatorSubsection = "inductanceCalculator"
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
    function setGlobalOperationPoint(globalOperationPoint) {
        this.globalOperationPoint = globalOperationPoint
    }
    function setGlobalCore(globalCore) {
        this.globalCore = globalCore
    }
    function setGlobalSimulation(globalSimulation) {
        this.globalSimulation = globalSimulation
    }
    function setGlobalCoreAlt(globalCore) {
        this.globalCore = globalCore
    }
    function setGlobalCoreShapeName(name) {
        if (typeof(this.globalCore['functionalDescription']['shape']) == 'string') {
            this.globalCore['functionalDescription']['shape'] = name
        }
        else {
            this.globalCore['functionalDescription']['shape']['name'] = name
            this.globalCore['functionalDescription']['shape']['type'] = name == "Custom"? 'custom' : 'standard'
        }
    }
    function setGlobalCoreShape(shape) {
        this.globalCore['functionalDescription']['shape'] = shape

        if (shape['family'] == 't') {
            this.globalCore['functionalDescription']['gapping'] = []
            this.globalCore['functionalDescription']['type'] = 'toroidal'
        }
        else {
            this.globalCore['functionalDescription']['type'] = 'two-piece set'
        }
    }
    function setGlobalCoreMaterial(material) {
        this.globalCore['functionalDescription']['material'] = material
    }
    function setGlobalCoreGapping(gapping) {
        this.globalCore['functionalDescription']['gapping'] = gapping
    }
    function setGlobalSimulationCoreMaterial(material) {
        this.globalSimulation['magnetic']['core']['functionalDescription']['material'] = material
    }
    function setGlobalSimulationCoreShape(shape) {
        this.globalSimulation['magnetic']['core']['functionalDescription']['shape'] = shape
        if (shape['family'] == 't') {
            this.globalSimulation['magnetic']['core']['functionalDescription']['type'] = "toroidal"
            this.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = []
        }
        else {
            this.globalSimulation['magnetic']['core']['functionalDescription']['type'] = "two-piece set"
        }
    }
    function setGlobalSimulationCoreGapping(gapping) {
        this.globalSimulation['magnetic']['core']['functionalDescription']['gapping'] = gapping
    }
    function setGlobalSimulationCoreNumberStacks(numberStacks) {
        this.globalSimulation['magnetic']['core']['functionalDescription']['numberStacks'] = numberStacks
    }
    function setGlobalSimulationOperationPointByIndex(index, operationPoint) {
        this.globalSimulation['inputs']['operatingPoints'][index] = operationPoint
    }
    function loadGlobalOperationPointIntoSimulation(index, operationPoint) {
        this.globalSimulation['inputs']['operatingPoints'][index]['excitationsPerWinding'][0] = Utils.deepCopy(operationPoint)
        console.log(this.globalSimulation['inputs']['operatingPoints'][0]['excitationsPerWinding'][0])
        console.log(this.globalOperationPoint)
    }
    function setIdToDelete(idToDelete) {
        this.idToDelete = idToDelete
    }
    function setSelectedModels(variable, model) {
        this.selectedModels[variable] = model
    }
    function setSimulationCoreCalculatorSubsection(simulationCoreCalculatorSubsection) {
        this.simulationCoreCalculatorSubsection = simulationCoreCalculatorSubsection
    }
    function setSimulationUseCurrentAsInput(simulationUseCurrentAsInput) {
        this.simulationUseCurrentAsInput = simulationUseCurrentAsInput
    }
    function armDeadManSwitch() {
    }
    function disarmDeadManSwitch() {
    }
    return {
        coreAdviserSelectedAdvise,
        magneticSynthesisSubsection,
        magneticSynthesisCanContinue,
        magneticSpecificationSubsection,
        magneticSpecificationCanContinue,
        magneticCoreAdviserSubsection,
        magneticCoreAdviserCanContinue,
        insulationAdviserSubsection,
        insulationAdviserCanContinue,
        magneticAdviserSelectedAdvise,
        magneticAdviserSubsection,
        magneticAdviserCanContinue,
        magneticBuilderSubsection,
        magneticBuilderCanContinue,
        resetMagneticSpecification,
        resetMagneticCoreAdviser,
        resetMagneticAdviser,
        resetMagneticBuilder,
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
        coreSubsection,
        getCoreSubsection,
        setCoreSubsection,
        simulationCoreCalculatorSubsection,
        setSimulationCoreCalculatorSubsection,
        simulationUseCurrentAsInput,
        setSimulationUseCurrentAsInput,
        coreSimulationSubsection,
        getCoreSimulationSubsection,
        setCoreSimulationSubsection,
        globalOperationPoint,
        getGlobalOperationPoint,
        setGlobalOperationPoint,
        globalCore,
        getGlobalCore,
        setGlobalCore,
        setGlobalCoreAlt,
        setGlobalCoreShapeName,
        setGlobalCoreShape,
        setGlobalCoreMaterial,
        setGlobalCoreGapping,
        globalSimulation,
        setGlobalSimulation,
        setGlobalSimulationCoreMaterial,
        setGlobalSimulationCoreShape,
        setGlobalSimulationCoreGapping,
        setGlobalSimulationCoreNumberStacks,
        setGlobalSimulationOperationPointByIndex,
        loadGlobalOperationPointIntoSimulation,
        idToDelete,
        getIdToDelete,
        setIdToDelete,
        resetGlobalOperationPoint,
        resetGlobalCore,
        resetGlobalSimulation,
        setSelectedModels,
        selectedModels,
        reset,
    }
},
{
    persist: true,
})
