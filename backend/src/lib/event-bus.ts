import { EventEmitter } from "events";
import type { ChatSSEEvent } from "@shared/events";

export class RequestEventBus extends EventEmitter {
  publish(event: ChatSSEEvent): void {
    this.emit("sse", event);
  }

  subscribe(listener: (event: ChatSSEEvent) => void): void {
    this.on("sse", listener);
  }
}
