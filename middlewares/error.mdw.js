export const GlobalErrorHandler = (err, req, res, next) => {
  console.error('[GlobalErrorHandler]', err.stack);
  
  // Distinguish between handled business errors and unhandled crashes
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // If it's an API request, send JSON
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(status).json({
      success: false,
      message,
    });
  }

  // Otherwise, render an error page
  res.status(status).render('error', { 
    layout: false, 
    error: { status, message } 
  });
};

export const NotFoundHandler = (req, res, next) => {
  const error = new Error('Not Found');
  error.status = 404;
  next(error); 
};
