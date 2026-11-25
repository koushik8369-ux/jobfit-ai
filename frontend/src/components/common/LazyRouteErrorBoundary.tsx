import React, { Component } from 'react';

interface LazyRouteErrorBoundaryProps {
  children: React.ReactNode;
  onReload?: () => void;
}

interface LazyRouteErrorBoundaryState {
  hasError: boolean;
}

export class LazyRouteErrorBoundary extends Component<
  LazyRouteErrorBoundaryProps,
  LazyRouteErrorBoundaryState
> {
  state: LazyRouteErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): LazyRouteErrorBoundaryState {
    return { hasError: true };
  }

  private reload = () => {
    if (this.props.onReload) {
      this.props.onReload();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-[45vh] max-w-xl flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
          <h1 className="text-xl font-semibold text-white">This page could not be loaded</h1>
          <p className="text-sm text-slate-400">Reload JOBFIT AI to try loading the page again.</p>
          <button
            type="button"
            onClick={this.reload}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Reload page
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
