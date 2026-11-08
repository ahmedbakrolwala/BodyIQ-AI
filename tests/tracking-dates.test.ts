import { describe, expect, it } from "vitest";
import {
  localDateKey,
  localDayPeriod,
  mondayWeekPeriod,
} from "../shared/tracking-dates";

describe("tracking date boundaries", () => {
  it("uses the local date rather than UTC date", () => {
    const instant = new Date("2026-03-09T03:30:00.000Z");
    expect(localDateKey(instant, "America/New_York")).toBe("2026-03-08");
  });

  it("makes spring-forward and fall-back days half-open at local midnight", () => {
    const spring = localDayPeriod(
      new Date("2026-03-08T12:00:00.000Z"),
      "America/New_York",
    );
    expect(spring.start.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(spring.end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(spring.end.getTime() - spring.start.getTime()).toBe(
      23 * 60 * 60 * 1000,
    );

    const fall = localDayPeriod(
      new Date("2026-11-01T12:00:00.000Z"),
      "America/New_York",
    );
    expect(fall.start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(fall.end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(fall.end.getTime() - fall.start.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("starts weeks on Monday in the requested local zone", () => {
    const week = mondayWeekPeriod(
      new Date("2026-11-08T12:00:00.000Z"),
      "Asia/Kolkata",
    );
    expect(week.localDate).toBe("2026-11-02");
    expect(week.start.toISOString()).toBe("2026-11-01T18:30:00.000Z");
    expect(week.end.toISOString()).toBe("2026-11-08T18:30:00.000Z");
  });
});
