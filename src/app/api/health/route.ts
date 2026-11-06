import { prisma } from '@/server/db';

export const dynamic = 'force-dynamic';

const version = { version: process.env.APP_VERSION ?? 'dev', revision: process.env.GIT_SHA ?? 'unknown' };

/**
 * /api/health          — liveness (proces żyje)
 * /api/health?ready=1  — readiness (dodatkowo baza odpowiada)
 */
export async function GET(req: Request) {
  if (new URL(req.url).searchParams.has('ready')) {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      return Response.json({ status: 'unavailable', db: false, ...version }, { status: 503 });
    }
    return Response.json({ status: 'ok', db: true, ...version });
  }
  return Response.json({ status: 'ok', ...version });
}
