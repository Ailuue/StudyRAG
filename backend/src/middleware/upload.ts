import multer from "multer";

const MAX_MB = parseInt(process.env.UPLOAD_MAX_SIZE_MB ?? "20");

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.mimetype === "text/plain") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and plain text files are allowed"));
    }
  },
});
