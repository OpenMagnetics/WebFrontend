import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'
import { useMasStore } from './mas'
import { deepCopy } from '/WebSharedComponents/assets/js/utils.js'
import * as Defaults from '/WebSharedComponents/assets/js/defaults.js'


export const useStateStore = defineStore("state", () => {
    const OperatingPointsMode = {
        Manual: 'Manual',
        CircuitSimulatorImport: 'CircuitSimulatorImport',
        AcSweep: 'AcSweep',
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
    }

    const Wizards = {
        CommonModeChoke: 'commonModeChoke',
        Flyback: 'flyback',
    };


    const toolboxDefaultStates = {
        design: {
            magneticSpecificationsReport: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'magneticSpecificationsSummary': false,
                },
            },
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
                    'magneticBuilder': false,
                    'magneticSummary': false,
                },
            },
            magneticCoreAdviser: {
                subsection: "designRequirements",
                canContinue: {
                    'designRequirements': false,
                    'operatingPoints': false,
                    'magneticCoreAdviser': false,
                    'magneticCoreSummary': false,
                },
                selectedAdvise: 0,
            },
            agnosticTool: {
                subsection: "welcome",
                canContinue: {
                    'welcome': true,
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
                    'magneticBuilder': false,
                    'magneticSummary': false,
                },
            },
            agnosticTool: {
                subsection: "welcome",
                canContinue: {
                    'welcome': true,
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
        type: 'impedanceOverFrequency',
        xAxisMode: 'log',
        yAxisMode: 'log',
        minimumFrequency: 1e3,
        maximumFrequency: 4e6,
        numberPoints: 100,
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
    const selectedTool = ref("agnosticTool");
    const selectedWizard = ref(Wizards.Flyback);

    function getCurrentToolBoxState() {
        return this.toolboxStates[this.selectedWorkflow];
    }

    function getCurrentToolState() {
        return this.toolboxStates[this.selectedWorkflow][this.selectedTool];
    }

    function setCurrentToolSubsection(subsection) {
        return this.toolboxStates[this.selectedWorkflow][this.selectedTool].subsection = subsection;
    }

    function setCurrentToolSubsectionStatus(subsection, canContinue) {
        return this.toolboxStates[this.selectedWorkflow][this.selectedTool].canContinue[subsection] = canContinue;
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
        console.log("Resetting state");
        this.anyDesignLoaded = false;
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

    function applyChanges() {
    };

    function cancelChanges() {
    };

    return {
        reset,

        loadingPath,

        isAnyDesignLoaded,
        designLoaded,
        anyDesignLoaded,

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
    }
},
{
    persist: true,
})
