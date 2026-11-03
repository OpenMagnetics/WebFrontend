<script>
import { useEngineDiagnosticsStore } from '/src/stores/engineDiagnostics'

// Why the current design step cannot continue goes to the Engine log (footer button), one ERROR
// record per reason, replaced whenever the reasons change and removed once the step is valid. The
// Continue button reads "Fix Errors" meanwhile. Renders nothing itself.
export default {
    props: {
        // Name of the current step, as the Steps sidebar shows it.
        step: {
            type: String,
            required: true,
        },
        // User-facing reasons the current step cannot continue. Empty while the
        // step is valid.
        errors: {
            type: Array,
            default: () => [],
        },
        // Whether the current step is blocking. A step can block without naming
        // a reason (subsections that still emit only the boolean), and that is
        // precisely the case this exists to stop being silent.
        blocked: {
            type: Boolean,
            default: false,
        },
    },
    setup() {
        const engineDiagnosticsStore = useEngineDiagnosticsStore();
        return { engineDiagnosticsStore };
    },
    computed: {
        // Never report an empty complaint: if the step blocks without saying
        // why, say at least that much.
        messages() {
            if (!this.blocked) return [];
            if (this.errors.length > 0) return this.errors;
            return [`The "${this.step}" step did not say what is missing. This is a bug in the page: please send a report with the bug button so we can fix it.`];
        },
    },
    watch: {
        messages: {
            handler(value) {
                this.engineDiagnosticsStore.replaceStepBlockers(this.step, value);
            },
            immediate: true,
        },
        step() {
            this.engineDiagnosticsStore.replaceStepBlockers(this.step, this.messages);
        },
    },
    unmounted() {
        this.engineDiagnosticsStore.replaceStepBlockers(this.step, []);
    },
    render() {
        return null;
    },
}
</script>
