import { describe, expect, it } from "vitest";
import { boundedProgress, chartPoints } from "../lib/chart-math";
import { sampleDay, sampleMeals, sampleTrends } from "../lib/sample-data";
describe("design-only preview data", () => {
  it("meal totals agree with the sample daily calorie value", () => {
    expect(sampleMeals.reduce((sum, m) => sum + m.calories, 0)).toBe(
      sampleDay.calories,
    );
  });
  it("weight preview has the same final value in every time range", () => {
    for (const period of Object.values(sampleTrends.Weight))
      expect(period.values.at(-1)).toBe(78.4);
  });
  it("chart labels and data points have matching lengths", () => {
    for (const metric of Object.values(sampleTrends))
      for (const period of Object.values(metric))
        expect(period.labels.length).toBe(period.values.length);
  });
});
describe("chart coordinate integrity", () => {
  it("maps numeric extrema to exact plot bounds", () => {
    expect(chartPoints([80, 78], 78, 80)).toEqual([
      { x: 0, y: 0 },
      { x: 300, y: 130 },
    ]);
  });
  it("clamps values and handles empty or invalid ranges", () => {
    expect(chartPoints([90, 70], 78, 80)).toEqual([
      { x: 0, y: 0 },
      { x: 300, y: 130 },
    ]);
    expect(chartPoints([], 0, 1)).toEqual([]);
    expect(chartPoints([1], 1, 1)).toEqual([]);
  });
  it("bounds ring progress and invalid goals", () => {
    expect(boundedProgress(150, 100)).toBe(1);
    expect(boundedProgress(-20, 100)).toBe(0);
    expect(boundedProgress(1, 0)).toBe(0);
    expect(boundedProgress(50, 100)).toBe(0.5);
  });
});
