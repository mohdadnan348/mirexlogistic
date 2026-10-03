export type DateInput = Date | string | number;

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface DateDifference {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
  totalMilliseconds: number;
  totalSeconds: number;
  totalMinutes: number;
  totalHours: number;
  totalDays: number;
}

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

export const MILLISECONDS_PER_MINUTE =
  MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE;

export const MILLISECONDS_PER_HOUR =
  MILLISECONDS_PER_MINUTE * MINUTES_PER_HOUR;

export const MILLISECONDS_PER_DAY =
  MILLISECONDS_PER_HOUR * HOURS_PER_DAY;

export function toDate(value: DateInput): Date {
  if (value instanceof Date) {
    const date = new Date(value.getTime());

    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    return date;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }

  return date;
}

export function isValidDate(value: unknown): value is DateInput {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return false;
  }

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
}

export function now(): Date {
  return new Date();
}

export function startOfDay(value: DateInput = new Date()): Date {
  const date = toDate(value);

  date.setHours(0, 0, 0, 0);

  return date;
}

export function endOfDay(value: DateInput = new Date()): Date {
  const date = toDate(value);

  date.setHours(23, 59, 59, 999);

  return date;
}

export function startOfWeek(
  value: DateInput = new Date(),
  weekStartsOn = 1,
): Date {
  const date = startOfDay(value);
  const day = date.getDay();

  const normalizedWeekStart =
    ((weekStartsOn % 7) + 7) % 7;

  const difference =
    (day - normalizedWeekStart + 7) % 7;

  date.setDate(date.getDate() - difference);

  return date;
}

export function endOfWeek(
  value: DateInput = new Date(),
  weekStartsOn = 1,
): Date {
  const date = startOfWeek(value, weekStartsOn);

  date.setDate(date.getDate() + 6);

  return endOfDay(date);
}

export function startOfMonth(
  value: DateInput = new Date(),
): Date {
  const date = toDate(value);

  date.setDate(1);
  date.setHours(0, 0, 0, 0);

  return date;
}

export function endOfMonth(
  value: DateInput = new Date(),
): Date {
  const date = toDate(value);

  date.setMonth(date.getMonth() + 1, 0);
  date.setHours(23, 59, 59, 999);

  return date;
}

export function startOfYear(
  value: DateInput = new Date(),
): Date {
  const date = toDate(value);

  date.setMonth(0, 1);
  date.setHours(0, 0, 0, 0);

  return date;
}

export function endOfYear(
  value: DateInput = new Date(),
): Date {
  const date = toDate(value);

  date.setMonth(11, 31);
  date.setHours(23, 59, 59, 999);

  return date;
}

export function addMilliseconds(
  value: DateInput,
  milliseconds: number,
): Date {
  const date = toDate(value);

  date.setTime(date.getTime() + milliseconds);

  return date;
}

export function addSeconds(
  value: DateInput,
  seconds: number,
): Date {
  return addMilliseconds(
    value,
    seconds * MILLISECONDS_PER_SECOND,
  );
}

export function addMinutes(
  value: DateInput,
  minutes: number,
): Date {
  return addMilliseconds(
    value,
    minutes * MILLISECONDS_PER_MINUTE,
  );
}

export function addHours(
  value: DateInput,
  hours: number,
): Date {
  return addMilliseconds(
    value,
    hours * MILLISECONDS_PER_HOUR,
  );
}

export function addDays(
  value: DateInput,
  days: number,
): Date {
  const date = toDate(value);

  date.setDate(date.getDate() + days);

  return date;
}

export function addWeeks(
  value: DateInput,
  weeks: number,
): Date {
  return addDays(value, weeks * 7);
}

export function addMonths(
  value: DateInput,
  months: number,
): Date {
  const date = toDate(value);

  date.setMonth(date.getMonth() + months);

  return date;
}

export function addYears(
  value: DateInput,
  years: number,
): Date {
  const date = toDate(value);

  date.setFullYear(date.getFullYear() + years);

  return date;
}

export function subtractDays(
  value: DateInput,
  days: number,
): Date {
  return addDays(value, -days);
}

export function subtractMonths(
  value: DateInput,
  months: number,
): Date {
  return addMonths(value, -months);
}

export function subtractYears(
  value: DateInput,
  years: number,
): Date {
  return addYears(value, -years);
}

export function differenceInMilliseconds(
  firstDate: DateInput,
  secondDate: DateInput,
): number {
  return (
    toDate(firstDate).getTime() -
    toDate(secondDate).getTime()
  );
}

export function differenceInSeconds(
  firstDate: DateInput,
  secondDate: DateInput,
): number {
  return (
    differenceInMilliseconds(firstDate, secondDate) /
    MILLISECONDS_PER_SECOND
  );
}

export function differenceInMinutes(
  firstDate: DateInput,
  secondDate: DateInput,
): number {
  return (
    differenceInMilliseconds(firstDate, secondDate) /
    MILLISECONDS_PER_MINUTE
  );
}

export function differenceInHours(
  firstDate: DateInput,
  secondDate: DateInput,
): number {
  return (
    differenceInMilliseconds(firstDate, secondDate) /
    MILLISECONDS_PER_HOUR
  );
}

