import { Router, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { requireAuth, AuthRequest } from "../../middleware/auth";

const router = Router();

const UPLOADS_DIR = path.resolve(__dirname, "../../../uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

router.post(
  "/",
  requireAuth,
  upload.single("file"),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "No file uploaded",
        });
      }

      // Use relative URL so it works through any proxy
      const fileUrl = `/uploads/${req.file.filename}`;

      res.status(201).json({
        status: "success",
        data: {
          file_url: fileUrl,
          filename: req.file.filename,
          original_name: req.file.originalname,
          mime_type: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export { router as uploadsRouter, UPLOADS_DIR };
