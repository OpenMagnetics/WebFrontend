import DimensionWithTolerance from '/src/components/DataInput/DimensionWithTolerance.vue'
import '/cypress/support/designRequirementsCommands'

describe('DimensionWithTolerance.cy.js', () => {
    it('check minimum', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {minimum: 10};
        const defaultValue = {minimum: 0.0024};
        const dataTestLabel = "lant";
        cy.mount(DimensionWithTolerance, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
            },
        })

        cy.removeField(dataTestLabel, "minimum")
        cy.checkIfRemoved(dataTestLabel, "minimum")
        cy.addField(dataTestLabel, "minimum")
        cy.selectUnit(dataTestLabel, "minimum", 'Alf')
        cy.checkUnit(dataTestLabel, "minimum", 'Alf')
        cy.setField(dataTestLabel, "minimum", 42000)
        cy.checkUnit(dataTestLabel, "minimum", 'kAlf')
        cy.checkValue(dataTestLabel, "minimum", 42)
    })

    it('check nominal', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {nominal: 10};
        const defaultValue = {nominal: 0.0024};
        const dataTestLabel = "lant";
        cy.mount(DimensionWithTolerance, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
            },
        })

        cy.removeField(dataTestLabel, "nominal")
        cy.checkIfRemoved(dataTestLabel, "nominal")
        cy.addField(dataTestLabel, "nominal")
        cy.selectUnit(dataTestLabel, "nominal", 'Alf')
        cy.checkUnit(dataTestLabel, "nominal", 'Alf')
        cy.setField(dataTestLabel, "nominal", 42000)
        cy.checkUnit(dataTestLabel, "nominal", 'kAlf')
        cy.checkValue(dataTestLabel, "nominal", 42)
    })

    it('check maximum', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {maximum: 10};
        const defaultValue = {maximum: 0.0024};
        const dataTestLabel = "lant";
        cy.mount(DimensionWithTolerance, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
            },
        })

        cy.removeField(dataTestLabel, "maximum")
        cy.checkIfRemoved(dataTestLabel, "maximum")
        cy.addField(dataTestLabel, "maximum")
        cy.selectUnit(dataTestLabel, "maximum", 'Alf')
        cy.checkUnit(dataTestLabel, "maximum", 'Alf')
        cy.setField(dataTestLabel, "maximum", 42000)
        cy.checkUnit(dataTestLabel, "maximum", 'kAlf')
        cy.checkValue(dataTestLabel, "maximum", 42)
    })

    it('start with minimum', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {minimum: 10};
        const defaultValue = {minimum: 0.0024};
        const dataTestLabel = "lant";
        cy.mount(DimensionWithTolerance, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
            },
        })
        cy.addField(dataTestLabel, "nominal")
        cy.addField(dataTestLabel, "maximum")
        cy.checkValue(dataTestLabel, "nominal", 20)
        cy.checkValue(dataTestLabel, "maximum", 40)
        cy.removeField(dataTestLabel, "nominal")
        cy.removeField(dataTestLabel, "maximum")
        cy.addField(dataTestLabel, "maximum")
        cy.addField(dataTestLabel, "nominal")
        cy.checkValue(dataTestLabel, "nominal", 15)
        cy.checkValue(dataTestLabel, "maximum", 20)
    })

    it('start with nominal', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {nominal: 10};
        const defaultValue = {nominal: 0.0024};
        const dataTestLabel = "lant";
        cy.mount(DimensionWithTolerance, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
            },
        })
        cy.addField(dataTestLabel, "minimum")
        cy.addField(dataTestLabel, "maximum")
        cy.checkValue(dataTestLabel, "minimum", 5)
        cy.checkValue(dataTestLabel, "maximum", 20)
        cy.removeField(dataTestLabel, "minimum")
        cy.removeField(dataTestLabel, "maximum")
        cy.addField(dataTestLabel, "maximum")
        cy.addField(dataTestLabel, "minimum")
        cy.checkValue(dataTestLabel, "minimum", 5)
        cy.checkValue(dataTestLabel, "maximum", 20)
    })

    it('start with maximum', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {maximum: 10};
        const defaultValue = {maximum: 0.0024};
        const dataTestLabel = "lant";
        cy.mount(DimensionWithTolerance, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
            },
        })
        cy.addField(dataTestLabel, "minimum")
        cy.addField(dataTestLabel, "nominal")
        cy.checkValue(dataTestLabel, "nominal", 7.5)
        cy.checkValue(dataTestLabel, "minimum", 5)
        cy.removeField(dataTestLabel, "nominal")
        cy.removeField(dataTestLabel, "minimum")
        cy.addField(dataTestLabel, "nominal")
        cy.addField(dataTestLabel, "minimum")
        cy.checkValue(dataTestLabel, "nominal", 5)
        cy.checkValue(dataTestLabel, "minimum", 2.5)
    })

    it('check errors', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {maximum: 10};
        const defaultValue = {minimum: 1, nominal: 1, maximum: 1};
        const dataTestLabel = "lant";
        cy.mount(DimensionWithTolerance, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
            },
        })
        cy.removeField(dataTestLabel, "maximum")
        cy.checkError(dataTestLabel, "At least one value must be set. Set one or remove the requirement from the menu.\n")

        cy.addField(dataTestLabel, "nominal")
        cy.setField(dataTestLabel, "nominal", 0)
        cy.checkError(dataTestLabel, "Nominal value must be greater than 0.\n")
        cy.removeField(dataTestLabel, "nominal")

        cy.addField(dataTestLabel, "minimum")
        cy.setField(dataTestLabel, "minimum", 0)
        cy.checkError(dataTestLabel, "Minimum value must be greater than 0.\n")
        cy.removeField(dataTestLabel, "minimum")

        cy.addField(dataTestLabel, "maximum")
        cy.setField(dataTestLabel, "maximum", 0)
        cy.checkError(dataTestLabel, "Maximum value must be greater than 0.\n")
        cy.removeField(dataTestLabel, "maximum")

        cy.addField(dataTestLabel, "maximum")
        cy.setField(dataTestLabel, "maximum", 1)
        cy.addField(dataTestLabel, "nominal")
        cy.setField(dataTestLabel, "nominal", 1)
        cy.checkError(dataTestLabel, "Nominal value must be smaller than maximum value. Change or delete one of the fields.\n")

        cy.removeField(dataTestLabel, "maximum")
        cy.addField(dataTestLabel, "minimum")
        cy.setField(dataTestLabel, "minimum", 1)
        cy.checkError(dataTestLabel, "Nominal value must be greater than minimum value. Change or delete one of the fields.\n")

        cy.removeField(dataTestLabel, "nominal")
        cy.addField(dataTestLabel, "maximum")
        cy.setField(dataTestLabel, "maximum", 1)
        cy.checkError(dataTestLabel, "Maximum value must be greater than minimum value. Change or delete one of the fields.\n")

        cy.addField(dataTestLabel, "nominal")
        cy.setField(dataTestLabel, "nominal", 1)
        cy.checkError(dataTestLabel, "Nominal value must be smaller than maximum value. Change or delete one of the fields.\nNominal value must be greater than minimum value. Change or delete one of the fields.\nMaximum value must be greater than minimum value. Change or delete one of the fields.\n")

    })



})

