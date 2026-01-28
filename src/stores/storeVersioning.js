/**
 * Store Versioning Utility
 * 
 * This module handles clearing persistent stores when they are older than a specified date.
 * When the store schema changes (field names, structure, etc.), update the STORE_VERSION_DATE
 * to a current date to force all users to have their stores cleared on next load.
 */

// ============================================================================
// CONFIGURATION: Update this date when store schema changes
// ============================================================================
// Format: 'YYYY-MM-DD'
// When you make breaking changes to store fields, update this date to today's date.
// All stores saved before this date will be automatically cleared.
export const STORE_VERSION_DATE = '2026-01-28';

// Key used in localStorage to track when stores were last saved
const STORE_VERSION_KEY = 'openMagnetics_storeVersionDate';

// List of all persistent store keys used by Pinia
// These correspond to the store names in defineStore("name", ...)
const PERSISTENT_STORE_KEYS = [
    'adviseCache',
    'catalog',
    'crossReferencer',
    'mas',
    'settings',
    'state',
    'user',
];

/**
 * Clears all persistent stores from localStorage
 */
function clearAllPersistentStores() {
    console.log('[StoreVersioning] Clearing all persistent stores due to version update...');
    
    PERSISTENT_STORE_KEYS.forEach(key => {
        if (localStorage.getItem(key) !== null) {
            localStorage.removeItem(key);
            console.log(`[StoreVersioning] Cleared store: ${key}`);
        }
    });
    
    console.log('[StoreVersioning] All persistent stores cleared.');
}

/**
 * Updates the stored version date to the current version
 */
function updateStoredVersionDate() {
    localStorage.setItem(STORE_VERSION_KEY, STORE_VERSION_DATE);
    console.log(`[StoreVersioning] Updated store version date to: ${STORE_VERSION_DATE}`);
}

/**
 * Checks if the stored version is older than the required version date.
 * If so, clears all persistent stores and updates the version date.
 * 
 * Call this function BEFORE creating the Pinia instance and stores.
 * 
 * @returns {boolean} True if stores were cleared, false otherwise
 */
export function checkAndClearOutdatedStores() {
    const storedVersionDate = localStorage.getItem(STORE_VERSION_KEY);
    
    console.log(`[StoreVersioning] Current version date: ${STORE_VERSION_DATE}`);
    console.log(`[StoreVersioning] Stored version date: ${storedVersionDate || 'not set'}`);
    
    // If no version date is stored, this is either a fresh install or pre-versioning
    // In either case, clear stores to be safe and set the version
    if (!storedVersionDate) {
        console.log('[StoreVersioning] No version date found, clearing stores for safety...');
        clearAllPersistentStores();
        updateStoredVersionDate();
        return true;
    }
    
    // Compare dates
    const storedDate = new Date(storedVersionDate);
    const requiredDate = new Date(STORE_VERSION_DATE);
    
    if (storedDate < requiredDate) {
        console.log(`[StoreVersioning] Stored version (${storedVersionDate}) is older than required (${STORE_VERSION_DATE})`);
        clearAllPersistentStores();
        updateStoredVersionDate();
        return true;
    }
    
    console.log('[StoreVersioning] Stores are up to date, no clearing needed.');
    return false;
}

/**
 * Forces clearing of all persistent stores regardless of version.
 * Useful for debugging or manual reset functionality.
 */
export function forceResetAllStores() {
    clearAllPersistentStores();
    updateStoredVersionDate();
    console.log('[StoreVersioning] Forced reset complete. Please refresh the page.');
}

/**
 * Gets the current stored version date
 * @returns {string|null} The stored version date or null if not set
 */
export function getStoredVersionDate() {
    return localStorage.getItem(STORE_VERSION_KEY);
}
