import type { RequestEventBus } from "@/lib/event-bus";

// Stub — citation resolution not yet implemented.
export async function resolveCitations(
  _threadId: string,
  _content: string,
  _bus: RequestEventBus,
): Promise<void> {}
