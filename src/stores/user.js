import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as Defaults from 'WebSharedComponents/assets/js/defaults.js'

export const useUserStore = defineStore("user", () => {

    const loadingPath = ref(null);

    const toolboxStates = ref({
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
        },
        magneticViewer: {
            magneticViewer: {
                subsection: "magneticViewer",
                canContinue: {
                    'magneticViewer': false,
                },
            },
        }
    });

    const selectedWorkflow = ref("design");
    const selectedTool = ref("agnosticTool");

    const magneticAdviserSelectedAdvise = ref(0);

    const anyDesignLoaded = ref(false);

    const wire2DVisualizerState = ref({
        plotCurrentDensity: false,
        plotCurrentViews: {},
        showAnyway: false,
    });

    const magnetic2DVisualizerState = ref({
        PlotCurrentView: null,
        PlotMagneticField: false,
        PlotFringingField: true,
    });

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

    function selectWorkflow(application) {
        this.selectedWorkflow = application;
    }

    function selectTool(tool) {
        this.selectedTool = tool;
    }

    function isAnyDesignLoaded() {
        return this.anyDesignLoaded;
    }

    function designLoaded() {
        this.anyDesignLoaded = true;
    }

    function resetMagneticTool() {
        this.anyDesignLoaded = false;
        this.selectedTool = "agnosticTool";


        this.toolboxStates = {
            power: {
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
    }




    const simulationUseCurrentAsInput = ref(1)
    const selectedModels = ref({
        gapReluctance: Defaults.reluctanceModelDefault,
        coreLosses: Defaults.coreLossesModelDefault,
        coreTemperature: Defaults.coreTemperatureModelDefault,
    })

    function reset() {

        this.wire2DVisualizerState = {
            plotCurrentDensity: false,
            plotCurrentViews: {},
            showAnyway: false,
        };

        this.magnetic2DVisualizerState = {
            PlotCurrentView: null,
            PlotMagneticField: false,
            PlotFringingField: true,
        };

        this.simulationUseCurrentAsInput = 1
        this.selectedModels = {
            gapReluctance: Defaults.reluctanceModelDefault,
            coreLosses: Defaults.coreLossesModelDefault,
            coreTemperature: Defaults.coreTemperatureModelDefault,
        }
    }

    function setSelectedModels(variable, model) {
        this.selectedModels[variable] = model
    }
    function setSimulationUseCurrentAsInput(simulationUseCurrentAsInput) {
        this.simulationUseCurrentAsInput = simulationUseCurrentAsInput
    }
    return {
        loadingPath,

        resetMagneticTool,
        isAnyDesignLoaded,
        designLoaded,
        anyDesignLoaded,

        toolboxStates,
        selectedWorkflow,
        selectedTool,
        getCurrentToolBoxState,
        getCurrentToolState,
        setCurrentToolSubsection,
        setCurrentToolSubsectionStatus,
        selectWorkflow,
        selectTool,
        wire2DVisualizerState,
        magnetic2DVisualizerState,
        magneticAdviserSelectedAdvise,

        simulationUseCurrentAsInput,
        setSimulationUseCurrentAsInput,

        setSelectedModels,
        selectedModels,
        reset,
    }
},
{
    persist: true,
})
