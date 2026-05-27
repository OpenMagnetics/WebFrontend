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
    const emiSpectrum = ref({});
    const crossReferencer = ref({});

    function setTheme(theme) {
        this.theme = theme;

        // Sync CSS custom properties so components can use var(--om-primary) etc.
        const root = document.documentElement;
        if (root) {
            root.style.setProperty('--om-light', theme['light'] || '');
            root.style.setProperty('--om-white', theme['white'] || '');
            root.style.setProperty('--om-dark', theme['dark'] || '');
            root.style.setProperty('--om-primary', theme['primary'] || '');
            root.style.setProperty('--om-secondary', theme['secondary'] || '');
            root.style.setProperty('--om-info', theme['info'] || '');
            root.style.setProperty('--om-success', theme['success'] || '');
            root.style.setProperty('--om-warning', theme['warning'] || '');
            root.style.setProperty('--om-danger', theme['danger'] || '');
            root.style.setProperty('--om-border-color', theme['primary'] || '');
        }

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
                // Let the parent panel paint the background. Only text color stays.
                "color": theme["white"],
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
                // No border at all — the parent panel divides sections with a hairline rule.
            },
            inputFontSize: {
                "font-size": '1rem',
            },
            inputTitleFontSize: {
                "font-size": '1.25rem',
            },
            inputLabelBgColor:{
                // Transparent so labels inherit the parent panel background.
                "background-color": "transparent !important",
                "background-image": "none !important",
            },
            inputValueBgColor:{
                // Inputs are lighter than the panel so they pop, matching the Magnetic Builder.
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
                // Let parent panel paint the background, only text color stays.
                "color": theme["white"],
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
                "background-color": "transparent",
            },
            titleTextColor:{
                "color": theme["white"],
            },
            commonParameterTextColor:{
                "color": theme["white"],
            },
            commonParameterBgColor:{
                "background-color": "transparent",
            },
            currentGraph:{
                "background-color": theme["info"],
                "color": theme["info"],
            },
            voltageGraph:{
                "background-color": theme["success"],
                "color": theme["success"],
            },
            currentTextColor:{
                "color": theme["info"],
            },
            voltageTextColor:{
                "color": theme["success"],
            },
            currentBgColor:{
                "background-color": theme["info"],
            },
            voltageBgColor:{
                "background-color": theme["success"],
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
                // Transparent so labels inherit the parent panel background.
                "background-color": "transparent !important",
                "background-image": "none !important",
            },
            inputValueBgColor:{
                // Slightly lighter than the panel so input values pop.
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
                "background-color": theme["primary"],
                "color": theme["light"],
                "border-color": theme["primary"] + ' !important' ,
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
                // Let parent panel paint the background.
                "color": theme["white"],
            },
            inputFontSize: {
                "font-size": '1rem',
            },
            inputTitleFontSize: {
                "font-size": '1.1rem',
            },
            inputLabelBgColor:{
                // Transparent so labels inherit the parent panel.
                "background-color": "transparent !important",
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
                "font-size": '1rem',
            },
            inputTitleFontSize: {
                "font-size": '1.25rem',
            },
            inputLabelFontSize: {
                "font-size": '1rem',
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

        this.emiSpectrum = {
            bgColor:            theme["light"],
            textColor:          theme["white"],
            titleColor:         theme["white"],
            inputBorderColor:   '#666666',
            cutoffTextColor:    '#d4d4d4',
            noteTextColor:      '#888888',
            sourceLineColor:    '#ff7a7a',
            filteredLineColor:  '#539796',
            limitLineColor:     '#f5c518',
        };

        this.crossReferencer = {
            inputFontSize: {
                "font-size": '1rem',
            },
            inputTitleFontSize: {
                "font-size": '1.25rem',
            },
            inputLabelBgColor: {
                "background-color": "transparent !important",
                "background-image": "none !important",
            },
            inputValueBgColor: {
                "background-color": theme["light"],
            },
            inputTextColor: {
                "color": theme["white"],
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
        emiSpectrum,
        crossReferencer,
    }
},
{
    persist: false,
})
