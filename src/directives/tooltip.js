import { Tooltip } from 'bootstrap';

/**
 * Safely dispose a Bootstrap tooltip, hiding it first to avoid transition errors
 */
function safeDisposeTooltip(el) {
    if (!el._tooltip) return;
    
    try {
        // Hide the tooltip first to complete any transition
        el._tooltip.hide();
        // Use setTimeout to allow hide transition to complete
        setTimeout(() => {
            if (el._tooltip) {
                try {
                    el._tooltip.dispose();
                } catch (e) {
                    // Ignore disposal errors - element may already be removed
                }
                el._tooltip = null;
            }
        }, 150);
    } catch (e) {
        // If hide fails, try to dispose directly
        try {
            el._tooltip.dispose();
        } catch (e2) {
            // Ignore
        }
        el._tooltip = null;
    }
}

export default {
    mounted(el, { value }) {
        if (!value) return;
        
        let tooltipText = '';
        let placement = 'top';
        
        if (typeof value === 'string') {
            tooltipText = value;
        } else if (typeof value === 'object') {
            tooltipText = value.text || '';
            if (value.theme && value.theme.placement) {
                placement = value.theme.placement;
            }
        }
        
        if (!tooltipText) return;
        
        el._tooltip = new Tooltip(el, {
            title: tooltipText,
            placement: placement,
            trigger: 'hover focus',
            container: 'body',
            html: false,
        });
    },
    updated(el, { value }) {
        // Dispose old tooltip safely
        safeDisposeTooltip(el);
        
        if (!value) return;
        
        let tooltipText = '';
        let placement = 'top';
        
        if (typeof value === 'string') {
            tooltipText = value;
        } else if (typeof value === 'object') {
            tooltipText = value.text || '';
            if (value.theme && value.theme.placement) {
                placement = value.theme.placement;
            }
        }
        
        if (!tooltipText) return;
        
        // Delay creation slightly to ensure old tooltip is fully disposed
        setTimeout(() => {
            if (!el._tooltip) {
                el._tooltip = new Tooltip(el, {
                    title: tooltipText,
                    placement: placement,
                    trigger: 'hover focus',
                    container: 'body',
                    html: false,
                });
            }
        }, 160);
    },
    unmounted(el) {
        safeDisposeTooltip(el);
    },
};
