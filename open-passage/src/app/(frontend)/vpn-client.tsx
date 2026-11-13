'use client'

import { useCallback, useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react'

type VPNServer = {
  id: string
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
}

type ServerResponse = {
  servers: VPNServer[]
  updatedAt: string
}

type VPNClientName = 'Tunnelblick' | 'OpenVPN Connect'

function Icon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {children}
    </svg>
  )
}

const icons = {
  shield: (
    <Icon className="size-6">
      <path d="M12 3 5 6v5c0 4.5 2.8 8.2 7 10 4.2-1.8 7-5.5 7-10V6l-7-3Z" />
      <path d="m9.3 12 1.8 1.8 3.9-4.2" />
    </Icon>
  ),
  globe: (
    <Icon className="size-[18px]">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9s-1.2 6.5-3.5 9c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3Z" />
    </Icon>
  ),
  activity: (
    <Icon className="size-[18px]">
      <path d="M3 12h4l2.3-6 4.2 12 2.3-6H21" />
    </Icon>
  ),
  search: (
    <Icon className="size-4">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 4 4" />
    </Icon>
  ),
  refresh: (
    <Icon className="size-4">
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6.1 9a7 7 0 0 1 11.7-2L20 9M4 15l2.2 2a7 7 0 0 0 11.7-2" />
    </Icon>
  ),
  chevron: (
    <Icon className="size-4">
      <path d="m9 6 6 6-6 6" />
    </Icon>
  ),
  download: (
    <Icon className="size-4">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
    </Icon>
  ),
  info: (
    <Icon className="size-4">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  ),
}

function countryFlag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return '◎'
  return String.fromCodePoint(...[...code].map((char) => 127397 + char.charCodeAt(0)))
}

function formatSpeed(bitsPerSecond: number) {
  const megabits = bitsPerSecond / 1_000_000
  if (megabits >= 1000) return `${(megabits / 1000).toFixed(1)} Gbps`
  return `${Math.max(0.1, megabits).toFixed(megabits >= 100 ? 0 : 1)} Mbps`
}

function formatUptime(milliseconds: number) {
  const days = Math.floor(milliseconds / 86_400_000)
  if (days >= 1) return `${days}d`
  const hours = Math.floor(milliseconds / 3_600_000)
  return `${Math.max(1, hours)}h`
}

function signalBars(speed: number) {
  if (speed > 100_000_000) return 4
  if (speed > 30_000_000) return 3
  if (speed > 8_000_000) return 2
  return 1
}

