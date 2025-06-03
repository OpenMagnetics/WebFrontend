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
            "background": theme["dark"],
            "color": theme["white"],
            "border-color":  theme["primary"] + ' !important',
        };

        this.storyline = {
            main: {
                "background":"transparent",
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            activeButton: {
                "background": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["primary"] + ' !important',
            },
            availableButton: {
                "background": theme["secondary"],
                "color": theme["white"],
                "border-color":  theme["secondary"] + ' !important',
            },
            pendingButton: {
                "background": "transparent",
                "color": theme["primary"],
                "border-color":  theme["primary"] + ' !important',
            },
            continueButton: {
                "background": theme["success"],
                "color": theme["dark"],
                "border-color":  theme["success"] + ' !important',
            },
            arrow: {
                "color": theme["primary"],
            },
        };

        this.designRequirements = {
            main: {
                "background": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            requiredButton: {
                "background": theme["light"],
                "color": theme["white"],
                "border-color": theme["dark"],
            },
            addButton: {
                "background": theme["info"],
                "color": theme["dark"],
            },
            removeButton: {
                "background": theme["danger"],
                "color": theme["dark"],
            },
            requirementButton: {
                "background": theme["primary"],
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
                "background": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background": theme["light"],
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
                "background": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            windingBgColor:{
                "background": theme["light"],
                "border-color":  theme["light"] + ' !important',
            },
            unselectedUnprocessedWindingButton: {
                "background": theme["danger"],
                "color": theme["dark"],
            },
            unselectedProcessedWindingButton: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            selectedWindingButton: {
                "background": theme["success"],
                "color": theme["dark"],
            },
            reflectWindingButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            addOperatingPointButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            selectOperatingPointButton: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            removeOperatingPointButton: {
                "background": theme["danger"],
                "color": theme["dark"],
            },
            modifyNumberWindingsButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            goBackSelectingButton: {
                "background": theme["success"],
                "border-color": theme["success"],
                "color": theme["dark"],
            },
            confirmColumnsButton: {
                "background": theme["success"],
                "border-color": theme["success"],
                "color": theme["dark"],
            },
            typeButton: {
                "background": theme["primary"],
                "border-color": theme["primary"],
                "color": theme["dark"],
                "font-size": '1.25rem',
            },

            operatingPointBgColor:{
                "background": theme["light"],
                "border-color":  theme["primary"] + ' !important',
            },
            titleLabelBgColor:{
                "background": theme["dark"],
            },
            titleTextColor:{
                "color": theme["white"],
            },
            commonParameterTextColor:{
                "color": theme["white"],
            },
            commonParameterBgColor:{
                "background": theme["dark"],
            },
            currentTextColor:{
                "color": theme["info"],
            },
            voltageTextColor:{
                "color": theme["primary"],
            },
            currentBgColor:{
                "background": theme["info"],
            },
            voltageBgColor:{
                "background": theme["primary"],
            },
            graphBgColor:{
                "background": theme["light"],
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
                "background": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background": theme["light"],
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

        this.catalogAdviser = {
            main: {
                "background": theme["info"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            adviserHeader: {
                "background": theme["light"],
                "color": theme["dark"],
            },
            adviserBody: {
                "background": theme["info"],
                "color": theme["dark"],
            },
            editButton: {
                "background": theme["secondary"],
                "color": theme["white"],
                "border-color":  theme["secondary"] + ' !important',
            },
            viewButton: {
                "background": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["primary"] + ' !important',
            },
            orderButton: {
                "background": theme["success"],
                "color": theme["dark"],
                "border-color":  theme["success"] + ' !important',
            },
        };

        this.magneticBuilder = {
            main: {
                "background": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            customizeButton: {
                "background": theme["success"],
                "color": theme["dark"],
            },
            loadFromLibraryButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            adviseButton: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            showAlignmentOptionsButton: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            showMarginOptionsButton: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            hideAlignmentOptionsButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            hideMarginOptionsButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            coilVisualizerButton: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            wireVisualizerButton: {
                "background": "transparent",
                "color": theme["white"],
                "display": ['-webkit-slider-thumb']
            },
            graphBgColor:{
                "background": theme["light"],
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


            inputFontSize: {
                // "font-size": '2rem',
                "font-size": '1rem',
            },
            inputTitleFontSize: {
                // "font-size": '2.5rem',
                "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                "background": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputLabelDangerBgColor:{
                "color": theme["danger"],
            },
            inputValueBgColor:{
                "background": theme["light"],
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
                "background": theme["primary"],
                "color": theme["dark"],
            },
            utilityButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            removeButton: {
                "background": theme["danger"],
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
                "background": theme["dark"],
                "color": theme["white"],
            },
            button: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            activeButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
            setting: {
                "background": theme["dark"],
                "color": theme["white"],
            },
            closeButton: {
                "background": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["primary"] + ' !important',
            },
        };

        this.toolSelector = {
            main: {
                "background": "transparent",
                "color": theme["white"],
            },
            explanation: {
                "background": "transparent",
                "color": theme["white"],
            },
            button: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            promotedButton: {
                "background": theme["danger"],
                "color": theme["dark"],
            },
        };

        this.contextMenu = {
            main: {
                "background": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            settingsButton: {
                "background": theme["info"],
                "color": theme["dark"],
            },
            editButton: {
                "background": theme["success"],
                "color": theme["dark"],
            },
            redrawButton: {
                "background": theme["success"],
                "color": theme["dark"],
            },
            confirmButton: {
                "background": theme["success"],
                "color": theme["dark"],
            },
            cancelButton: {
                "background": theme["danger"],
                "color": theme["dark"],
            },
            changeToolButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            customizeCoreSectionButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            orderButton: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            setting: {
                "background": theme["dark"],
                "color": theme["white"],
            },
            closeButton: {
                "background": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["primary"] + ' !important',
            },
        };

        this.header = {
            main: {
                "background": theme["dark"],
                "color": theme["primary"],
            },
            collapsedButton: {
                "background": theme["primary"],
                "color": theme["dark"],
            },
            title: {
                "background": "transparent",
                "color": theme["primary"],
            },
            musings: {
                "background": "transparent",
                "color": theme["primary"],
            },
            designSectionDropdown: {
                "background": theme["dark"],
                "color": theme["primary"],
                "border-color": theme["primary"] + ' !important' ,
            },
            continueDesignButton: {
                "background": theme["dark"],
                "color": theme["primary"],
                "border-color": theme["primary"] + ' !important' ,
            },
            othersSectionDropdown: {
                "background": theme["dark"],
                "color": theme["primary"],
                "border-color": theme["primary"] + ' !important' ,
            },
            wizardsSectionButton: {
                "background": theme["danger"],
                "color": theme["dark"],
                "border-color": theme["dark"] + ' !important' ,
            },
            wizardsSectionDropdown: {
                "background": theme["dark"],
                "color": theme["dark"],
                "border-color": theme["primary"] + ' !important' ,
            },
            wizardButton: {
                "background": theme["dark"],
                "color": theme["primary"],
                "border-color": theme["primary"] + ' !important' ,
            },
            newWizardButton: {
                "background": theme["danger"],
                "color": theme["dark"],
                "border-color": theme["dark"] + ' !important' ,
            },
            donateButton: {
                "background": theme["info"],
                "color": theme["dark"],
            },
            bugButton: {
                "background": theme["dark"],
                "color": theme["danger"],
            },
            githubButton: {
                "background": theme["dark"],
                "color": theme["success"],
            },
        };

        this.engineLoader = {
            main: {
                "background": theme["dark"] + ' !important',
                "color": theme["white"],
            },
        };

        this.insulationAdviser = {
            main: {
                "background": theme["dark"],
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
                "background": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background": theme["light"],
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
            main: {
                "background": theme["dark"],
                "color": theme["white"],
                "border-color":  theme["primary"] + ' !important',
            },
            inputFontSize: {
                "font-size": '1.25rem',
            },
            inputTitleFontSize: {
                "font-size": '2rem',
            },
            inputLabelBgColor:{
                "background": theme["dark"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background": theme["light"],
            },
            inputTextColor:{
                "color": theme["white"],
            },
            inputErrorTextColor:{
                "color": theme["danger"],
            },
            requirementButton: {
                "background": theme["light"],
                "color": theme["white"],
                "border-color": theme["white"],
            },
            acceptButton: {
                "background": theme["success"],
                "color": theme["dark"],
                "border-color": theme["success"],
                "font-size": '2rem',
            },
            reviewButton: {
                "background": theme["primary"],
                "color": theme["dark"],
                "border-color": theme["primary"],
                "font-size": '2rem',
            },
            addButton: {
                "background": theme["light"],
                "color": theme["white"],
                "border-color": theme["white"],
            },
            removeButton: {
                "background": theme["danger"],
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
