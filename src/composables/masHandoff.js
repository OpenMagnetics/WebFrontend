// "Open in OpenMagnetics" handoff: another page hands this app ONE complete MAS document to open.
//
// The sender (Henry's run page, a self-contained HTML file, opened from file:// or a local path, so
// its origin is "null" and cannot be checked) opens this app at /?handoff=mas with window.open and
// keeps a reference to the window. Protocol:
//   1. this app posts {source: 'openmagnetics', type: 'ready'} to window.opener (retried briefly, like
//      kirchhoffHandoff's announce, in case the opener's listener is not attached yet);
//   2. the opener posts {source: 'henry', type: 'mas', mas} to the window it opened;
//   3. this app loads `mas` with loadMasIntoApp (the path the Load-MAS button and SharedDesign's
//      "Open in OpenMagnetics" use; it refuses a document that is not MAS or does not follow the MAS
//      schema) and answers {source: 'openmagnetics', type: 'mas-loaded'} or
//      {source: 'openmagnetics', type: 'mas-error', message}.
//
// It only listens when ?handoff=mas is in the URL and the window has an opener, and it only accepts a
// message whose event.source IS that opener: a normal openmagnetics.com visit, another window or a
// frame cannot hand it anything. One design per handoff: once a MAS was accepted, later messages are
// ignored. Nothing is saved anywhere (no account, no cloud design); the design becomes the current
// working design, as a loaded file does. A failure is shown to the user (MasHandoffNotice.vue) and
// sent back to the opener; nothing is substituted for a missing or invalid design.
import { ref } from 'vue'
import { useMasStore } from '/MagneticBuilder/src/stores/mas'
import { useTaskQueueStore } from '/src/stores/taskQueue'
import { useStateStore } from '/src/stores/state'
import { useUserStore } from '/src/stores/user'
import { useCloudDesignStore } from '/src/stores/cloudDesign'
import { loadMasIntoApp } from '/src/services/loadMasIntoApp'

export const MAS_HANDOFF_SENDERS = Object.freeze({ henry: 'Henry' })

// What the notice shows: null when no handoff was asked for, else
// { status: 'waiting' | 'loading' | 'loaded' | 'error', sender, message }.
export const masHandoff = ref(null)

const ANNOUNCE_TRIES = 20
const ANNOUNCE_EVERY_MS = 500

export function installMasHandoff(router) {
  const params = new URLSearchParams(window.location.search)
  if (params.get('handoff') !== 'mas') return
  if (!window.opener) {
    masHandoff.value = { status: 'error', sender: null,
      message: 'This page was asked to open a design handed over by another page (?handoff=mas), but no page opened it. Use the "Open in OpenMagnetics" button of the page that holds the design.' }
    return
  }
  const opener = window.opener
  masHandoff.value = { status: 'waiting', sender: null, message: null }
  let accepted = false

  const reply = (message) => opener.postMessage({ source: 'openmagnetics', ...message }, '*')

  window.addEventListener('message', async (ev) => {
    if (ev.source !== opener) return
    const data = ev.data
    if (data == null || typeof data !== 'object' || data.type !== 'mas') return
    if (!Object.prototype.hasOwnProperty.call(MAS_HANDOFF_SENDERS, data.source)) return
    if (accepted) return
    accepted = true
    const sender = MAS_HANDOFF_SENDERS[data.source]
    masHandoff.value = { status: 'loading', sender, message: null }
    try {
      if (data.mas == null || typeof data.mas !== 'object' || Array.isArray(data.mas)) {
        throw new Error(`${sender} sent no MAS document (the message's "mas" is ${data.mas === null ? 'null' : Array.isArray(data.mas) ? 'a list' : typeof data.mas}).`)
      }
      // A design handed over is a new working design, never the linked cloud one.
      useCloudDesignStore().unlink()
      await loadMasIntoApp(JSON.parse(JSON.stringify(data.mas)), {
        masStore: useMasStore(),
        stateStore: useStateStore(),
        userStore: useUserStore(),
        taskQueueStore: useTaskQueueStore(),
        router,
        route: router.currentRoute.value,
      })
      masHandoff.value = { status: 'loaded', sender, message: null }
      reply({ type: 'mas-loaded' })
    } catch (error) {
      console.error(`MAS handoff from ${sender}: the design could not be opened`, error)
      masHandoff.value = { status: 'error', sender, message: `Could not open the design from ${sender}: ${error.message}` }
      reply({ type: 'mas-error', message: error.message })
    }
  })

  let tries = 0
  const announce = () => {
    if (accepted) return
    reply({ type: 'ready' })
    if (++tries < ANNOUNCE_TRIES) {
      setTimeout(announce, ANNOUNCE_EVERY_MS)
      return
    }
    setTimeout(() => {
      if (accepted) return
      masHandoff.value = { status: 'error', sender: null,
        message: `No design arrived from the page that opened OpenMagnetics within ${ANNOUNCE_TRIES * ANNOUNCE_EVERY_MS / 1000} s. Close this tab and press "Open in OpenMagnetics" again.` }
    }, ANNOUNCE_EVERY_MS)
  }
  announce()
}
