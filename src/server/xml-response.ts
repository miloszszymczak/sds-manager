import 'server-only';

/** Odpowiedź z plikiem XML do pobrania. */
export function xmlResponse(xml: string, name: string) {
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name || 'karta'}.esdscom.xml"`,
      'Cache-Control': 'no-store',
    },
  });
}
