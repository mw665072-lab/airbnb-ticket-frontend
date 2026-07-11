import { Component, type ErrorInfo, type ReactNode } from "react";
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Unhandled render error", error, info); }
  render() { if (!this.state.error) return this.props.children; return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><div className="surface max-w-lg p-8 text-center"><p className="eyebrow">Application error</p><h1 className="mt-3 font-display text-3xl font-extrabold text-slate-900">This screen could not be rendered.</h1><p className="mt-3 text-slate-600">{this.state.error.message}</p><button className="btn-primary mt-6" onClick={() => window.location.reload()}>Reload application</button></div></main>; }
}
