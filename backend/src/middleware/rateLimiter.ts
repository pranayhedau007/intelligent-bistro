import rateLimit from "express-rate-limit";

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute window
  max: 30,                     // 30 chat requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — slow down a bit." },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests." },
});