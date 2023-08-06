// ***********************************************************
// This example support/component.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

import { createPinia } from 'pinia' // or Vuex
import { mount } from 'cypress/vue'
import { h } from 'vue'

import '/src/assets/css/custom.css'
import 'bootstrap';

Cypress.Commands.add('mount', (component, args = {}) => {
  args.global = args.global || {}
  args.global.plugins = args.global.plugins || []
  args.global.plugins.push(createPinia())

  return mount(component, args)
})