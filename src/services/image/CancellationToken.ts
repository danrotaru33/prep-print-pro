
export class CancellationToken {
  private cancelled = false;
  private reason?: string;

  cancel(reason?: string): void {
    this.cancelled = true;
    this.reason = reason;
  }

  get isCancelled(): boolean {
    return this.cancelled;
  }

  get cancellationReason(): string | undefined {
    return this.reason;
  }

  throwIfCancelled(): void {
    if (this.cancelled) {
      throw new Error(`Processing cancelled${this.reason ? `: ${this.reason}` : ''}`);
    }
  }
}