export default function VPNClient() {
  const [servers, setServers] = useState<VPNServer[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState('All locations')
  const [sortBy, setSortBy] = useState('Recommended')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')
  const [noticeOpen, setNoticeOpen] = useState(true)
  const [importClient, setImportClient] = useState<VPNClientName | null>(null)
  const [nativeImport, setNativeImport] = useState(false)
  const [nativeApp, setNativeApp] = useState(false)
  const [importError, setImportError] = useState('')

  const loadServers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/vpn-servers', { cache: 'no-store' })
      if (!response.ok) throw new Error('VPN Gate did not return a server list.')
      const data = (await response.json()) as ServerResponse
      setServers(data.servers)
      setUpdatedAt(data.updatedAt)
      setSelectedId((current) =>
        data.servers.some((server) => server.id === current)
          ? current
          : (data.servers[0]?.id ?? ''),
      )
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load volunteer servers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadServers()
  }, [loadServers])

  useEffect(() => {
    setNativeApp(Boolean(window.openPassage?.isNative))
  }, [])

  const countries = useMemo(
    () => [...new Set(servers.map((server) => server.country))].sort((a, b) => a.localeCompare(b)),
    [servers],
  )

  const visibleServers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = servers.filter((server) => {
      const matchesCountry = country === 'All locations' || server.country === country
      const matchesSearch =
        !normalizedQuery ||
        `${server.country} ${server.countryCode} ${server.hostName} ${server.ip}`
          .toLowerCase()
          .includes(normalizedQuery)
      return matchesCountry && matchesSearch
    })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'Fastest') return b.speed - a.speed
      if (sortBy === 'Lowest ping')
        return (a.ping ?? Number.MAX_SAFE_INTEGER) - (b.ping ?? Number.MAX_SAFE_INTEGER)
      if (sortBy === 'Most sessions') return b.sessions - a.sessions
      return b.score - a.score
    })
  }, [country, query, servers, sortBy])

  const selected = servers.find((server) => server.id === selectedId) ?? visibleServers[0]

  async function importProfile(
    event: MouseEvent<HTMLAnchorElement>,
    clientName: VPNClientName,
    profilePath: string,
  ) {
    setImportClient(clientName)
    setImportError('')

    if (!window.openPassage) {
      setNativeImport(false)
      return
    }

    event.preventDefault()
    setNativeImport(true)
    try {
      await window.openPassage.importProfile(clientName, profilePath)
    } catch (caught) {
      setImportError(
        caught instanceof Error ? caught.message : `${clientName} could not import the profile.`,
      )
    }
  }

  return (
    <main className="min-h-screen bg-[#eef2f0] p-3 text-[#172622] sm:p-5 lg:p-7">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1500px] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_28px_80px_rgba(21,48,41,0.14)]">
        <aside className="hidden w-[238px] shrink-0 flex-col bg-[#112c27] px-4 py-6 text-white lg:flex">
          <div className="mb-9 flex items-center gap-3 px-2">
            <div className="grid size-10 place-items-center rounded-xl bg-[#ccff73] text-[#173229]">
              {icons.shield}
            </div>
            <div>
              <div className="text-[17px] font-semibold tracking-[-0.02em]">Open Passage</div>
              <div className="text-[11px] text-white/45">VPN Gate client</div>
            </div>
          </div>

          <nav aria-label="Main navigation" className="space-y-1">
            {[
              ['Servers', icons.globe, '#servers'],
              ['Connection setup', icons.activity, '#connection'],
            ].map(([label, icon, href], index) => (
              <a
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                  index === 0
                    ? 'bg-white/10 text-white'
                    : 'text-white/55 hover:bg-white/5 hover:text-white/85'
                }`}
                href={href as string}
                key={label as string}
              >
                {icon}
                {label}
              </a>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#ccff73]">
              <span className="size-1.5 rounded-full bg-[#ccff73]" />
              Community network
            </div>
            <p className="text-[11px] leading-5 text-white/48">
              Servers are independently operated by VPN Gate volunteers, not by Open Passage.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 bg-[#f8faf9]">
          <header className="flex min-h-[76px] items-center justify-between border-b border-[#e5eae7] bg-white px-5 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-[#112c27] text-[#ccff73] lg:hidden">
                {icons.shield}
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-[-0.025em] sm:text-xl">
                  Find a server
                </h1>
                <p className="hidden text-xs text-[#7a8984] sm:block">
                  Live volunteer servers from the VPN Gate Academic Experiment
                </p>
              </div>
            </div>
            <button
              className="flex items-center gap-2 rounded-xl border border-[#dce4e0] bg-white px-3.5 py-2 text-xs font-medium text-[#42544e] transition hover:border-[#b9c8c2] hover:bg-[#f8faf9] disabled:opacity-50"
              disabled={loading}
              onClick={() => void loadServers()}
              type="button"
            >
              <span className={loading ? 'animate-spin' : ''}>{icons.refresh}</span>
              <span className="hidden sm:inline">Refresh list</span>
            </button>
          </header>

          <div className="p-4 sm:p-6">
            {noticeOpen && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#e7dca9] bg-[#fffbe9] px-4 py-3.5 text-[#574c24]">
                <div className="mt-0.5 shrink-0">{icons.info}</div>
                <p className="flex-1 text-xs leading-5">
                  <strong className="font-semibold">Before you connect:</strong> Volunteer operators
                  control these servers and may keep logs. Privacy, uptime, speed, and jurisdiction
                  are not guaranteed. Avoid sensitive activity and review each server&apos;s logging
                  policy.
                </p>
                <button
                  aria-label="Dismiss notice"
                  className="text-lg leading-none text-[#8e8251] hover:text-[#574c24]"
                  onClick={() => setNoticeOpen(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
            )}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
              <div className="min-w-0" id="servers">
                <div className="mb-4 flex flex-col gap-3 md:flex-row">
                  <label className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-[#dce4e0] bg-white px-3.5 text-[#75837e] focus-within:border-[#77958a]">
                    {icons.search}
                    <span className="sr-only">Search servers</span>
                    <input
                      className="w-full bg-transparent text-sm text-[#20312c] outline-none placeholder:text-[#9ba7a3]"
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search country, host, or IP"
                      value={query}
                    />
                  </label>
                  <select
                    aria-label="Filter by location"
                    className="h-11 rounded-xl border border-[#dce4e0] bg-white px-3.5 text-sm text-[#40524c] outline-none focus:border-[#77958a]"
                    onChange={(event) => setCountry(event.target.value)}
                    value={country}
                  >
                    <option>All locations</option>
                    {countries.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                  <select
                    aria-label="Sort servers"
                    className="h-11 rounded-xl border border-[#dce4e0] bg-white px-3.5 text-sm text-[#40524c] outline-none focus:border-[#77958a]"
                    onChange={(event) => setSortBy(event.target.value)}
                    value={sortBy}
                  >
                    <option>Recommended</option>
                    <option>Fastest</option>
                    <option>Lowest ping</option>
                    <option>Most sessions</option>
                  </select>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#e2e8e5] bg-white">
                  <div className="grid grid-cols-[minmax(180px,1.5fr)_100px_110px_85px_42px] gap-3 border-b border-[#edf0ef] bg-[#fbfcfc] px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8b9894] max-md:hidden">
                    <span>Location</span>
                    <span>Ping</span>
                    <span>Speed</span>
                    <span>Sessions</span>
                    <span />
                  </div>

                  {loading && (
                    <div className="grid min-h-[360px] place-items-center">
                      <div className="text-center">
                        <div className="mx-auto mb-3 size-7 animate-spin rounded-full border-2 border-[#dce6e1] border-t-[#1d5a49]" />
                        <p className="text-sm text-[#6e7e78]">Contacting VPN Gate…</p>
                      </div>
                    </div>
                  )}

                  {!loading && error && (
                    <div className="grid min-h-[360px] place-items-center px-6 text-center">
                      <div>
                        <div className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-[#fff1ed] text-[#b24f3d]">
                          {icons.activity}
                        </div>
                        <h2 className="mb-1 text-sm font-semibold">Server list unavailable</h2>
                        <p className="mb-4 max-w-sm text-xs leading-5 text-[#788680]">
                          {error} VPN Gate may be temporarily offline or rate limiting requests.
                        </p>
                        <button
                          className="rounded-xl bg-[#173b32] px-4 py-2 text-xs font-semibold text-white"
                          onClick={() => void loadServers()}
                          type="button"
                        >
                          Try again
                        </button>
                      </div>
                    </div>
                  )}

                  {!loading &&
                    !error &&
                    visibleServers.slice(0, 50).map((server) => {
                      const active = selected?.id === server.id
                      return (
                        <button
                          className={`grid w-full items-center gap-3 border-b border-[#edf0ef] px-4 py-3.5 text-left transition last:border-0 md:grid-cols-[minmax(180px,1.5fr)_100px_110px_85px_42px] ${
                            active ? 'bg-[#f1f8f4]' : 'bg-white hover:bg-[#f8faf9]'
                          }`}
                          key={server.id}
                          onClick={() => setSelectedId(server.id)}
                          type="button"
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eef3f1] text-lg">
                              {countryFlag(server.countryCode)}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-[#24352f]">
                                {server.country}
                              </span>
                              <span className="block truncate text-[11px] text-[#85928d]">
                                {server.hostName} · {formatUptime(server.uptime)} uptime
                              </span>
                            </span>
                          </span>
                          <span className="hidden text-sm font-medium text-[#43554e] md:block">
                            {server.ping === null ? '—' : `${server.ping} ms`}
                          </span>
                          <span className="hidden items-center gap-2 md:flex">
                            <span className="flex h-4 items-end gap-[2px]">
                              {[1, 2, 3, 4].map((bar) => (
                                <span
                                  className={`w-[3px] rounded-sm ${
                                    bar <= signalBars(server.speed)
                                      ? 'bg-[#3f816e]'
                                      : 'bg-[#d9e2de]'
                                  }`}
                                  key={bar}
                                  style={{ height: `${bar * 3 + 2}px` }}
                                />
                              ))}
                            </span>
                            <span className="text-xs text-[#566760]">
                              {formatSpeed(server.speed)}
                            </span>
                          </span>
                          <span className="hidden text-xs text-[#65756f] md:block">
                            {server.sessions}
                          </span>
                          <span className="hidden justify-self-end text-[#a0aaa6] md:block">
                            {icons.chevron}
                          </span>
                        </button>
                      )
                    })}

                  {!loading && !error && visibleServers.length === 0 && (
                    <div className="grid min-h-[280px] place-items-center px-6 text-center">
                      <div>
                        <p className="text-sm font-medium">No matching servers</p>
                        <p className="mt-1 text-xs text-[#84918c]">
                          Try another country or clear your search.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-[#87948f]">
                  <span>
                    {visibleServers.length} available server
                    {visibleServers.length === 1 ? '' : 's'}
                  </span>
                  <span>
                    {updatedAt
                      ? `Updated ${new Date(updatedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : 'Live data'}
                  </span>
                </div>
              </div>

              <aside
                className="h-fit rounded-2xl border border-[#dfe7e3] bg-white p-5 xl:sticky xl:top-6"
                id="connection"
              >
                {selected ? (
                  <>
                    <div className="mb-5 flex items-start justify-between">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8b9894]">
                          Selected server
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{countryFlag(selected.countryCode)}</span>
                          <div>
                            <h2 className="text-base font-semibold">{selected.country}</h2>
                            <p className="text-[11px] text-[#84918c]">{selected.ip}</p>
                          </div>
                        </div>
                      </div>
                      <span className="rounded-full bg-[#eaf7ef] px-2 py-1 text-[10px] font-semibold text-[#317056]">
                        Available
                      </span>
                    </div>

                    <div className="mb-5 grid grid-cols-3 gap-2">
                      {[
                        ['Ping', selected.ping === null ? '—' : `${selected.ping} ms`],
                        ['Speed', formatSpeed(selected.speed)],
                        ['Users', String(selected.sessions)],
                      ].map(([label, value]) => (
                        <div className="rounded-xl bg-[#f4f7f6] px-2 py-3 text-center" key={label}>
                          <div className="mb-1 text-[10px] text-[#8b9894]">{label}</div>
                          <div className="text-xs font-semibold text-[#31443d]">{value}</div>
                        </div>
                      ))}
                    </div>

                    <dl className="mb-5 space-y-3 border-y border-[#edf0ef] py-4 text-xs">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#84918c]">Protocol</dt>
                        <dd className="font-medium">OpenVPN</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#84918c]">Logging</dt>
                        <dd className="max-w-[160px] truncate text-right font-medium">
                          {selected.logPolicy || 'Not stated'}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[#84918c]">Operator</dt>
                        <dd className="max-w-[160px] truncate text-right font-medium">
                          {selected.operator || 'Volunteer'}
                        </dd>
                      </div>
                    </dl>

                    <div className="space-y-2">
                      <a
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ccff73] px-4 py-3 text-sm font-semibold text-[#173229] shadow-[0_8px_20px_rgba(165,216,82,0.22)] transition hover:bg-[#d6ff8e]"
                        download
                        href={`/api/vpn-profile?ip=${encodeURIComponent(selected.ip)}`}
                        onClick={(event) =>
                          void importProfile(
                            event,
                            'Tunnelblick',
                            `/api/vpn-profile?ip=${encodeURIComponent(selected.ip)}`,
                          )
                        }
                      >
                        {icons.download}
                        Import with Tunnelblick
                      </a>
                      <a
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9e3de] bg-white px-4 py-3 text-sm font-semibold text-[#355048] transition hover:bg-[#f5f8f7]"
                        download
                        href={`/api/vpn-profile?ip=${encodeURIComponent(selected.ip)}`}
                        onClick={(event) =>
                          void importProfile(
                            event,
                            'OpenVPN Connect',
                            `/api/vpn-profile?ip=${encodeURIComponent(selected.ip)}`,
                          )
                        }
                      >
                        {icons.download}
                        Import with OpenVPN Connect
                      </a>
                    </div>
                    <p className="mt-3 text-center text-[10px] leading-4 text-[#8a9692]">
                      {nativeApp
                        ? 'The native app securely hands the profile to your installed VPN client.'
                        : 'macOS requires you to approve the downloaded profile in your VPN app.'}
                    </p>
                  </>
                ) : (
                  <div className="grid min-h-[320px] place-items-center text-center">
                    <div>
                      <div className="mx-auto mb-3 grid size-11 place-items-center rounded-full bg-[#eff4f2] text-[#71817b]">
                        {icons.globe}
                      </div>
                      <p className="text-sm font-medium">Choose a server</p>
                      <p className="mt-1 text-xs text-[#89958f]">
                        Connection details will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      </div>

      {importClient && selected && (
        <div
          aria-labelledby="import-title"
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-[#0d201b]/55 p-4 backdrop-blur-sm"
          role="dialog"
        >
          <div className="w-full max-w-md rounded-[24px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(9,30,24,0.28)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7e8e88]">
                  {importError
                    ? 'Import needs attention'
                    : nativeImport
                      ? 'Profile opened'
                      : 'Profile downloaded'}
                </p>
                <h2 className="text-lg font-semibold tracking-[-0.02em]" id="import-title">
                  {importError ? `Could not open ${importClient}` : `Finish in ${importClient}`}
                </h2>
              </div>
              <button
                aria-label="Close import instructions"
                className="grid size-8 place-items-center rounded-full bg-[#f0f4f2] text-lg text-[#60716a] hover:bg-[#e7eeeb]"
                onClick={() => setImportClient(null)}
                type="button"
              >
                ×
              </button>
            </div>

            {importError ? (
              <div className="mb-5 rounded-xl border border-[#efc6bc] bg-[#fff3f0] p-3 text-sm leading-5 text-[#853d30]">
                {importError} Install {importClient}, then try the import again.
              </div>
            ) : (
              <ol className="mb-5 space-y-3">
                {(nativeImport
                  ? [
                      `${importClient} should now be open with the ${selected.country} profile ready to import.`,
                      importClient === 'Tunnelblick'
                        ? 'Choose Only Me when Tunnelblick asks where to install the configuration.'
                        : 'Approve the profile import inside OpenVPN Connect.',
                      `Select the ${selected.country} profile and choose Connect. Approve the macOS VPN permission if prompted.`,
                    ]
                  : [
                      'Open your Downloads folder in Finder.',
                      `Double-click the Open Passage .ovpn file and choose ${importClient} if macOS asks.`,
                      importClient === 'Tunnelblick'
                        ? 'Choose Only Me when Tunnelblick asks where to install the configuration.'
                        : 'Approve the profile import inside OpenVPN Connect.',
                      `Select the ${selected.country} profile and choose Connect. Approve the macOS VPN permission if prompted.`,
                    ]
                ).map((step, index) => (
                  <li className="flex gap-3 text-sm leading-5 text-[#465952]" key={step}>
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#edf5f1] text-[11px] font-semibold text-[#2e6c58]">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            )}

            <div className="rounded-xl border border-[#eee2b5] bg-[#fffbea] p-3 text-[11px] leading-5 text-[#665927]">
              The profile comes from a volunteer VPN Gate server. Open Passage does not operate the
              server or guarantee its privacy, availability, or logging practices.
            </div>

            <button
              className="mt-5 w-full rounded-xl bg-[#173b32] px-4 py-3 text-sm font-semibold text-white hover:bg-[#214c40]"
              onClick={() => setImportClient(null)}
              type="button"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
