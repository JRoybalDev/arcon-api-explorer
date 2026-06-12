type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

const colors = {
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
  yellow: "\x1b[33m"
};

const levelColors: Record<LogLevel, string> = {
  info: colors.green,
  warn: colors.yellow,
  error: colors.red
};

function normalize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    };
  }

  return value;
}

function color(value: string, colorCode: string) {
  if (!shouldColorize()) {
    return value;
  }

  return `${colorCode}${value}${colors.reset}`;
}

function shouldColorize() {
  return process.env.NO_COLOR !== "1" && process.env.NO_COLOR !== "true";
}

function stringField(value: unknown, fallback = "-") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value);
}

function statusColor(status: string) {
  const statusCode = Number(status);

  if (statusCode >= 500) {
    return colors.red;
  }

  if (statusCode >= 400) {
    return colors.yellow;
  }

  if (statusCode >= 300) {
    return colors.cyan;
  }

  if (statusCode >= 200) {
    return colors.green;
  }

  return colors.dim;
}

function formatExtras(fields: LogFields) {
  const extraEntries = Object.entries(fields).filter(([key]) => !["durationMs", "method", "path", "requestId", "status"].includes(key));

  if (fields.durationMs !== undefined) {
    extraEntries.unshift(["durationMs", fields.durationMs]);
  }

  if (extraEntries.length === 0) {
    return "";
  }

  const extras = Object.fromEntries(extraEntries.map(([key, value]) => [key, normalize(value)]));
  return ` ${color(JSON.stringify(extras), colors.dim)}`;
}

function formatLine(level: LogLevel, message: string, fields: LogFields, time: string) {
  const levelLabel = color(`[${level.toUpperCase()}]`, levelColors[level]);
  const timeLabel = color(`[${time}]`, colors.dim);
  const requestId = color(`[${stringField(fields.requestId)}]`, colors.magenta);
  const method = color(`[${stringField(fields.method)}]`, colors.blue);
  const status = stringField(fields.status);
  const path = color(`[${stringField(fields.path)}]`, colors.cyan);
  const requestLabel = `${method} ${color(`[${status}]`, statusColor(status))} ${path}`;

  return `${levelLabel} ${timeLabel} | ${requestId} | ${requestLabel} | ${message}${formatExtras(fields)}`;
}

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const line = formatLine(level, message, fields, new Date().toISOString());

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields)
};
