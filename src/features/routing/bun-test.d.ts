declare module "bun:test" {
  type TestCallback = () => void | Promise<void>;

  export function describe(name: string, callback: TestCallback): void;
  export function test(name: string, callback: TestCallback): void;
  export function expect<T>(actual: T): {
    toEqual(expected: unknown): void;
    toBeNull(): void;
    toMatchObject(expected: object): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
  };
}
