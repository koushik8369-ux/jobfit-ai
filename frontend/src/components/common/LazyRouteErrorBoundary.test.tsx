import { lazy, Suspense } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LazyRouteErrorBoundary } from './LazyRouteErrorBoundary';

describe('lazy route error recovery', () => {
  it('shows a reload action when a lazy import is rejected', async () => {
    const onReload = vi.fn();
    const RejectedRoute = lazy(() => Promise.reject(new Error('chunk unavailable')));
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const preventWindowError = (event: Event) => event.preventDefault();
    window.addEventListener('error', preventWindowError);

    try {
      render(
        <LazyRouteErrorBoundary onReload={onReload}>
          <Suspense fallback={<p>Loading route...</p>}>
            <RejectedRoute />
          </Suspense>
        </LazyRouteErrorBoundary>,
      );

      expect(await screen.findByRole('heading', { name: 'This page could not be loaded' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));

      expect(onReload).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener('error', preventWindowError);
      logError.mockRestore();
    }
  });
});
