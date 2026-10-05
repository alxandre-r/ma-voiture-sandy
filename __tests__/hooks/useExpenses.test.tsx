import { renderHook, waitFor } from '@testing-library/react';

import { useExpenses } from '@/app/(app)/statistics/hooks/useExpenses';

const mockShowError = vi.fn();
vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ showError: mockShowError }),
}));

const okResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

describe('useExpenses', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockShowError.mockReset();
  });

  it('does not fetch when vehicleIds is empty', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch');
    const { result } = renderHook(() => useExpenses([]));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.expenses).toEqual([]);
    expect(result.current.isError).toBe(false);
  });

  it('starts with isLoading true when vehicleIds are provided', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {})); // never resolves
    // Stable reference: defined outside the hook callback so it doesn't change on re-render
    const vehicleIds = [1];
    const { result } = renderHook(() => useExpenses(vehicleIds));
    expect(result.current.isLoading).toBe(true);
  });

  it('populates expenses and sets isLoading false on successful fetch', async () => {
    const mockExpenses = [{ id: 1, vehicle_id: 1, type: 'fuel' }];
    vi.spyOn(global, 'fetch').mockResolvedValue(okResponse({ expenses: mockExpenses }));

    const vehicleIds = [1];
    const { result } = renderHook(() => useExpenses(vehicleIds));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.expenses).toEqual(mockExpenses);
    expect(result.current.isError).toBe(false);
  });

  it('sets isError true and expenses empty on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));

    const vehicleIds = [1];
    const { result } = renderHook(() => useExpenses(vehicleIds));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(result.current.expenses).toEqual([]);
  });

  it('calls fetch with the correct URL', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(okResponse({ expenses: [] }));

    const vehicleIds = [1, 2];
    const { result } = renderHook(() => useExpenses(vehicleIds));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchSpy).toHaveBeenCalledWith('/api/expenses/get?vehicleIds=1,2');
  });

  it('sets isError on an HTTP error status on the first load (B22)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Erreur serveur inattendue' }),
    } as Response);

    const vehicleIds = [1];
    const { result } = renderHook(() => useExpenses(vehicleIds));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isError).toBe(true);
    expect(mockShowError).not.toHaveBeenCalled();
  });

  it('keeps the previous data and toasts the error when a refetch fails (B22)', async () => {
    const mockExpenses = [{ id: 1, vehicle_id: 1, type: 'fuel' }];
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(okResponse({ expenses: mockExpenses }))
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Non autorisé' }),
      } as Response);

    const { result, rerender } = renderHook(({ ids }) => useExpenses(ids), {
      initialProps: { ids: [1] },
    });
    await waitFor(() => expect(result.current.expenses).toEqual(mockExpenses));

    rerender({ ids: [1, 2] });
    await waitFor(() => expect(mockShowError).toHaveBeenCalledWith('Non autorisé'));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current.expenses).toEqual(mockExpenses);
    expect(result.current.isError).toBe(false);
  });
});
