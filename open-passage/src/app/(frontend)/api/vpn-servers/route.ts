import { getVPNGateServers, toPublicServer } from '@/lib/vpngate'

export async function GET() {
  try {
    const servers = await getVPNGateServers()
    return Response.json(
      {
        servers: servers
          .sort((a, b) => b.score - a.score)
          .slice(0, 150)
          .map(toPublicServer),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      },
    )
  } catch {
    return Response.json(
      { error: 'The VPN Gate server list is temporarily unavailable.' },
      { status: 502 },
    )
  }
}
