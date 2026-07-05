// Kirchhoff ⇆ OpenMagnetics magnetic-design handoff (cross-origin, no backend).
//
// The Kirchhoff converter designer (kirchhoff.openconverters.com) opens this app at
// /magnetic_tool?handoff=kirchhoff when a converter's magnetic needs designing. This bridge:
//   1. tells the Kirchhoff opener we're ready (postMessage 'ready'),
//   2. receives the MAS Inputs, loads them into the mas store, and routes to the magnetic adviser,
//   3. exposes sendMagneticToKirchhoff(mas) — the adviser UI calls it on the design the user picks,
//      posting the MAS magnetic back to the Kirchhoff tab to bind into the converter.
//
// It only ever talks to the opener that launched us, and only when ?handoff=kirchhoff is present, so
// a normal openmagnetics.com visit is unaffected.
import { ref } from 'vue'
import { useMasStore } from '/src/stores/mas'

// Reactive flag the adviser UI reads to show a "Send to Kirchhoff" button on each advised design.
export const kirchhoffHandoff = ref(null)   // { ref, origin } while a handoff is active, else null

let opener = null
let handoffRef = null
let openerOrigin = null

// Post the chosen design back to the Kirchhoff tab. `mas` is a full MAS (inputs + magnetic); Kirchhoff
// binds mas.magnetic into the converter component and re-simulates.
export function sendMagneticToKirchhoff(mas) {
  if (!opener || !handoffRef) return false
  opener.postMessage({ source: 'openmagnetics', type: 'magnetic', ref: handoffRef, mas }, openerOrigin || '*')
  return true
}

export function installKirchhoffHandoff(router) {
  const params = new URLSearchParams(window.location.search)
  if (params.get('handoff') !== 'kirchhoff' || !window.opener) return
  opener = window.opener

  window.addEventListener('message', (ev) => {
    if (ev.data?.source !== 'kirchhoff') return
    if (ev.data.type === 'mas-inputs') {
      openerOrigin = ev.origin
      handoffRef = ev.data.ref
      const masStore = useMasStore()
      masStore.resetMas('power')            // seed a valid power MAS, then overlay Kirchhoff's inputs
      masStore.setInputs(ev.data.inputs)
      kirchhoffHandoff.value = { ref: handoffRef, origin: openerOrigin }
      router.push(`${import.meta.env.BASE_URL}magnetic_tool`)   // → engine loader → magnetic adviser
    }
  })

  // Announce readiness so the opener sends the inputs. Retry briefly in case the opener's listener
  // isn't attached the instant we load.
  let tries = 0
  const announce = () => {
    opener.postMessage({ source: 'openmagnetics', type: 'ready' }, '*')
    if (++tries < 10 && !handoffRef) setTimeout(announce, 300)
  }
  announce()
}
