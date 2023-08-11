import Dimension from '/src/components/DataInput/Dimension.vue'
import '/cypress/support/designRequirementsCommands'

describe('Dimension.cy.js', () => {
    it('check scale', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {"Alf": 10};
        const defaultValue = 0.0024;
        const dataTestLabel = "lant";
        cy.mount(Dimension, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
            },
        })

        cy.selectUnit(dataTestLabel, null, 'Alf')
        cy.checkUnit(dataTestLabel, null, 'Alf')
        cy.setField(dataTestLabel, null, 42000)
        cy.checkUnit(dataTestLabel, null, 'kAlf')
        cy.checkValue(dataTestLabel, null, 42)
    })

    it('check errors do not allow negative', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {"Alf": 10};
        const defaultValue = 0.0024;
        const dataTestLabel = "lant";
        cy.mount(Dimension, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
                allowNegative: false,
            },
        })
        cy.setField(dataTestLabel, null, 0)
        cy.checkError(dataTestLabel, "Value must be greater or equal than 0.\n")

        cy.setField(dataTestLabel, null, -42)
        cy.checkError(dataTestLabel, "Value must be greater or equal than 0.\n")

    })
    it.only('check errors allow negative', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {"Alf": 10};
        const defaultValue = 0.0024;
        const dataTestLabel = "lant";
        cy.mount(Dimension, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                defaultValue: defaultValue,
                dataTestLabel: dataTestLabel,
                allowNegative: true,
            },
        })
        cy.setField(dataTestLabel, null, 0)
        cy.checkError(dataTestLabel, "")

        cy.setField(dataTestLabel, null, -42)
        cy.checkError(dataTestLabel, "")

    })



})

