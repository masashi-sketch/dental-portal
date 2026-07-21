type TimingEntry = { name: string; duration: number };

export class ServerTiming {
  private readonly startedAt = performance.now();
  private lastMark = this.startedAt;
  private readonly entries: TimingEntry[] = [];

  mark(name: string) {
    const now = performance.now();
    this.entries.push({ name: name.replace(/[^a-zA-Z0-9_-]/g, '_'), duration: now - this.lastMark });
    this.lastMark = now;
  }

  header() {
    const total = performance.now() - this.startedAt;
    return [...this.entries, { name: 'total', duration: total }]
      .map(({ name, duration }) => `${name};dur=${duration.toFixed(1)}`)
      .join(', ');
  }
}
