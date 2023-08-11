import SeveralElementsFromList from '/src/components/DataInput/SeveralElementsFromList.vue'
import '/cypress/support/designRequirementsCommands'

describe('SeveralElementsFromList.cy.js', () => {
    it('check change', () => {
        const name = "Alf";
        const modelValue = {Alf: ["Pepu"]};
        const options = {pepa: "Pepa", pepe: "Pepe", pepi: "Pepi", pepo: "Pepo", pepu: "Pepu"};
        const dataTestLabel = "lant";

        cy.mount(SeveralElementsFromList, {
            props: {
                name: name,
                modelValue: modelValue,
                options: options,
                dataTestLabel: dataTestLabel
            }
        })

        cy.checkCheckbox(dataTestLabel, "Pepu")
        cy.checkCheckboxUnchecked(dataTestLabel, "Pepa")
        cy.checkCheckboxUnchecked(dataTestLabel, "Pepe")
        cy.checkCheckboxUnchecked(dataTestLabel, "Pepi")
        cy.checkCheckboxUnchecked(dataTestLabel, "Pepo")
        cy.selectCheckbox(dataTestLabel, "Pepi")
        cy.checkCheckbox(dataTestLabel, "Pepi")
        cy.selectCheckbox(dataTestLabel, "Pepo")
        cy.checkCheckbox(dataTestLabel, "Pepo")
        cy.selectCheckbox(dataTestLabel, "Pepe")
        cy.checkCheckbox(dataTestLabel, "Pepe")
        cy.selectCheckbox(dataTestLabel, "Pepa")
        cy.checkCheckbox(dataTestLabel, "Pepa")

        cy.selectCheckboxUnchecked(dataTestLabel, "Pepu")
        cy.selectCheckboxUnchecked(dataTestLabel, "Pepa")
        cy.selectCheckboxUnchecked(dataTestLabel, "Pepe")
        cy.selectCheckboxUnchecked(dataTestLabel, "Pepi")
        cy.selectCheckboxUnchecked(dataTestLabel, "Pepo")
        cy.checkCheckboxUnchecked(dataTestLabel, "Pepa")
        cy.checkCheckboxUnchecked(dataTestLabel, "Pepe")
        cy.checkCheckboxUnchecked(dataTestLabel, "Pepi")
        cy.checkCheckboxUnchecked(dataTestLabel, "Pepu")

    })


})

