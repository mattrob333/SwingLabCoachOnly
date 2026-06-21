import { describe, it, expect } from "vitest";
import {
  createEvent,
  serializeEvents,
  type ReviewEventType,
} from "@/lib/review/events";

describe("createEvent", () => {
  it("creates an event with type, timecode, payload, and wallClock", () => {
    const event = createEvent("play", 5.5, { foo: "bar" }, 1000);
    expect(event.id).toBeTruthy();
    expect(event.type).toBe("play");
    expect(event.timecode).toBe(5.5);
    expect(event.payload).toEqual({ foo: "bar" });
    expect(event.wallClock).toBe(1000);
  });

  it("creates unique ids for multiple events", () => {
    const a = createEvent("pause", 0, null, 0);
    const b = createEvent("pause", 0, null, 0);
    expect(a.id).not.toBe(b.id);
  });

  it("defaults payload to null when omitted", () => {
    const event = createEvent("seek", 3, undefined, 0);
    expect(event.payload).toBeNull();
  });

  it("accepts all defined event types", () => {
    const types: ReviewEventType[] = [
      "play",
      "pause",
      "seek",
      "record_start",
      "record_stop",
      "stroke",
    ];
    for (const type of types) {
      const event = createEvent(type, 0, null, 0);
      expect(event.type).toBe(type);
    }
  });
});

describe("serializeEvents", () => {
  it("serializes an array of events to a JSON string", () => {
    const a = createEvent("play", 0, null, 100);
    const b = createEvent("pause", 5, null, 200);
    const json = serializeEvents([a, b]);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].type).toBe("play");
    expect(parsed[1].type).toBe("pause");
  });

  it("returns an empty JSON array for empty input", () => {
    expect(serializeEvents([])).toBe("[]");
  });

  it("preserves payload data through serialization", () => {
    const event = createEvent("seek", 10, { from: 2, to: 10 }, 500);
    const parsed = JSON.parse(serializeEvents([event]));
    expect(parsed[0].payload).toEqual({ from: 2, to: 10 });
  });
});
