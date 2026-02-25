export function errorHandler(err, req, res, next) {
  if (!err) return next();

  const status = Number(err.status || err.statusCode || 500);
  const message =
    typeof err.message === "string" && err.message
      ? err.message
      : status === 500
        ? "Internal Server Error"
        : "Error";

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(status).json({
    error: {
      message,
      code: err.code || undefined,
    },
  });
}

