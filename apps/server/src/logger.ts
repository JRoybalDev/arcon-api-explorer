type LogLevel = "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

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

function write(level: LogLevel, message: string, fields: LogFields = {}) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, normalize(value)]))
  };

  const line = JSON.stringify(payload);

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
