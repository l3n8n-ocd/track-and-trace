export async function connection() {}
export function after(_task: () => unknown): never {
  void _task;
  throw new Error("Background jobs must run on the API server.");
}