export function differenceInDays(
  firstDate: DateInput,
  secondDate: DateInput,
): number {
  return (
    differenceInMilliseconds(firstDate, secondDate) /
    MILLISECONDS_PER_DAY
  );
}

export function getDateDifference(
  firstDate: DateInput,
  secondDate: DateInput,
): DateDifference {
  const first = toDate(firstDate);
  const second = toDate(secondDate);

  const totalMilliseconds = Math.abs(
    first.getTime() - second.getTime(),
  );

  const totalSeconds =
    totalMilliseconds / MILLISECONDS_PER_SECOND;

  const totalMinutes =
    totalMilliseconds / MILLISECONDS_PER_MINUTE;

  const totalHours =
    totalMilliseconds / MILLISECONDS_PER_HOUR;

  const totalDays =
    totalMilliseconds / MILLISECONDS_PER_DAY;

  let start = first;
  let end = second;

  if (start.getTime() > end.getTime()) {
    [start, end] = [end, start];
  }

  let years = end.getFullYear() - start.getFullYear();

  let months = end.getMonth() - start.getMonth();

  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;

    const previousMonth = new Date(
      end.getFullYear(),
      end.getMonth(),
      0,
    );

    days += previousMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const hours = end.getHours() - start.getHours();
  const minutes = end.getMinutes() - start.getMinutes();
  const seconds = end.getSeconds() - start.getSeconds();
  const milliseconds =
    end.getMilliseconds() - start.getMilliseconds();

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    totalMilliseconds,
    totalSeconds,
    totalMinutes,
    totalHours,
    totalDays,
  };
}

export function isBefore(
  firstDate: DateInput,
  secondDate: DateInput,
): boolean {
  return (
    toDate(firstDate).getTime() <
    toDate(secondDate).getTime()
  );
}

export function isAfter(
  firstDate: DateInput,
  secondDate: DateInput,
): boolean {
  return (
    toDate(firstDate).getTime() >
    toDate(secondDate).getTime()
  );
}

export function isEqual(
  firstDate: DateInput,
  secondDate: DateInput,
): boolean {
  return (
    toDate(firstDate).getTime() ===
    toDate(secondDate).getTime()
  );
}

export function isSameDay(
  firstDate: DateInput,
  secondDate: DateInput,
): boolean {
  const first = toDate(firstDate);
  const second = toDate(secondDate);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

export function isSameMonth(
  firstDate: DateInput,
  secondDate: DateInput,
): boolean {
  const first = toDate(firstDate);
  const second = toDate(secondDate);

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth()
  );
}

export function isSameYear(
  firstDate: DateInput,
  secondDate: DateInput,
): boolean {
  return (
    toDate(firstDate).getFullYear() ===
    toDate(secondDate).getFullYear()
  );
}

export function isBetween(
  value: DateInput,
  startDate: DateInput,
  endDate: DateInput,
  inclusive = true,
): boolean {
  const timestamp = toDate(value).getTime();
  const start = toDate(startDate).getTime();
  const end = toDate(endDate).getTime();

  const min = Math.min(start, end);
  const max = Math.max(start, end);

  if (inclusive) {
    return timestamp >= min && timestamp <= max;
  }

  return timestamp > min && timestamp < max;
}

export function getDateRange(
  startDate: DateInput,
  endDate: DateInput,
): DateRange {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (start.getTime() <= end.getTime()) {
    return {
      startDate: start,
      endDate: end,
    };
  }

  return {
    startDate: end,
    endDate: start,
  };
}

export function toISOString(
  value: DateInput = new Date(),
): string {
  return toDate(value).toISOString();
}

export function toUnixTimestamp(
  value: DateInput = new Date(),
): number {
  return Math.floor(toDate(value).getTime() / 1000);
}

export function fromUnixTimestamp(
  timestamp: number,
): Date {
  return new Date(timestamp * 1000);
}

export function formatDate(
  value: DateInput,
  locale = "en-IN",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  },
): string {
  return new Intl.DateTimeFormat(locale, options).format(
    toDate(value),
  );
}

export function formatDateTime(
  value: DateInput,
  locale = "en-IN",
  options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  },
): string {
  return new Intl.DateTimeFormat(locale, options).format(
    toDate(value),
  );
}

export function formatTime(
  value: DateInput,
  locale = "en-IN",
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  },
): string {
  return new Intl.DateTimeFormat(locale, options).format(
    toDate(value),
  );
}

export function getDateRangeForDays(
  days: number,
  fromDate: DateInput = new Date(),
): DateRange {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error("Days must be a positive integer");
  }

  const endDate = endOfDay(fromDate);
  const startDate = startOfDay(
    subtractDays(endDate, days - 1),
  );

  return {
    startDate,
    endDate,
  };
}

export function getCurrentMonthRange(
  value: DateInput = new Date(),
): DateRange {
  return {
    startDate: startOfMonth(value),
    endDate: endOfMonth(value),
  };
}

export function getCurrentYearRange(
  value: DateInput = new Date(),
): DateRange {
  return {
    startDate: startOfYear(value),
    endDate: endOfYear(value),
  };
}