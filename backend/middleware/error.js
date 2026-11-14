const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = Number(err.statusCode || err.status);
  let message = 'Request rejected';

  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Invalid input';
  } else if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  if (statusCode >= 500) {
    message = 'Server error';
    console.error('Unhandled API error', {
      name: typeof err.name === 'string' ? err.name : 'Error',
      statusCode,
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: message,
  });
};

export default errorHandler;
