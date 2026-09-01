import { Component, type ReactNode } from "react";

/** Keeps a failed GLB load from unmounting the whole canvas. */
export class ModelBoundary extends Component<
  { children: ReactNode; onError?: (message: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[hologram] model failed to load", error);
    this.props.onError?.(
      error instanceof Error ? error.message : "Model failed to load.",
    );
  }

  componentDidUpdate(prev: { children: ReactNode }) {
    if (prev.children !== this.props.children && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
