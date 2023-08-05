describe('production notifications', () => {
  it('beta notification', () => {
    cy.visit('https://openmagnetics.com')
    cy.get('[data-test-id=NotificationsModal-accept-button]').click()
  })
})