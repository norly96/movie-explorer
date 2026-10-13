// jsdom doesn't implement IntersectionObserver (plan.md Risk #2).
// vitest.setup.ts installs this on globalThis; tests import the class to
// drive intersections by hand.
export class MockIntersectionObserver implements IntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  static reset() {
    MockIntersectionObserver.instances = [];
  }

  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds: readonly number[] = [];
  readonly observed = new Set<Element>();
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.rootMargin = options?.rootMargin ?? "0px";
    MockIntersectionObserver.instances.push(this);
  }

  observe(target: Element) {
    this.observed.add(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  // Test helper: reports every observed element as (not) intersecting.
  trigger(isIntersecting: boolean) {
    const entries = [...this.observed].map(
      (target) => ({ isIntersecting, target }) as IntersectionObserverEntry
    );
    this.callback(entries, this);
  }
}
