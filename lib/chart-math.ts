export function chartPoints(
  values: number[],
  min: number,
  max: number,
  width = 300,
  height = 130,
) {
  if (!values.length || max <= min || !values.every(Number.isFinite)) return [];
  return values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : (index / (values.length - 1)) * width,
    y:
      height -
      ((Math.min(max, Math.max(min, value)) - min) / (max - min)) * height,
  }));
}
export function boundedProgress(value: number, goal: number) {
  return goal > 0 && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value / goal))
    : 0;
}
