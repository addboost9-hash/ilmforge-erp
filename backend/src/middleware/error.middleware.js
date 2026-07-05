const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  if (err.code === 'P2002') {
    return res.status(409).json({ success: false, message: 'Record already exists (duplicate entry).' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ success: false, message: 'Record not found.' });
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(err.code && { code: err.code }),
    ...(typeof err.userId !== 'undefined' && { userId: err.userId }),
    ...(err.data && { data: err.data }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
