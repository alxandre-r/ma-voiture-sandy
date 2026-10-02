import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentType } from 'react';

/** Minimal BroadcastChannel: delivers synchronously to every OTHER open channel of the same name. */
class MockChannel {
  static open: MockChannel[] = [];
  static created = 0;
  static receiving: number | null = null;
  readonly index = MockChannel.created++;
  posted: unknown[] = [];
  closed = false;
  private listeners: Array<(event: MessageEvent) => void> = [];

  constructor(readonly name: string) {
    MockChannel.open.push(this);
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
    this.listeners.push(listener);
  }

  removeEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  postMessage(data: unknown) {
    this.posted.push(data);
    for (const other of MockChannel.open) {
      if (other === this || other.name !== this.name) continue;
      MockChannel.receiving = other.index;
      for (const listener of other.listeners) listener({ data } as MessageEvent);
      MockChannel.receiving = null;
    }
  }

  close() {
    this.closed = true;
    MockChannel.open = MockChannel.open.filter((c) => c !== this);
  }
}

/** Channel index that received the message which triggered each reload. */
let reloadedBy: Array<number | null>;
const originalLocation = window.location;

/** Fresh module instances: each import simulates the code of a separate browser tab. */
async function loadTab() {
  vi.resetModules();
  const sync = await import('@/components/demo/DemoModeSync');
  const client = await import('@/lib/demo/client');
  return { DemoModeSync: sync.default as ComponentType<{ isDemo: boolean }>, client };
}

beforeEach(() => {
  MockChannel.open = [];
  MockChannel.created = 0;
  reloadedBy = [];
  vi.stubGlobal('BroadcastChannel', MockChannel);
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload: vi.fn(() => reloadedBy.push(MockChannel.receiving)) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

describe('DemoModeSync', () => {
  it('reloads only the tab whose mode differs from another tab', async () => {
    const realTab = await loadTab();
    render(<realTab.DemoModeSync isDemo={false} />);
    const demoTab = await loadTab();
    render(<demoTab.DemoModeSync isDemo />);

    // Channel 0 belongs to the real tab: it alone reloaded, on the demo tab's announcement
    expect(reloadedBy).toEqual([0]);
  });

  it('does not reload tabs that are in the same mode', async () => {
    const first = await loadTab();
    render(<first.DemoModeSync isDemo />);
    const second = await loadTab();
    render(<second.DemoModeSync isDemo />);
    expect(reloadedBy).toEqual([]);
  });

  it('reloads a demo tab when another tab exits the demo', async () => {
    const demoTab = await loadTab();
    render(<demoTab.DemoModeSync isDemo />);
    const exitingTab = await loadTab();
    exitingTab.client.announceDemoMode(false);
    expect(reloadedBy).toEqual([0]);
  });

  it('ignores the announcements of its own tab (exit then redirect must not race a reload)', async () => {
    const tab = await loadTab();
    render(<tab.DemoModeSync isDemo />);
    tab.client.announceDemoMode(false);
    expect(reloadedBy).toEqual([]);
  });

  it('closes its channel on unmount', async () => {
    const tab = await loadTab();
    const { unmount } = render(<tab.DemoModeSync isDemo />);
    const [channel] = MockChannel.open;
    expect(channel.name).toBe('mv-demo-mode');
    unmount();
    expect(channel.closed).toBe(true);
  });

  it('renders nothing and does not throw without BroadcastChannel', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const tab = await loadTab();
    const { container } = render(<tab.DemoModeSync isDemo />);
    expect(container.innerHTML).toBe('');
    expect(() => tab.client.announceDemoMode(false)).not.toThrow();
  });
});

describe('exitDemoSession', () => {
  it('announces { isDemo: false } to the other tabs', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const otherTab = new MockChannel('mv-demo-mode');
    const delivered = vi.fn();
    otherTab.addEventListener('message', (event) => delivered(event.data));
    const tab = await loadTab();

    await tab.client.exitDemoSession();

    expect(fetchMock).toHaveBeenCalledWith('/api/demo/exit', { method: 'POST' });
    expect(delivered).toHaveBeenCalledOnce();
    expect(delivered).toHaveBeenCalledWith(expect.objectContaining({ isDemo: false }));
  });
});
