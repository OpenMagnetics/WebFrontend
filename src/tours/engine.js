import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css';

// Resolve a step's `element` spec to a visible DOM element. Accepts a CSS
// selector string, a function returning an element, or an array of either —
// the first candidate that resolves to an on-screen element wins, so steps
// can carry fallback anchors for views whose markup varies by state.
export function resolveStepElement(element) {
    const candidates = Array.isArray(element) ? element : [element];
    for (const candidate of candidates) {
        const el = typeof candidate === 'function'
            ? candidate()
            : document.querySelector(candidate);
        if (el != null && el.getClientRects().length > 0) {
            return el;
        }
    }
    return null;
}

// Start an interactive guided tour (darkened overlay + spotlight + popover).
// `tour` is { id, steps: [{ element?, title, description, side?, align? }] }.
// Steps whose anchor is not currently on screen are dropped (their UI is
// hidden in the current state); anchor-less steps render centered. Anchors
// are re-resolved lazily at highlight time so re-renders mid-tour keep working.
export function startTour(tour) {
    if (tour == null || !Array.isArray(tour.steps) || tour.steps.length === 0) {
        throw new Error(`startTour: tour "${tour?.id}" has no steps`);
    }

    const steps = tour.steps
        .filter((step) => step.element == null || resolveStepElement(step.element) != null)
        .map((step) => ({
            element: step.element == null ? undefined : () => resolveStepElement(step.element),
            popover: {
                title: step.title,
                description: step.description,
                side: step.side,
                align: step.align,
            },
        }));

    const driverObj = driver({
        showProgress: steps.length > 1,
        progressText: '{{current}} of {{total}}',
        nextBtnText: 'Next',
        prevBtnText: 'Back',
        doneBtnText: 'Done',
        overlayOpacity: 0.72,
        stagePadding: 6,
        stageRadius: 10,
        smoothScroll: true,
        popoverClass: 'om-tour-popover',
        steps,
    });
    driverObj.drive();
    return driverObj;
}
