require('colors');

const errorHandler = (err, req, res, next) => {
  console.error(' Gateway error:', err.message.red);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Gateway error'
  });
};

module.exports = errorHandler;