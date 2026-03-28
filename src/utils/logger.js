const fs = require("fs");
const path = require("path");
const { createLogger, format, transports } = require("winston");

const nodeEnv = process.env.NODE_ENV || "development";
const isDevelopment = nodeEnv !== "production";
const envConsoleFlag = process.env.LOG_CONSOLE;
const useConsole = envConsoleFlag ? envConsoleFlag === "true" : isDevelopment;

const customLevels = {
  levels: {
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
    fatal: 6,
  },
};

const fallbackMinLevel = isDevelopment ? "trace" : "warn";
const requestedMinLevel = process.env.LOG_LEVEL || fallbackMinLevel;
const minLevel = Object.prototype.hasOwnProperty.call(customLevels.levels, requestedMinLevel)
  ? requestedMinLevel
  : fallbackMinLevel;
const minLevelNumber = customLevels.levels[minLevel];

const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Con esta jerarquia, se loguea si nivel actual >= nivel minimo configurado.
const levelFilter = format((info) => {
  const currentLevelNumber = customLevels.levels[info.level];

  if (typeof currentLevelNumber === "number" && currentLevelNumber >= minLevelNumber) {
    return info;
  }

  return false;
});

const formatLine = format.printf(({ timestamp, level, message, ...meta }) => {
  const upperLevel = String(level || "info").toUpperCase();
  const metadata = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${timestamp} | ${upperLevel} | ${message}${metadata}`;
});

const transportList = [
  new transports.File({ filename: path.join(logDir, "archivo.log") }),
];

if (useConsole) {
  transportList.push(new transports.Console());
}

const logger = createLogger({
  levels: customLevels.levels,
  // Se usa el nivel maximo para no descartar entradas antes del filtro personalizado.
  level: "fatal",
  format: format.combine(levelFilter(), format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), formatLine),
  transports: transportList,
  exitOnError: false,
});

module.exports = logger;
