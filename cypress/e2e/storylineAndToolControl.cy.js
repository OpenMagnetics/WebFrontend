import '/cypress/support/toolsCommands'
import '/cypress/support/storylineCommands'


describe('Storyline', {
    viewportWidth: 1800,
    viewportHeight: 1200}, () => {
    beforeEach(() => {
        cy.visit('http://localhost:5173/magnetic_synthesis')
    })

    it('initial state', () => {
        cy.checkStorylineAdventureVisible('designRequirements')
        cy.checkTitle("Design Requirements")
    })

    it('Go up and down in storyline', () => {
        cy.checkStorylineAdventureVisible('designRequirements')
        cy.checkTitle("Design Requirements")

        cy.nextTool();

        cy.checkStorylineAdventureVisible('operationPoints')
        cy.checkTitle("Operating Points")

        cy.nextTool();

        cy.checkTitle("Core Adviser");
        cy.checkStorylineAdventureVisible("coreSelection");

        cy.previousTool();
        cy.previousTool();
        cy.previousTool();
        cy.previousTool();
        cy.previousTool();

        cy.checkTitle("Design Requirements");
        cy.checkStorylineAdventureVisible("designRequirements");

        cy.nextTool();
        cy.nextTool();
        cy.nextTool();

        cy.checkTitle("Wire Adviser");
        cy.checkStorylineAdventureVisible("wireSelection");

        cy.nextTool();

        cy.checkTitle("Coil Adviser");
        cy.checkStorylineAdventureVisible("coilSelection");

        cy.nextTool();

        cy.checkTitle("Magnetic Finalizer");
        cy.checkStorylineAdventureVisible("magneticFinalizer");

        cy.nextTool();
        cy.nextTool();
        cy.nextTool();
        cy.nextTool();
        cy.nextTool();

        cy.checkTitle("Magnetic Finalizer");
        cy.checkStorylineAdventureVisible("magneticFinalizer");
    })

    it('Go to core, customize and back', () => {
        cy.checkTitle("Design Requirements");
        cy.checkStorylineAdventureVisible("designRequirements");

        cy.nextTool();

        cy.checkTitle("Operating Points");
        cy.checkStorylineAdventureVisible("operationPoints");

        cy.nextTool();

        cy.checkTitle("Core Adviser");
        cy.checkStorylineAdventureVisible("coreSelection");

        cy.customizationTool();

        cy.checkTitle("Core Customizer");
        cy.checkStorylineAdventureVisible("coreSelection");

        cy.mainTool();

        cy.checkTitle("Core Adviser");
        cy.checkStorylineAdventureVisible("coreSelection");
    })
})