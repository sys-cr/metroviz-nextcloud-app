// Unit tests for js/nc-autosave.js — debounced auto-save helper.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounceAutoSave } from '../../js/nc-autosave.js';

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('debounceAutoSave', () => {
    it('does not invoke saveFn before the delay has elapsed', () => {
        const saveFn = vi.fn();
        const trigger = debounceAutoSave({ saveFn, delay: 2000 });

        trigger();
        vi.advanceTimersByTime(1999);

        expect(saveFn).not.toHaveBeenCalled();
    });

    it('invokes saveFn exactly once after the delay', () => {
        const saveFn = vi.fn();
        const trigger = debounceAutoSave({ saveFn, delay: 2000 });

        trigger();
        vi.advanceTimersByTime(2000);

        expect(saveFn).toHaveBeenCalledTimes(1);
    });

    it('coalesces rapid triggers into a single save call', () => {
        const saveFn = vi.fn();
        const trigger = debounceAutoSave({ saveFn, delay: 2000 });

        trigger();
        vi.advanceTimersByTime(500);
        trigger();
        vi.advanceTimersByTime(500);
        trigger();
        vi.advanceTimersByTime(2000);

        expect(saveFn).toHaveBeenCalledTimes(1);
    });

    it('defaults to 2000 ms when no delay is given', () => {
        const saveFn = vi.fn();
        const trigger = debounceAutoSave({ saveFn });

        trigger();
        vi.advanceTimersByTime(1999);
        expect(saveFn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(saveFn).toHaveBeenCalledTimes(1);
    });

    it('preserves the caller `this` context when invoking saveFn', () => {
        const ctx = { currentFileName: 'roadmap-x' };
        let observed = null;
        const saveFn = vi.fn(function () {
            observed = this;
        });
        const trigger = debounceAutoSave({ saveFn, delay: 2000 });

        trigger.call(ctx);
        vi.advanceTimersByTime(2000);

        expect(saveFn).toHaveBeenCalled();
        expect(observed).toBe(ctx);
    });

    it('cancel() prevents a pending save', () => {
        const saveFn = vi.fn();
        const trigger = debounceAutoSave({ saveFn, delay: 2000 });

        trigger();
        trigger.cancel();
        vi.advanceTimersByTime(2000);

        expect(saveFn).not.toHaveBeenCalled();
    });
});
