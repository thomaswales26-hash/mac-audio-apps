import 'server-only'

const VPN_GATE_API = 'https://www.vpngate.net/api/iphone/'

type RawServer = {
  hostName: string
  ip: string
  score: number
  ping: number | null
  speed: number
  country: string
  countryCode: string
  sessions: number
  uptime: number
  logPolicy: string
  operator: string
  config: string
}

export type PublicVPNServer = Omit<RawServer, 'config'> & { id: string }

function parseCSVRow(row: string) {
  const fields: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < row.length; index += 1) {
    const character = row[index]
    if (character === '"') {
      if (quoted && row[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      fields.push(field)
      field = ''
    } else {
      field += character
    }
  }
  fields.push(field)
  return fields
}

function safeNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function safeIP(value: string) {
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) ? value : ''
}

export async function getVPNGateServers(): Promise<RawServer[]> {
  const response = await fetch(VPN_GATE_API, {
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'Open-Passage/1.0 (+https://www.vpngate.net/)',
    },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(12_000),
  })

  if (!response.ok) {
    throw new Error(`VPN Gate responded with status ${response.status}`)
  }

  const body = await response.text()
  const rows = body
    .split(/\r?\n/)
    .filter((row) => row && !row.startsWith('*') && !row.startsWith('#'))

  return rows
    .map(parseCSVRow)
    .filter((fields) => fields.length >= 15)
    .map((fields) => ({
      hostName: fields[0].slice(0, 120),
      ip: safeIP(fields[1]),
      score: safeNumber(fields[2]),
      ping: fields[3] ? safeNumber(fields[3]) : null,
      speed: safeNumber(fields[4]),
      country: fields[5].slice(0, 80),
      countryCode: fields[6].slice(0, 2).toUpperCase(),
      sessions: safeNumber(fields[7]),
      uptime: safeNumber(fields[8]),
      logPolicy: fields[11].slice(0, 120),
      operator: fields[12].slice(0, 180),
      config: fields[14],
    }))
    .filter((server) => server.ip && server.config)
}

export function toPublicServer(server: RawServer, index: number): PublicVPNServer {
  const { config: _config, ...publicFields } = server
  return { ...publicFields, id: `${server.ip}-${index}` }
}

export function decodeProfile(config: string) {
  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(config)) {
    throw new Error('VPN Gate returned an invalid profile encoding.')
  }
  const profile = Buffer.from(config, 'base64').toString('utf8')
  if (!profile.includes('<ca>') || !profile.match(/^remote\s+/m)) {
    throw new Error('VPN Gate returned an invalid OpenVPN profile.')
  }
  return profile
}
