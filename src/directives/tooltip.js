import { Tooltip } from 'bootstrap';

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
        // Dispose old tooltip
        if (el._tooltip) {
            el._tooltip.dispose();
            el._tooltip = null;
        }
        
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
    unmounted(el) {
        if (el._tooltip) {
            el._tooltip.dispose();
            el._tooltip = null;
        }
    },
};
