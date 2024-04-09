const HTTP_ERRORS = {
  400: 'Bad Request',
  401: 'Unauthorized Or Invalid',
  403: 'Forbidden',
  404: 'Not Found'
};

export function respondWithHttpStatusCode(httpStatusCode, res, method) {
  res.status(httpStatusCode).json({
    status: httpStatusCode,
    message: HTTP_ERRORS[httpStatusCode] || 'Unknown error',
    method: method
  });
}

export function respondWithData(data, res, message) {
  if (Array.isArray(data)) {
    return res.jsonp({data, message});
  } else {
    return res.json({data, message});
  }
}

function handleValidationError(err, res) {
  // Handle validation errors from express-validator/check
  if (err.array) {
    res.locals.message = err.array();
  }
}

function handleSyntaxError(err, res) {
  // Handle syntax errors thrown by body parser
  if (err instanceof SyntaxError && typeof err.body === 'string') {
    try {
      JSON.parse(err.body);
      res.locals.message = [{ msg: 'Malformed payload', parameter: ''}];
    } catch (_) {
      res.locals.message = [{ msg: 'Invalid payload', parameter: ''}];
    }
  }
}

function handleKnownErrors(err, req, res) {
  // Handle known error types
  let httpStatusCode;
  if (HTTP_ERRORS[err.code]) {
    httpStatusCode = HTTP_ERRORS[err.code];
  } else if (HTTP_ERRORS[err.name] || HTTP_ERRORS[err.constructor.name]) {
    let type = err.name ? err.name : err.constructor.name;
    type = HTTP_ERRORS[type] || HTTP_ERRORS[type.toLowerCase()];
    httpStatusCode = type;
  }
  if (httpStatusCode) {
    respondWithHttpStatusCode(httpStatusCode, res, req.method);
    return true;
  }
  return false;
}

function handleDevelopmentError(err, res) {
  // In development mode, include the full stack trace in the response.
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    console.error(err.stack);
    res.status(500).render('error', { title: 'Internal Server Error' });
    return true;
  }
  return false;
}

function handleGenericError(res) {
  // Handle genuine server errors
  res.status(500).render('error', { title: 'Server Error' });
}

export function setUpExpressMiddleware(app) {
  return function(err, req, res, next) {
    res.locals.errorId = require('uuid').v4();
    res.locals.originalRequestBody = req.rawBody;

    handleValidationError(err, res) ||
    handleSyntaxError(err, res) ||
    handleKnownErrors(err, req, res) ||
    handleDevelopmentError(err, res) ||
    handleGenericError(res);
  };
}
