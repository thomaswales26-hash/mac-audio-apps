import { decodeProfile, getVPNGateServers } from '@/lib/vpngate'

function validIP(value: string | null) {
  return Boolean(value && /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value))
}

export async function GET(request: Request) {
  const ip = new URL(request.url).searchParams.get('ip')
  if (!validIP(ip)) {
    return Response.json({ error: 'A valid server IP is required.' }, { status: 400 })
  }

  try {
    const servers = await getVPNGateServers()
    const server = servers.find((candidate) => candidate.ip === ip)
    if (!server) {
      return Response.json(
        { error: 'That volunteer server is no longer available.' },
        { status: 404 },
      )
    }

    const profile = decodeProfile(server.config)
    const safeCountry = server.countryCode.replace(/[^A-Z]/g, '') || 'VPN'
    return new Response(profile, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': `attachment; filename="open-passage-${safeCountry}-${server.ip}.ovpn"`,
        'Content-Type': 'application/x-openvpn-profile',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return Response.json({ error: 'The OpenVPN profile could not be downloaded.' }, { status: 502 })
  }
}
