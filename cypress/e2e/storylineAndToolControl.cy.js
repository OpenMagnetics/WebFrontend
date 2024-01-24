import '/cypress/support/toolsCommands'
import '/cypress/support/storylineCommands'


describe('Storyline', () => {
    beforeEach(() => {
        cy.viewport(1800, 1200)
        cy.visit('http://localhost:5173/magnetic_core_adviser')    
    })

    it('initial state', () => {
        cy.checkStorylineAdventureVisible('designRequirements')
        cy.checkTitle("Design Requirements")
    })

    it('Go up and down in storyline', () => {
        cy.checkStorylineAdventureVisible('designRequirements')
        cy.checkTitle("Design Requirements")

        cy.nextTool();

        cy.checkStorylineAdventureVisible('operatingPoints')
        cy.checkTitle("Operating Points")

        cy.nextTool();

        cy.checkTitle("Core Adviser");
        cy.checkStorylineAdventureVisible("coreAdviser");

        cy.previousTool();
        cy.previousTool();

        cy.checkTitle("Design Requirements");
        cy.checkStorylineAdventureVisible("designRequirements");

        // cy.nextTool();
        // cy.nextTool();
        // cy.nextTool();

        // cy.checkTitle("Wire Adviser");
        // cy.checkStorylineAdventureVisible("wireAdviser");

        // Not done yet
        // cy.nextTool();

        // cy.checkTitle("Coil Adviser");
        // cy.checkStorylineAdventureVisible("coilAdviser");

        // cy.nextTool();

        // cy.checkTitle("Summary");
        // cy.checkStorylineAdventureVisible("summary");
    })

    it.skip('Go to core, customize and back', () => {
        cy.checkTitle("Design Requirements");
        cy.checkStorylineAdventureVisible("designRequirements");

        cy.nextTool();

        cy.checkTitle("Operating Points");
        cy.checkStorylineAdventureVisible("operatingPoints");

        cy.nextTool();

        cy.checkTitle("Core Adviser");
        cy.checkStorylineAdventureVisible("coreAdviser");

        cy.customizationTool();

        cy.checkTitle("Core Simulation");
        cy.checkStorylineAdventureVisible("coreAdviser");

        cy.customizationTool();

        cy.checkTitle("Core Customization");
        cy.checkStorylineAdventureVisible("coreAdviser");

        cy.mainTool();

        cy.checkTitle("Core Simulation");
        cy.checkStorylineAdventureVisible("coreAdviser");

        cy.mainTool();

        cy.checkTitle("Core Adviser");
        cy.checkStorylineAdventureVisible("coreAdviser");
    })
})