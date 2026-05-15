type ConsentListener = (granted: boolean) => void;

export class ConsentGate {
  private _granted = false;
  private _listeners: ConsentListener[] = [];

  grant(): void {
    this._granted = true;
    this._listeners.forEach((fn) => fn(true));
  }

  revoke(): void {
    this._granted = false;
    this._listeners.forEach((fn) => fn(false));
  }

  isGranted(): boolean {
    return this._granted;
  }

  onChange(listener: ConsentListener): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }
}
