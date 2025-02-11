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

    function setTheme(theme) {
        this.theme = theme;

        console.log(theme)

        this.main = {
            "background": theme["dark"],
            "color": theme["white"],
            "border-color":  theme["danger"] + '!important',
        };
        this.storyline = {
            main: {
                "background": theme["white"],
                "color": theme["dark"],
                "border-color":  theme["danger"] + '!important',
            },
            activeButton: {
                "background": theme["info"],
                "color": theme["white"],
                "border-color":  theme["danger"] + '!important',
            },
            availableButton: {
                "background": theme["danger"],
                "color": theme["dark"],
                "border-color":  theme["danger"] + '!important',
            },
            pendingButton: {
                "background": theme["succes"],
                "color": theme["dark"],
                "border-color":  theme["danger"] + '!important',
            },
            continueButton: {
                "background": theme["info"],
                "color": theme["white"],
                "border-color":  theme["danger"] + '!important',
            },
            arrow: {
                "color": theme["success"],
            },
        };

        this.designRequirements = {
            main: {
                "background": theme["white"],
                "color": theme["dark"],
                "border-color":  theme["danger"] + '!important',
            },
            requiredButton: {
                "background": theme["light"],
                "color": theme["dark"],
                "border-color": theme["light"],
            },
            addButton: {
                "background": theme["danger"],
                "color": theme["white"],
            },
            removeButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
            requirementButton: {
                "background": theme["info"],
                "color": theme["white"],
                "border-color": theme["info"],
            },
            inputBorderColor: {
                "border-color":  theme["danger"] + '!important',
            },
            inputFontSize: {
                "font-size": '2rem',
                // "font-size": '1rem',
            },
            inputTitleFontSize: {
                "font-size": '2.5rem',
                // "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                "background": theme["success"],
            },
            inputValueBgColor:{
                "background": theme["info"],
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
                "background": theme["white"],
                "color": theme["dark"],
                "border-color":  theme["danger"] + '!important',
            },
            unselectedUnprocessedWindingButton: {
                "background": theme["danger"],
                "color": theme["white"],
            },
            unselectedProcessedWindingButton: {
                "background": theme["danger"],
                "color": theme["white"],
            },
            selectedWindingButton: {
                "background": theme["success"],
                "color": theme["white"],
            },
            reflectWindingButton: {
                "background": theme["info"],
                "color": theme["dark"],
            },
            addOperatingPointButton: {
                "background": theme["info"],
                "color": theme["dark"],
            },
            selectOperatingPointButton: {
                "background": theme["danger"],
                "color": theme["white"],
            },
            removeOperatingPointButton: {
                "background": theme["white"],
                "color": theme["dark"],
            },
            modifyNumberWindingsButton: {
                "background": theme["info"],
                "color": theme["dark"],
            },
            goBackSelectingButton: {
                "background": theme["success"],
                "border-color": theme["success"],
                "color": theme["white"],
            },
            confirmColumnsButton: {
                "background": theme["success"],
                "border-color": theme["success"],
                "color": theme["white"],
            },
            typeButton: {
                "background": theme["info"],
                "border-color": theme["info"],
                "color": theme["dark"],
                "font-size": '1.25rem',
            },

            titleLabelBgColor:{
                "background": theme["white"],
            },
            titleTextColor:{
                "color": theme["dark"],
            },
            commonParameterTextColor:{
                "color": theme["danger"],
            },
            commonParameterBgColor:{
                "background": theme["success"],
            },
            currentTextColor:{
                "color": theme["secondary"],
            },
            voltageTextColor:{
                "color": theme["danger"],
            },
            currentBgColor:{
                "background": theme["white"],
            },
            voltageBgColor:{
                "background": theme["danger"],
            },


            inputFontSize: {
                "font-size": '2rem',
                // "font-size": '1rem',
            },
            inputTitleFontSize: {
                "font-size": '2.5rem',
                // "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                "background": theme["success"],
            },
            inputValueBgColor:{
                "background": theme["info"],
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

        this.magneticBuilder = {
            main: {
                "background": theme["white"],
                "color": theme["success"],
                "border-color":  theme["danger"] + '!important',
            },
            customizeButton: {
                "background": theme["danger"],
                "color": theme["white"],
            },
            loadFromLibraryButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
            adviseButton: {
                "background": theme["danger"],
                "color": theme["white"],
            },
            showAlignmentOptionsButton: {
                "background": theme["success"],
                "color": theme["white"],
            },
            showMarginOptionsButton: {
                "background": theme["success"],
                "color": theme["white"],
            },
            coilVisualizerButton: {
                "background": theme["success"],
                "color": theme["white"],
            },
            wireVisualizerButton: {
                "background": "transparent",
                "color": theme["white"],
                "display": ['-webkit-slider-thumb']
            },

            inputFontSize: {
                "font-size": '2rem',
                // "font-size": '1rem',
            },
            inputTitleFontSize: {
                "font-size": '2.5rem',
                // "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                "background": theme["success"],
            },
            inputValueBgColor:{
                "background": theme["info"],
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

        this.controlPanel = {
            main: {
                "background": theme["white"],
                "color": theme["dark"],
            },
            button: {
                "background": theme["info"],
                "color": theme["white"],
            },
            setting: {
                "background": theme["info"],
                "color": theme["white"],
            },
            closeButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
        };

        this.toolSelector = {
            main: {
                "background": theme["white"],
                "color": theme["dark"],
            },
            explanation: {
                "background": theme["dark"],
                "color": theme["white"],
            },
            button: {
                "background": theme["info"],
                "color": theme["white"],
            },
            promotedButton: {
                "background": theme["secondary"],
                "color": theme["danger"],
            },
        };

        this.contextMenu = {
            main: {
                "background": theme["white"],
                "color": theme["dark"],
                "border-color":  theme["danger"] + '!important',
            },
            settingsButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
            editButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
            confirmButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
            orderButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
            setting: {
                "background": theme["info"],
                "color": theme["white"],
            },
            closeButton: {
                "background": theme["info"],
                "color": theme["white"],
            },
        };

        this.header = {
            main: {
                "background": theme["white"],
                "color": theme["dark"],
            },
            title: {
                "background": theme["danger"],
                "color": theme["primary"],
            },
            musings: {
                "background": theme["success"],
                "color": theme["dark"],
            },
            designSectionDropdown: {
                "background": theme["info"],
                "color": theme["white"],
                "border-color": theme["danger"] + '!important' ,
            },
            othersSectionDropdown: {
                "background": theme["info"],
                "color": theme["white"],
                "border-color": theme["danger"] + '!important' ,
            },
            donateButton: {
                "background": theme["white"],
                "color": theme["info"],
            },
            bugButton: {
                "background": theme["secondary"],
                "color": theme["danger"],
            },
            githubButton: {
                "background": theme["secondary"],
                "color": theme["white"],
            },
        };


        this.engineLoader = {
            main: {
                "background": theme["white"],
                "color": theme["dark"],
            },
        }
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
    }
},
{
    persist: false,
})
