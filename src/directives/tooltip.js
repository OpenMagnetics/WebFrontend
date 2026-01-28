import { Tooltip } from 'bootstrap';

/**
 * Create a tooltip and ensure _activeTrigger is always initialized
 */
function createSafeTooltip(el, options) {
    const tooltip = new Tooltip(el, options);
    // Ensure _activeTrigger is always an object to prevent Object.values() errors
    if (!tooltip._activeTrigger || typeof tooltip._activeTrigger !== 'object') {
        tooltip._activeTrigger = {};
    }
    return tooltip;
}

/**
 * Safely dispose a Bootstrap tooltip, avoiding _isWithActiveTrigger errors
 */
function safeDisposeTooltip(el) {
    if (!el._tooltip) return;
    
    const tooltip = el._tooltip;
    el._tooltip = null; // Clear reference immediately
    
    try {
        // Ensure _activeTrigger is an object to prevent Object.values() error
        if (!tooltip._activeTrigger || typeof tooltip._activeTrigger !== 'object') {
            tooltip._activeTrigger = {};
        }
        
        // Remove the tip element directly from DOM if it exists
        const tip = tooltip.tip;
        if (tip && tip.parentNode) {
            tip.parentNode.removeChild(tip);
        }
        
        // Now dispose - this should be safe
        tooltip.dispose();
    } catch (e) {
        // Last resort: try to clean up manually
        try {
            const tip = tooltip.tip;
            if (tip && tip.parentNode) {
                tip.parentNode.removeChild(tip);
            }
        } catch (e2) {
            // Ignore cleanup errors
        }
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
        
        el._tooltip = createSafeTooltip(el, {
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
                el._tooltip = createSafeTooltip(el, {
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
