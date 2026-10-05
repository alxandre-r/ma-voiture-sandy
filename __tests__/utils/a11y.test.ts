import { onActivateKey } from '@/lib/utils/a11y';

import type { KeyboardEvent } from 'react';

function keyEvent(key: string, onSelf = true) {
  const target = {};
  return {
    key,
    target,
    currentTarget: onSelf ? target : {},
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLElement>;
}

describe('onActivateKey', () => {
  it('runs the action on Enter and Space', () => {
    const action = vi.fn();
    onActivateKey(action)(keyEvent('Enter'));
    onActivateKey(action)(keyEvent(' '));
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('ignores other keys and keys from nested elements', () => {
    const action = vi.fn();
    onActivateKey(action)(keyEvent('a'));
    onActivateKey(action)(keyEvent('Enter', false));
    expect(action).not.toHaveBeenCalled();
  });
});
