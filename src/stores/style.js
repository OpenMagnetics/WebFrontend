import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useStyleStore = defineStore("style", () => {

    const theme = ref({});

    const storyline = ref({});
    const designRequirements = ref({});
    const operatingPoints = ref({});
    const magneticBuilder = ref({});
    const controlPanel = ref({});
    const contextMenu = ref({});
    const header = ref({});
    const main = ref({});
    const toolSelector = ref({});
    const engineLoader = ref({});
    const insulationAdviser = ref({});
    const catalogAdviser = ref({});
    const wizard = ref({});

    function setTheme(theme) {
        this.theme = theme;

        this.main = {
            "background-color": theme["dark"],
            "color": theme["white"],
            "border-color":  theme["primary"] + ' !important',
        };

        this.storyline = {
            main: {
                "background-color":"transparent",
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            activeButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["primary"] + ' !important',
            },
            availableButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
                "border-color":  theme["secondary"] + ' !important',
            },
            pendingButton: {
                "background-color": "transparent",
                "color": theme["primary"],
                "border-color":  theme["primary"] + ' !important',
            },
            continueButton: {
                "background-color": theme["success"],
                "color": theme["dark"],
                "border-color":  theme["success"] + ' !important',
            },
            arrow: {
                "color": theme["primary"],
            },
        };

        this.designRequirements = {
            main: {
                "background-color": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            requiredButton: {
                "background-color": theme["light"],
                "color": theme["white"],
                "border-color": theme["dark"],
            },
            addButton: {
                "background-color": theme["info"],
                "color": theme["dark"],
            },
            removeButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
            },
            requirementButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
                "border-color": theme["primary"],
            },
            inputBorderColor: {
                "border-color":  theme["primary"] + ' !important',
            },
            inputFontSize: {
                // "font-size": '2rem',
                "font-size": '1rem',
            },
            inputTitleFontSize: {
                // "font-size": '2.5rem',
                "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                "background-color": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background-color": theme["light"],
            },
            inputTextColor:{
                "color": theme["white"],
            },
            addElementButtonColor: {
                "color": theme["secondary"],
            },
            removeElementButtonColor: {
                "color": theme["danger"],
            },
        };

        this.operatingPoints = {
            main: {
                "background-color": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            windingBgColor:{
                "background-color": theme["light"],
                "border-color":  theme["light"] + ' !important',
            },
            unselectedUnprocessedWindingButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
            },
            unselectedProcessedWindingButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            selectedWindingButton: {
                "background-color": theme["success"],
                "color": theme["dark"],
            },
            reflectWindingButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            addOperatingPointButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            selectOperatingPointButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            removeOperatingPointButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
            },
            modifyNumberWindingsButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            goBackSelectingButton: {
                "background-color": theme["success"],
                "border-color": theme["success"],
                "color": theme["dark"],
            },
            confirmColumnsButton: {
                "background-color": theme["success"],
                "border-color": theme["success"],
                "color": theme["dark"],
            },
            typeButton: {
                "background-color": theme["primary"],
                "border-color": theme["primary"],
                "color": theme["dark"],
                "font-size": '1.25rem',
            },

            operatingPointBgColor:{
                "background-color": theme["light"],
                "border-color":  theme["primary"] + ' !important',
            },
            titleLabelBgColor:{
                "background-color": theme["dark"],
            },
            titleTextColor:{
                "color": theme["white"],
            },
            commonParameterTextColor:{
                "color": theme["white"],
            },
            commonParameterBgColor:{
                "background-color": theme["dark"],
            },
            currentGraph:{
                "background-color": theme["info"],
                "color": theme["info"],
            },
            voltageGraph:{
                "background-color": theme["primary"],
                "color": theme["primary"],
            },
            currentTextColor:{
                "color": theme["info"],
            },
            voltageTextColor:{
                "color": theme["primary"],
            },
            currentBgColor:{
                "background-color": theme["info"],
            },
            voltageBgColor:{
                "background-color": theme["primary"],
            },
            graphBgColor:{
                "background-color": theme["light"],
            },


            inputFontSize: {
                // "font-size": '2rem',
                "font-size": '1rem',
            },
            inputTitleFontSize: {
                // "font-size": '2.5rem',
                "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                "background-color": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background-color": theme["light"],
            },
            inputTextColor:{
                "color": theme["white"],
            },
            addElementButtonColor: {
                "color": theme["secondary"],
            },
            removeElementButtonColor: {
                "color": theme["danger"],
            },
            settingsButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
        };

        this.catalogAdviser = {
            main: {
                "background-color": theme["info"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            adviserHeader: {
                "background-color": theme["light"],
                "color": theme["dark"],
            },
            adviserBody: {
                "background-color": theme["info"],
                "color": theme["dark"],
            },
            editButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
                "border-color":  theme["secondary"] + ' !important',
            },
            viewButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["primary"] + ' !important',
            },
            orderButton: {
                "background-color": theme["success"],
                "color": theme["dark"],
                "border-color":  theme["success"] + ' !important',
            },
        };

        this.magneticBuilder = {
            main: {
                "background-color": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            exporter: {
                "background-color": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            exporter: {
                "background": theme["dark"],
                "color": theme["white"],
            },
            customizeButton: {
                "background-color": theme["success"],
                "color": theme["dark"],
            },
            loadFromLibraryButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            tableButton: {
                "background-color": theme["light"],
                "color": theme["white"],
                "border-color": theme["white"],
            },
            adviseButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            showAlignmentOptionsButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            showInsulationOptionsButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            hideAlignmentOptionsButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            hideInsulationOptionsButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            coilVisualizerButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            wireVisualizerButton: {
                "background-color": "transparent",
                "color": theme["white"],
                "display": ['-webkit-slider-thumb']
            },
            graphBgColor:{
                "background-color": theme["light"],
            },
            graphLineColor:{
                "color": theme["white"],
            },
            graphPointsColor:{
                "color": theme["danger"],
            },

            propertyBgColor:{
                "color": theme["dark"],
            },
            requirementButton: {
                "background-color": theme["light"],
                "color": theme["white"],
                "border-color": theme["white"],
            },


            inputFontSize: {
                // "font-size": '2rem',
                "font-size": '1rem',
            },
            inputTitleFontSize: {
                // "font-size": '2.5rem',
                "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                "background-color": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputLabelDangerBgColor:{
                "color": theme["danger"],
            },
            inputValueBgColor:{
                "background-color": theme["light"],
            },
            inputTextColor:{
                "color": theme["white"],
            },
            inputSelectedTextColor:{
                "color": theme["success"],
            },
            inputErrorTextColor:{
                "color": theme["danger"],
            },
            addButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            utilityButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            removeButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
            },
            addElementButtonColor: {
                "color": theme["secondary"],
            },
            removeElementButtonColor: {
                "color": theme["danger"],
            },
        };

        this.controlPanel = {
            main: {
                "background-color": theme["dark"],
                "color": theme["white"],
            },
            button: {
                "background-color": theme["light"],
                "color": theme["white"],
                "border-color":  theme["light"] + ' !important',
            },
            activeButton: {
                "background-color": theme["info"],
                "color": theme["white"],
            },
            setting: {
                "background-color": theme["dark"],
                "color": theme["white"],
            },
            closeButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["primary"] + ' !important',
            },
        };

        this.toolSelector = {
            main: {
                "background-color": "transparent",
                "color": theme["white"],
            },
            explanation: {
                "background-color": "transparent",
                "color": theme["white"],
            },
            button: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            promotedButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
            },
        };

        this.contextMenu = {
            main: {
                "background-color": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            settingsButton: {
                "background-color": theme["info"],
                "color": theme["dark"],
            },
            editButton: {
                "background-color": theme["success"],
                "color": theme["dark"],
            },
            redrawButton: {
                "background-color": theme["success"],
                "color": theme["dark"],
            },
            resimulateButton: {
                "background-color": theme["warning"],
                "color": theme["dark"],
            },
            confirmButton: {
                "background-color": theme["success"],
                "color": theme["dark"],
            },
            cancelButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
            },
            changeToolButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            customizeCoreSectionButton: {
                "background-color": theme["secondary"],
                "color": theme["white"],
            },
            orderButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            setting: {
                "background-color": theme["dark"],
                "color": theme["white"],
            },
            closeButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["primary"] + ' !important',
            },
        };

        this.header = {
            main: {
                "background-color": theme["dark"],
                "color": theme["primary"],
            },
            collapsedButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
            },
            title: {
                "background-color": "transparent",
                "color": theme["primary"],
            },
            musings: {
                "background-color": "transparent",
                "color": theme["primary"],
            },
            designSectionDropdown: {
                "background-color": theme["dark"],
                "color": theme["primary"],
                "border-color": theme["primary"] + ' !important' ,
            },
            continueDesignButton: {
                "background-color": theme["dark"],
                "color": theme["primary"],
                "border-color": theme["primary"] + ' !important' ,
            },
            loadMasButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
                "border-color": theme["dark"] + ' !important' ,
            },
            othersSectionDropdown: {
                "background-color": theme["dark"],
                "color": theme["primary"],
                "border-color": theme["primary"] + ' !important' ,
            },
            wizardsSectionButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
                "border-color": theme["dark"] + ' !important' ,
            },
            wizardsSectionDropdown: {
                "background-color": theme["dark"],
                "color": theme["dark"],
                "border-color": theme["primary"] + ' !important' ,
            },
            wizardButton: {
                "background-color": theme["dark"],
                "color": theme["primary"],
                "border-color": theme["primary"] + ' !important' ,
            },
            newWizardButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
                "border-color": theme["dark"] + ' !important' ,
            },
            donateButton: {
                "background-color": theme["info"],
                "color": theme["dark"],
            },
            bugButton: {
                "background-color": theme["dark"],
                "color": theme["danger"],
            },
            githubButton: {
                "background-color": theme["dark"],
                "color": theme["success"],
            },
        };

        this.engineLoader = {
            main: {
                "background-color": theme["dark"] + ' !important',
                "color": theme["white"],
            },
        };

        this.insulationAdviser = {
            main: {
                "background-color": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            inputFontSize: {
                // "font-size": '2rem',
                "font-size": '1.25rem',
            },
            inputTitleFontSize: {
                // "font-size": '2.5rem',
                "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                "background-color": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background-color": theme["light"],
            },
            inputTextColor:{
                "color": theme["white"],
            },
            addElementButtonColor: {
                "color": theme["secondary"],
            },
            removeElementButtonColor: {
                "color": theme["danger"],
            },
        };

        this.wizard = {
            title: {
                "background-color": theme["dark"],
                "color": theme["white"],
                "font-size": '2rem',
            },
            main: {
                "background-color": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            inputFontSize: {
                "font-size": '1.25rem',
            },
            inputTitleFontSize: {
                "font-size": '2rem',
            },
            inputLabelFontSize: {
                "font-size": '1.5rem',
            },
            inputLabelBgColor:{
                "background-color": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background-color": theme["light"],
            },
            inputTextColor:{
                "color": theme["white"],
            },
            inputErrorTextColor:{
                "color": theme["danger"],
            },
            requirementButton: {
                "background-color": theme["light"],
                "color": theme["white"],
                "border-color": theme["white"],
            },
            acceptButton: {
                "background-color": theme["success"],
                "color": theme["dark"],
                "border-color": theme["success"],
                "font-size": '1.5rem',
            },
            reviewButton: {
                "background-color": theme["primary"],
                "color": theme["dark"],
                "border-color": theme["primary"],
                "font-size": '1.5rem',
            },
            addButton: {
                "background-color": theme["light"],
                "color": theme["white"],
                "border-color": theme["white"],
            },
            removeButton: {
                "background-color": theme["danger"],
                "color": theme["dark"],
            },
        };
    }


    return {
        theme,
        setTheme,
        main,
        storyline,
        designRequirements,
        operatingPoints,
        magneticBuilder,
        controlPanel,
        contextMenu,
        header,
        toolSelector,
        engineLoader,
        insulationAdviser,
        catalogAdviser,
        wizard,
    }
},
{
    persist: false,
})
