import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SECRET = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
const COOKIE_NAME = 'onboardx_session';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface SessionData {
  userId: string;
  username: string;
  avatar: string | null;
  globalName: string | null;
  discriminator: string;
  banner: string | null;
  accentColor: number | null;
  accessToken: string;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(data: string): string {
  return createHmac('sha256', SECRET).update(data).digest('base64url');
}

export function createSessionToken(session: SessionData): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = base64UrlEncode(JSON.stringify({ ...session, expiresAt }));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string | undefined): SessionData | null {
  if (!token) return null;
  const dot = token.indexOf('.');
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const data = JSON.parse(base64UrlDecode(payload)) as SessionData & { expiresAt: number };
    if (!data.expiresAt || data.expiresAt < Date.now()) return null;
    if (typeof data.userId !== 'string' || typeof data.accessToken !== 'string') return null;
    const { expiresAt: _expiresAt, ...session } = data;
    return session;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

export function generateState(): string {
  return randomBytes(24).toString('hex');
}
