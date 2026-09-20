/**
 * Minimal structured logging. Deliberately not a platform: this project logs
 * to stdout/stderr as JSON lines so processing status, model, prompt
 * version, and errors are traceable without extra infrastructure.
 */
type LogFields = Record<string, unknown>;

function log(level: "info" | "error", event: string, fields?: LogFields) {
  const entry = {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logInfo = (event: string, fields?: LogFields) => log("info", event, fields);
export const logError = (event: string, fields?: LogFields) => log("error", event, fields);
