import type { KeyboardEvent } from 'react';

/**
 * Keyboard activation for a clickable non-button element (`role="button"` + `tabIndex={0}`):
 * Enter or Space run the action. Only when the element itself has focus, so keys typed in a
 * nested input or menu keep their normal behaviour.
 */
export function onActivateKey(action: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };
}
