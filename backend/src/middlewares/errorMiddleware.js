const notFound = (req, res, next) => {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  console.error("❌ Error:", err.message);
  let status = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Server Error";

  if (err.name === "CastError" && err.kind === "ObjectId") {
    status = 404;
    message = "Resource not found";
  }
  if (err.code === 11000) {
    status = 400;
    message = `Duplicate value for: ${Object.keys(err.keyValue).join(", ")}`;
  }
  if (err.name === "ValidationError") {
    status = 422;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  }

  res.status(status).json({
    message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

export { notFound, errorHandler };
