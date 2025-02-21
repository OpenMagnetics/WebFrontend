import { defineStore } from 'pinia'
import { ref, watch, computed  } from 'vue'

export const useWeStyleStore = defineStore("style", () => {

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
    const catalog = ref({});
    const catalogAdviser = ref({});
    const insulationAdviser = ref({});

    function setTheme(theme) {
        this.theme = theme;

        this.main = {
            "background": theme["info"],
            "color": theme["dark"],
            "border-color":  theme["secondary"] + ' !important',
        };

        this.storyline = {
            main: {
                "background": theme["info"],
                "color": theme["dark"],
                "border-color":  theme["info"] + ' !important',
            },
            activeButton: {
                "background": theme["primary"],
                "color": theme["white"],
                "border-color":  theme["dark"] + ' !important',
            },
            availableButton: {
                "background": "transparent",
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            pendingButton: {
                "background": "transparent",
                "color": "transparent",
                "border-color":  "transparent" + ' !important',
            },
            continueButton: {
                "background": theme["primary"],
                "color": theme["white"],
                "border-color":  theme["dark"] + ' !important',
            },
            arrow: {
                "color": "transparent",
            },
        };

        this.designRequirements = {
            main: {
                "background": theme["info"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            requiredButton: {
                "background": theme["light"],
                "color": theme["dark"],
                "border-color": theme["info"],
            },
            requirement: {
                "background": theme["info"],
                "color": theme["white"],
                "border-color": theme["dark"],
            },
            addButton: {
                "background": theme["light"],
                "color": theme["dark"],
            },
            removeButton: {
                "background": theme["secondary"],
                "color": theme["dark"],
            },
            requirementButton: {
                "background": theme["primary"],
                "color": theme["dark"],
                "border-color": theme["primary"],
            },
            inputBorderColor: {
                "border-color":  theme["dark"] + ' !important',
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
                "background": theme["info"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background": theme["white"],
                "border-color":  theme["dark"] + ' !important',
            },
            inputTextColor:{
                "color": theme["dark"],
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
                "background": theme["info"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            unselectedUnprocessedWindingButton: {
                "background": theme["danger"],
                "color": theme["dark"],
            },
            unselectedProcessedWindingButton: {
                "background": theme["light"],
                "border-color":  theme["dark"] + ' !important',
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
                "background": theme["secondary"],
                "color": theme["white"],
            },
            removeOperatingPointButton: {
                "background": theme["danger"],
                "color": theme["white"],
            },
            modifyNumberWindingsButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            goBackSelectingButton: {
                "background": theme["light"],
                "border-color": theme["light"],
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
                "color": theme["white"],
                "font-size": '1.25rem',
            },

            operatingPointBgColor:{
                "background": theme["light"],
                "border-color":  theme["dark"] + ' !important',
            },
            windingBgColor:{
                "background": theme["light"],
                "border-color":  theme["dark"] + ' !important',
            },
            titleLabelBgColor:{
                "background": theme["info"],
            },
            titleTextColor:{
                "color": theme["dark"],
            },
            commonParameterTextColor:{
                "color": theme["dark"],
            },
            commonParameterBgColor:{
                "background": theme["dark"],
            },
            currentTextColor:{
                "color": theme["warning"],
            },
            voltageTextColor:{
                "color": theme["primary"],
            },
            currentBgColor:{
                "background": theme["warning"],
            },
            voltageBgColor:{
                "background": theme["primary"],
            },
            graphBgColor:{
                "background": theme["info"],
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
                "background": theme["info"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background": theme["white"],
                "border-color":  theme["dark"] + ' !important',
            },
            inputTextColor:{
                "color": theme["dark"],
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

        this.catalog = {
            main: {
                "background": theme["info"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            tableHeader: {
                "background": theme["dark"],
                "color": theme["white"],
            },
            tableBody: {
                "background": theme["info"],
                "color": theme["dark"],
            },
            tableBodyReference: {
                "background": theme["info"],
                "color": theme["primary"],
            },
            viewButton: {
                "background": theme["secondary"],
                "color": theme["white"],
                "border-color":  theme["secondary"] + ' !important',
            },
            search: {
                "background": theme["white"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
        };

        this.magneticBuilder = {
            main: {
                "background": theme["info"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            customizeButton: {
                "background": theme["info"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            loadFromLibraryButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            adviseButton: {
                "background": theme["primary"],
                "color": theme["white"],
            },
            showAlignmentOptionsButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            showMarginOptionsButton: {
                "background": theme["secondary"],
                "color": theme["white"],
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
                "background": theme["warning"],
                "color": theme["white"],
                "border-color":  theme["warning"] + ' !important',
            },
            wireVisualizerButton: {
                "background": "transparent",
                "color": theme["white"],
                "border-color":  theme["dark"] + ' !important',
                "display": ['-webkit-slider-thumb']
            },
            graphBgColor:{
                "background": theme["info"],
            },
            graphLineColor:{
                "color": theme["warning"],
            },
            graphPointsColor:{
                "color": theme["danger"],
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
                "background": theme["info"] + ' !important',
                "background-image": "none !important",
            },
            inputLabelDangerBgColor:{
                "color": theme["danger"],
            },
            inputValueBgColor:{
                "background": theme["white"],
                "border-color":  theme["dark"] + ' !important',
            },
            inputTextColor:{
                "color": theme["dark"],
            },
            inputSelectedTextColor:{
                "color": theme["warning"],
            },
            inputErrorTextColor:{
                "color": theme["danger"],
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
                "background": theme["white"],
                "color": theme["dark"],
            },
            button: {
                "background": theme["light"],
                "color": theme["dark"],
            },
            setting: {
                "background": theme["white"],
                "color": theme["dark"],
            },
            closeButton: {
                "background": theme["light"],
                "color": theme["dark"],
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
                "background": theme["white"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
            settingsButton: {
                "background": theme["primary"],
                "color": theme["white"],
            },
            editButton: {
                "background": theme["secondary"],
                "color": theme["white"],
                "border-color":  theme["secondary"] + ' !important',
            },
            confirmButton: {
                "background": theme["success"],
                "color": theme["dark"],
                "border-color":  theme["success"] + ' !important',
            },
            changeToolButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
            orderButton: {
                "background": theme["success"],
                "color": theme["dark"],
                "border-color":  theme["success"] + ' !important',
            },
            setting: {
                "background": theme["dark"],
                "color": theme["white"],
            },
            closeButton: {
                "background": theme["primary"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
            },
        };

        this.header = {
            main: {
                "background": theme["dark"],
                "color": theme["white"],
                "font-size": '1.5rem',
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
                "font-size": '1rem',
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
                "background": theme["info"] + ' !important',
                "color": theme["dark"],
            },
        };

        this.insulationAdviser = {
            main: {
                "background": theme["white"],
                "color": theme["dark"],
                "border-color":  theme["dark"] + ' !important',
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
                "background": theme["info"] + ' !important',
                "background-image": "none !important",
            },
            inputValueBgColor:{
                "background": theme["white"],
            },
            inputTextColor:{
                "color": theme["dark"],
            },
            addElementButtonColor: {
                "color": theme["secondary"],
            },
            removeElementButtonColor: {
                "color": theme["danger"],
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
        catalog,
    }
},
{
    persist: false,
})
