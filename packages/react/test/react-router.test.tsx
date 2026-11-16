import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, useNavigate, type NavigateFunction } from 'react-router-dom';

const mockBeginRouteSpan = vi.hoisted(() =>
  vi.fn().mockReturnValue({ end: vi.fn(), setAttribute: vi.fn(), addEvent: vi.fn() }),
);

vi.mock('@tindalabs/blindspot', () => ({
  beginRouteSpan: mockBeginRouteSpan,
}));

import { BlindspotRoutes } from '../src/react-router.js';

// Exposes the router's navigate function so a test can drive navigation the way
// an app does, through the router rather than the history object.
let navigate: NavigateFunction;
function CaptureNavigate() {
  navigate = useNavigate();
  return null;
}

function renderRoutes(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <CaptureNavigate />
      <BlindspotRoutes>
        <Route path="/" element={<p>home</p>} />
        <Route path="/tasks" element={<p>tasks</p>} />
      </BlindspotRoutes>
    </MemoryRouter>,
  );
}

describe('BlindspotRoutes', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('renders the matching route and begins the initial span with the query', () => {
    renderRoutes(['/tasks?filter=open']);

    expect(screen.getByText('tasks')).toBeDefined();
    expect(mockBeginRouteSpan).toHaveBeenCalledTimes(1);
    expect(mockBeginRouteSpan).toHaveBeenCalledWith({
      from: '',
      to: '/tasks?filter=open',
      trigger: 'initial',
    });
  });

  it('marks a pushed navigation as user-triggered', async () => {
    renderRoutes(['/']);

    await act(async () => {
      await navigate('/tasks');
    });

    expect(screen.getByText('tasks')).toBeDefined();
    expect(mockBeginRouteSpan).toHaveBeenLastCalledWith({ from: '/', to: '/tasks', trigger: 'user' });
  });

  it('marks a history pop as back-forward', async () => {
    renderRoutes(['/']);
    await act(async () => {
      await navigate('/tasks');
    });

    await act(async () => {
      await navigate(-1);
    });

    expect(screen.getByText('home')).toBeDefined();
    expect(mockBeginRouteSpan).toHaveBeenLastCalledWith({
      from: '/tasks',
      to: '/',
      trigger: 'back-forward',
    });
  });

  it('matches routes against the location prop but traces the real location', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <BlindspotRoutes location="/tasks">
          <Route path="/" element={<p>home</p>} />
          <Route path="/tasks" element={<p>tasks</p>} />
        </BlindspotRoutes>
      </MemoryRouter>,
    );

    expect(screen.getByText('tasks')).toBeDefined();
    expect(mockBeginRouteSpan).toHaveBeenCalledWith({ from: '', to: '/', trigger: 'initial' });
  });
});
