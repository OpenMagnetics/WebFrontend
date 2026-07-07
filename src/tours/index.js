import { TOURS, resolveTourId } from './definitions';
import { startTour } from './engine';

export { TOURS, resolveTourId, startTour };

// Entry point used by the header Help button: pick the tour matching the
// current view (route + tool subsection) and run it.
export function startTourForContext(routeName, stateStore) {
    const tourId = resolveTourId(routeName, stateStore);
    const tour = TOURS[tourId];
    if (tour == null) {
        throw new Error(`No tour registered for id "${tourId}" (route "${routeName}")`);
    }
    return startTour({ id: tourId, ...tour });
}
