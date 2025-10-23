export function notFound(_req, res, _next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (process.env.NODE_ENV !== 'production') {
    return res.status(status).json({ error: message, stack: err.stack });
  }
  return res.status(status).json({ error: message });
}
