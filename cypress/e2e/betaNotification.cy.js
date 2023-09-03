describe('production notifications', () => {
  it('beta notification', () => {
    cy.visit('https://openmagnetics.com')
    cy.get('[data-cy=NotificationsModal-accept-button]').click()
  })
})