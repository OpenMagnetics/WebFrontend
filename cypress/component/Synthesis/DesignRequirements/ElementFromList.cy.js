import ElementFromList from '/src/components/DataInput/ElementFromList.vue'
import '/cypress/support/designRequirementsCommands'

describe('ElementFromList.cy.js', () => {
    it('check change', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {Alf: "Pepu"};
        const options = {pepa: "Pepa", pepe: "Pepe", pepi: "Pepi", pepo: "Pepo", pepu: "Pepu"};
        const dataTestLabel = "lant";

        cy.mount(ElementFromList, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                options: options,
                dataTestLabel: dataTestLabel,
                onUpdatedNumberElements: cy.spy().as('onUpdatedNumberElements'),
            }
        })

        cy.checkElement(dataTestLabel, "Pepu")
        cy.selectElement(dataTestLabel, "Pepi")
        cy.get('@onUpdatedNumberElements').should('have.been.calledOnce')
        cy.get('@onUpdatedNumberElements').should('have.been.calledWith', 'Pepi', name)
        cy.checkElement(dataTestLabel, "Pepi")

    })

    it('check title same row', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {Alf: "Pepu"};
        const options = {pepa: "Pepa", pepe: "Pepe", pepi: "Pepi", pepo: "Pepo", pepu: "Pepu"};
        const dataTestLabel = "lant";
        const altText = "lant";
        const titleSameRow = true;

        cy.mount(ElementFromList, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                options: options,
                dataTestLabel: dataTestLabel,
                altText: altText,
                titleSameRow: titleSameRow,
                onUpdatedNumberElements: cy.spy().as('onUpdatedNumberElements'),
            }
        })

        cy.get(`[data-cy=${dataTestLabel}-alt-title-label]`).should('not.exist')
        cy.get(`[data-cy=${dataTestLabel}-title]`).should('not.exist')
        cy.get(`[data-cy=${dataTestLabel}-same-row-label]`).should('exist').should('have.text', name)

    })

    it('check alt title row', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {Alf: "Pepu"};
        const options = {pepa: "Pepa", pepe: "Pepe", pepi: "Pepi", pepo: "Pepo", pepu: "Pepu"};
        const dataTestLabel = "lant";
        const altText = "lant";
        const titleSameRow = false;

        cy.mount(ElementFromList, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                options: options,
                dataTestLabel: dataTestLabel,
                altText: altText,
                titleSameRow: titleSameRow,
                onUpdatedNumberElements: cy.spy().as('onUpdatedNumberElements'),
            }
        })

        cy.get(`[data-cy=${dataTestLabel}-alt-title-label]`).should('exist').should('have.value', altText)
        cy.get(`[data-cy=${dataTestLabel}-title]`).should('not.exist')
        cy.get(`[data-cy=${dataTestLabel}-same-row-label]`).should('not.exist')

    })

    it('check title different row', () => {
        const name = "Alf";
        const unit = "Alf";
        const modelValue = {Alf: "Pepu"};
        const options = {pepa: "Pepa", pepe: "Pepe", pepi: "Pepi", pepo: "Pepo", pepu: "Pepu"};
        const dataTestLabel = "lant";
        const titleSameRow = false;

        cy.mount(ElementFromList, {
            props: {
                name: name,
                unit: unit,
                modelValue: modelValue,
                options: options,
                dataTestLabel: dataTestLabel,
                titleSameRow: titleSameRow,
                onUpdatedNumberElements: cy.spy().as('onUpdatedNumberElements'),
            }
        })

        cy.get(`[data-cy=${dataTestLabel}-alt-title-label]`).should('not.exist')
        cy.get(`[data-cy=${dataTestLabel}-title]`).should('exist').should('have.text', name)
        cy.get(`[data-cy=${dataTestLabel}-same-row-label]`).should('not.exist')

    })



})

