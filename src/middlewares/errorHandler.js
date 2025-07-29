export const errorHandler = (err, req, res, next) => {
  console.error("📡 API Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};
