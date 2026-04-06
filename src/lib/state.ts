/**
 * Flag to suppress config-change prompts triggered by the extension itself.
 * Pattern:
 *   markInternalUpdate();
 *   await config.update(...);
 *   clearInternalUpdate();
 * This avoids the race condition of a fixed-duration timer expiring before
 * config.update() completes in slow environments.
 */
let _internalUpdate = false;

export function markInternalUpdate(): void {
    _internalUpdate = true;
}

export function clearInternalUpdate(): void {
    _internalUpdate = false;
}

export function isInternalUpdate(): boolean {
    return _internalUpdate;
}
