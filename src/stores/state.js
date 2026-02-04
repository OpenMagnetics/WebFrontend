import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import { useMasStore } from './mas'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import * as Defaults from '/WebSharedComponents/assets/js/defaults.js'


export const useStateStore = defineStore("state", () => {
    const OperatingPointsMode = {
        Manual: 'Manual',
        CircuitSimulatorImport: 'CircuitSimulatorImport',
        HarmonicsList: 'HarmonicsList',
    };

    const MagneticBuilderModes = {
        Basic: 'Basic',
        Advanced: 'Advanced',
    };

    const MagneticBuilderCoreSubmodes = {
        Shape: 'Shape',
        Material: 'Material',
        Gapping: 'Gapping',
    };

    const SupportedApplications = {
        Power: 'power',
        CommonModeChoke: 'commonModeChoke',
        CommonModeChokeCatalog: 'commonModeChokeCatalog',
        Filter: 'filter',
    }

    const Wizards = {
        CommonModeChoke: 'commonModeChoke',
        DifferentialModeChoke: 'differentialModeChoke',
        Flyback: 'flyback',
        Buck: 'buck',
        Boost: 'boost',
        IsolatedBuck: 'isolatedBuck',
        IsolatedBuckBoost: 'isolatedBuckBoost',
        PushPull: 'pushPull',
        SingleSwitchForward: 'singleSwitchForward',
        TwoSwitchForward: 'twoSwitchForward',
        ActiveClampForward: 'activeClampForward',
    };


    const toolboxDefaultStates = {
        design: {
            magneticBuilder: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'magneticAdviser': false,
                    'magneticBuilder': false,
                    'magneticSummary': false,
                },
            },
            agnosticTool: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'toolSelector': false,
                },
            },
        },
        filter: {
            magneticAdviser: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'magneticAdviser': false,
                    'magneticBuilder': false,
                    'magneticSummary': false,
                },
                selectedAdvise: 0,
            },
            magneticBuilder: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'magneticAdviser': false,
                    'magneticBuilder': false,
                    'magneticSummary': false,
                },
            },
            agnosticTool: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'toolSelector': false,
                },
            },
        },
        insulationCoordinator: {
            insulationAdviser: {
                subsection: "insulationRequirements",
                canContinue: {
                    'insulationRequirements': false,
                },
            },
        },
        catalog: {
            catalogAdviser: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'catalogAdviser': false,
                    'magneticViewer': false,
                },
            },
            magneticCatalogAndBuilder: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'catalogAdviser': false,
                    'magneticBuilder': false,
                    'magneticSummary': false,
                },
            },
        },
        magneticViewer: {
            magneticViewer: {
                subsection: "magneticViewer",
                canContinue: {
                    'magneticViewer': false,
                },
            },
        }
    };


    // Router
    const loadingPath = ref(null);

    // OperatingPoint
    const currentOperatingPoint = ref(0);

    const operatingPointsCircuitSimulator = ref({
        columnNames: [],
        allLastReadColumnNames: [],
        confirmedColumns: [],
    });

    const operatingPoints = ref({
        modePerPoint: [null],
    });


    function updatedSignals() {};

    function initializeOperatingPoints(temperature=100) {

        const masStore = useMasStore();

        if (masStore.mas.inputs.operatingPoints.length == 0) {
            masStore.mas.inputs.operatingPoints.push(
                {
                    name: "Op. Point No. 1",
                    conditions: {ambientTemperature: temperature},
                    excitationsPerWinding: []
                }
            );
        }
        this.operatingPointsCircuitSimulator.confirmedColumns.push([]);
        this.operatingPointsCircuitSimulator.columnNames.push([]);

        for (var windingIndex = 0; windingIndex < masStore.mas.inputs.designRequirements.turnsRatios.length + 1; windingIndex++) {
            if (masStore.mas.inputs.operatingPoints[0].excitationsPerWinding.length <= windingIndex) {
                masStore.mas.inputs.operatingPoints[0].excitationsPerWinding.push(deepCopy(Defaults.defaultOperatingPointExcitation));
                this.operatingPointsCircuitSimulator.confirmedColumns[0].push(false);
            }
        }
    }

    function addNewOperatingPoint(currentOperatingPointIndex, mode) {
        const masStore = useMasStore();
        var newOperatingPoint = deepCopy(masStore.mas.inputs.operatingPoints[currentOperatingPointIndex]);
        newOperatingPoint.name = 'Op. Point No. ' + (masStore.mas.inputs.operatingPoints.length + 1);

        if (mode == this.OperatingPointsMode.HarmonicsList) {
            newOperatingPoint.excitationsPerWinding = [];
            for (var windingIndex = 0; windingIndex < masStore.mas.inputs.designRequirements.turnsRatios.length + 1; windingIndex++) {
                newOperatingPoint.excitationsPerWinding.push(deepCopy(Defaults.defaultOperatingPointExcitationWithHarmonics));
            }
        }
        else {
            // newOperatingPoint.excitationsPerWinding = [newOperatingPoint.excitationsPerWinding[0]];
        }

        this.operatingPointsCircuitSimulator.confirmedColumns.push([]);
        this.operatingPointsCircuitSimulator.columnNames.push([]);
        masStore.mas.inputs.operatingPoints.push(newOperatingPoint);
    }

    function removeOperatingPoint(index) {
        const masStore = useMasStore();
        this.operatingPointsCircuitSimulator.confirmedColumns.splice(index, 1);
        this.operatingPointsCircuitSimulator.columnNames.splice(index, 1);
        masStore.mas.inputs.operatingPoints.splice(index, 1);
    }

    // Magnetic Builder
    const graphParameters = ref({
        graph: 'impedanceOverFrequency',
        xAxisMode: 'log',
        yAxisMode: 'log',
        minimumFrequency: 1e3,
        maximumFrequency: 4e6,
        minimumTemperature: -40,
        maximumTemperature: 150,
        minimumDcBias: 0,
        maximumDcBias: 25,
        numberPoints: 25,
    });

    const magneticBuilder = ref({
        mode: {
            core: MagneticBuilderModes.Basic,
            wire: MagneticBuilderModes.Basic,
            coil: MagneticBuilderModes.Basic,
        },
        submode: {
            core: MagneticBuilderCoreSubmodes.Shape,
        },
    })

    // MAS Loader
    const anyDesignLoaded = ref(false);
    const loadingDesign = ref(false);

    function isAnyDesignLoaded() {
        return this.anyDesignLoaded;
    }

    function designLoaded() {
        this.anyDesignLoaded = true;
    }

    // Generic tool
    const toolboxStates = ref(deepCopy(toolboxDefaultStates));

    const selectedWorkflow = ref("design");
    const selectedApplication = ref(SupportedApplications.Power);
    const selectedTool = ref("magneticBuilder");
    const selectedWizard = ref(Wizards.Flyback);

    function getCurrentToolBoxState() {
        return this.toolboxStates[this.selectedWorkflow];
    }

    function getCurrentToolState() {
        const workflowState = this.toolboxStates[this.selectedWorkflow];
        if (!workflowState) {
            console.warn(`No workflow state found for: ${this.selectedWorkflow}`);
            return null;
        }
        const toolState = workflowState[this.selectedTool];
        if (!toolState) {
            console.warn(`No tool state found for: ${this.selectedTool} in workflow: ${this.selectedWorkflow}`);
            return null;
        }
        return toolState;
    }

    function setCurrentToolSubsection(subsection) {
        const toolState = this.getCurrentToolState();
        if (toolState) {
            toolState.subsection = subsection;
        }
        return toolState?.subsection;
    }

    function setCurrentToolSubsectionStatus(subsection, canContinue) {
        const toolState = this.getCurrentToolState();
        if (toolState && toolState.canContinue) {
            toolState.canContinue[subsection] = canContinue;
        }
        return toolState?.canContinue?.[subsection];
    }

    function selectWorkflow(workflow) {
        this.selectedWorkflow = workflow;
    }

    function selectApplication(application) {
        this.selectedApplication = application;
    }

    function selectWizard(wizard) {
        this.selectedWizard = wizard;
    }

    function getCurrentApplication() {
        return this.selectedApplication;
    }

    function getCurrentWizard() {
        return this.selectedWizard;
    }

    function hasCurrentApplicationMirroredWindings() {
        return this.selectedApplication == SupportedApplications.CommonModeChoke || this.selectedApplication == SupportedApplications.CommonModeChokeCatalog;
    }

    function selectTool(tool) {
        this.selectedTool = tool;
    }

    function resetMagneticTool() {
        this.anyDesignLoaded = false;
        this.loadingDesign = false;
        this.selectedTool = "agnosticTool";
        this.selectedWorkflow = "design";
        this.selectedApplication = SupportedApplications.Power;

        this.toolboxStates = deepCopy(toolboxDefaultStates);
    }

    function reset() {
        this.currentOperatingPoint = 0;
        this.operatingPointsCircuitSimulator = {
            columnNames: [],
            allLastReadColumnNames: [],
            confirmedColumns: [],
        };
        this.operatingPoints = {
            modePerPoint: [null],
        };

        this.graphParameters = {
            graph: 'impedanceOverFrequency',
            xAxisMode: 'log',
            yAxisMode: 'log',
            minimumFrequency: 1e3,
            maximumFrequency: 4e6,
            minimumTemperature: -40,
            maximumTemperature: 150,
            minimumDcBias: 0,
            maximumDcBias: 25,
            numberPoints: 100,
        };

        this.magneticBuilder = {
            mode: {
                core: MagneticBuilderModes.Basic,
                wire: MagneticBuilderModes.Basic,
                coil: MagneticBuilderModes.Basic,
            },
            submode: {
                core: MagneticBuilderCoreSubmodes.Shape,
            },
        };
    }

    // Visualizers
    const wire2DVisualizerState = ref({
        plotCurrentDensity: false,
        plotCurrentViews: {},
        showAnyway: false,
    });

    const magnetic2DVisualizerState = ref({
        plotCurrentView: null,
        plotMagneticField: false,
        plotFringingField: true,
    });

    function redraw() {
    };

    function resimulate() {
    };

    function applyChanges() {
    };

    function cancelChanges() {
    };

    function closeCoilAdvancedInfo() {
    };

    //CoilConfigurations
    const woundCoilConfiguration = ref({
        sectionsOrientation: "contiguous",
        sectionsAlignment: "spread",
        interlayerThickness: 0,
        intersectionThickness: 0,
        dataPerSection: [],
        pattern: "",
        repetitions: 1,
        proportionPerWinding: [],
    });

    const planarCoilConfiguration = ref({
        stackUp: [],
        insulationThichnessPerLayer: {},
        clearancePerWinding: {},
        coreToLayerDistance: null,
        borderToWireDistance: null,
    });

    function storeWoundConfiguration(data) {
        const auxData = deepCopy(data);
        woundCoilConfiguration.sectionsOrientation = auxData.sectionsOrientation;
        woundCoilConfiguration.sectionsAlignment = auxData.sectionsAlignment;
        woundCoilConfiguration.interlayerThickness = auxData.interlayerThickness;
        woundCoilConfiguration.intersectionThickness = auxData.intersectionThickness;
        woundCoilConfiguration.dataPerSection = auxData.dataPerSection;
        woundCoilConfiguration.pattern = auxData.pattern;
        woundCoilConfiguration.repetitions = auxData.repetitions;
        woundCoilConfiguration.proportionPerWinding = auxData.proportionPerWinding;
    }

    function loadWoundConfiguration() {
        return deepCopy(woundCoilConfiguration);
    }

    function storePlanarConfiguration(data) {
        const auxData = deepCopy(data);
        planarCoilConfiguration.stackUp = auxData.stackUp;
        planarCoilConfiguration.thicknessPerInsulationLayer = auxData.thicknessPerInsulationLayer;
        planarCoilConfiguration.coreToLayerDistance = auxData.coreToLayerDistance;
        planarCoilConfiguration.borderToWireDistance = auxData.borderToWireDistance;
        planarCoilConfiguration.wireToWireDistance = auxData.wireToWireDistance;
    }

    function loadPlanarConfiguration() {
        return deepCopy(planarCoilConfiguration);
    }

    function wiringTechnologyChanged() {
    }

    return {
        reset,

        loadingPath,

        isAnyDesignLoaded,
        designLoaded,
        anyDesignLoaded,
        loadingDesign,

        toolboxStates,
        selectedWorkflow,
        selectedApplication,
        selectedTool,
        getCurrentToolBoxState,
        getCurrentToolState,
        setCurrentToolSubsection,
        setCurrentToolSubsectionStatus,
        selectWorkflow,
        selectTool,
        selectApplication,
        selectedApplication,
        getCurrentApplication,
        hasCurrentApplicationMirroredWindings,
        SupportedApplications,
        updatedSignals,
        resetMagneticTool,

        Wizards,
        selectWizard,
        getCurrentWizard,
        selectedWizard,

        wire2DVisualizerState,
        magnetic2DVisualizerState,
        redraw,
        resimulate,

        OperatingPointsMode,
        currentOperatingPoint,
        operatingPointsCircuitSimulator,
        operatingPoints,
        initializeOperatingPoints,
        addNewOperatingPoint,
        removeOperatingPoint,

        graphParameters,
        MagneticBuilderModes,
        MagneticBuilderCoreSubmodes,
        magneticBuilder,
        applyChanges,
        cancelChanges,
        closeCoilAdvancedInfo,

        woundCoilConfiguration,
        storeWoundConfiguration,
        loadWoundConfiguration,
        planarCoilConfiguration,
        storePlanarConfiguration,
        loadPlanarConfiguration,
        wiringTechnologyChanged,
    }
},
{
    persist: true,
})
