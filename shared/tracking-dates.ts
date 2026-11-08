const DATE_PARTS = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

function dateParts(
  date: Date,
  timeZone: string,
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function localDateKey(date: Date, timeZone: string): string {
  const parts = dateParts(date, timeZone);
  return `${parts.year.toString().padStart(4, "0")}-${parts.month
    .toString()
    .padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

function localDateFromKey(key: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) throw new Error(`Invalid local date key: ${key}`);
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function shiftDateKey(key: string, days: number): string {
  const { year, month, day } = localDateFromKey(key);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return DATE_PARTS.format(shifted);
}

/** Convert a local wall-clock date/time to a UTC instant, accounting for DST. */
export function localDateTimeToUtc(
  key: string,
  timeZone: string,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const { year, month, day } = localDateFromKey(key);
  const wallClockAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let candidate = wallClockAsUtc;

  // Fixed-point offset correction converges for normal IANA DST transitions.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const values = Object.fromEntries(
      parts
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    const representedAsUtc = Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day),
      Number(values.hour),
      Number(values.minute),
      Number(values.second),
    );
    const offset = representedAsUtc - candidate;
    const corrected = wallClockAsUtc - offset;
    if (corrected === candidate) break;
    candidate = corrected;
  }
  return new Date(candidate);
}

export type LocalPeriod = {
  start: Date;
  end: Date;
  localDate: string;
};

export function localDayPeriod(now: Date, timeZone: string): LocalPeriod {
  const localDate = localDateKey(now, timeZone);
  return {
    localDate,
    start: localDateTimeToUtc(localDate, timeZone),
    end: localDateTimeToUtc(shiftDateKey(localDate, 1), timeZone),
  };
}

export function mondayWeekPeriod(now: Date, timeZone: string): LocalPeriod {
  const localDate = localDateKey(now, timeZone);
  const { year, month, day } = localDateFromKey(localDate);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = shiftDateKey(localDate, mondayOffset);
  return {
    localDate: monday,
    start: localDateTimeToUtc(monday, timeZone),
    end: localDateTimeToUtc(shiftDateKey(monday, 7), timeZone),
  };
}

export function localDayLabel(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(now);
}
