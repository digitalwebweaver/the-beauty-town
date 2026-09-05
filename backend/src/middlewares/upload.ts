import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import type { NextFunction, Request, Response } from 'express';
import { env } from '@/config/env';
import { ApiError } from '@/utils/ApiError';

// TODO(production-readiness): this writes to LOCAL DISK. Fine for a VPS
// with a persistent volume, but on any ephemeral-filesystem PaaS (Render,
// Railway, Heroku, most container platforms) every file here is wiped on
// the next redeploy/restart, silently breaking every image URL already
// saved to the DB. Deliberately deferred (needs real Cloudinary/S3/etc.
// credentials from whoever owns that account) — swap `multer.diskStorage`
// below for an object-storage-backed multer storage engine before
// deploying anywhere with an ephemeral disk. relativeUrl()'s return shape
// (a URL string) is already what every caller expects, so the swap should
// only touch this file.
const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const subdirs = ['avatars', 'services', 'staff', 'packages', 'misc'];
subdirs.forEach((s) => {
  const dir = path.join(uploadRoot, s);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

function makeStorage(sub: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(uploadRoot, sub)),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`;
      cb(null, name);
    },
  });
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (ALLOWED.includes(file.mimetype)) cb(null, true);
  else cb(ApiError.badRequest('Only JPG, PNG, WEBP or GIF images allowed') as any);
};

function makeUploader(sub: string) {
  return multer({
    storage: makeStorage(sub),
    limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
    fileFilter,
  });
}

export const uploadAvatar = makeUploader('avatars');
export const uploadService = makeUploader('services');
export const uploadStaff = makeUploader('staff');
export const uploadPackage = makeUploader('packages');
export const uploadMisc = makeUploader('misc');

export function relativeUrl(file: Express.Multer.File): string {
  const rel = path.relative(uploadRoot, file.path).replace(/\\/g, '/');
  return `/uploads/${rel}`;
}

// `fileFilter` above only ever sees the client-supplied Content-Type and
// filename — both are attacker-controlled (a request can claim
// `image/jpeg` and name the file anything while sending arbitrary bytes).
// This checks the real bytes multer already wrote to disk against known
// image magic numbers, so a mislabeled non-image file can't slip through.
const MAGIC_BYTE_CHECKS: ((b: Buffer) => boolean)[] = [
  (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff, // JPEG
  (b) =>
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a, // PNG
  (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38, // GIF
  (b) =>
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 && // "RIFF"
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50, // "WEBP"
];

function looksLikeRealImage(buf: Buffer): boolean {
  return MAGIC_BYTE_CHECKS.some((check) => check(buf));
}

/**
 * Wire this in immediately after every `uploadX.single('image')` call, and
 * before the route's own handler. Rejects (and deletes) an upload whose
 * actual bytes don't match a real image, regardless of what the client
 * claimed. Combined with helmet's default `X-Content-Type-Options: nosniff`
 * (already on for every response — see app.ts), a mismatched-but-real-image
 * extension can no longer be interpreted as HTML/script by a browser either.
 */
export function verifyImageMagicBytes(req: Request, _res: Response, next: NextFunction) {
  const file = req.file;
  if (!file) return next();
  fs.readFile(file.path, (err, buf) => {
    if (err) return next(err);
    if (!looksLikeRealImage(buf.subarray(0, 12))) {
      fs.unlink(file.path, () => {
        /* best-effort cleanup — rejection below is what matters */
      });
      return next(ApiError.badRequest("That file's content doesn't look like a real image"));
    }
    next();
  });
}
