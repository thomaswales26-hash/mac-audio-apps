const { app, BrowserWindow, dialog, ipcMain, net } = require('electron')
const { spawn } = require('node:child_process')
const fs = require('node:fs/promises')
const http = require('node:http')
const nodeNet = require('node:net')
const path = require('node:path')

const isMac = process.platform === 'darwin'
const allowedClients = new Map([
  ['Tunnelblick', 'Tunnelblick'],
  ['OpenVPN Connect', 'OpenVPN Connect'],
])

let localServer
let localOrigin
let mainWindow

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = nodeNet.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

function waitForServer(url, timeout = 20_000) {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get(url, (response) => {
        response.resume()
        if (response.statusCode && response.statusCode < 500) {
          resolve()
          return
        }
        retry()
      })
      request.once('error', retry)
      request.setTimeout(1_000, () => request.destroy())
    }

    const retry = () => {
      if (Date.now() - started > timeout) {
        reject(new Error('The local Open Passage service did not start.'))
        return
      }
      setTimeout(check, 200)
    }

    check()
  })
}

async function startLocalServer() {
  if (localOrigin) return

  if (!app.isPackaged) {
    localOrigin = `http://127.0.0.1:${process.env.PORT || 3000}`
    return
  }

  const port = await getFreePort()
  const serverPath = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    '.next',
    'standalone',
    'server.js',
  )

  localOrigin = `http://127.0.0.1:${port}`
  localServer = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
      PORT: String(port),
    },
    stdio: 'ignore',
  })

  localServer.once('exit', (code) => {
    if (code && code !== 0) {
      console.error(`Open Passage local service exited with code ${code}`)
    }
  })

  await waitForServer(localOrigin)
}

async function downloadProfile(profilePath) {
  const profileURL = new URL(profilePath, localOrigin)
  if (profileURL.origin !== localOrigin || profileURL.pathname !== '/api/vpn-profile') {
    throw new Error('The requested profile URL is not allowed.')
  }

  const response = await net.fetch(profileURL.toString(), { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('The VPN profile is no longer available.')
  }

  const profile = Buffer.from(await response.arrayBuffer())
  if (
    profile.byteLength > 512_000 ||
    !profile.includes(Buffer.from('<ca>')) ||
    !profile.includes(Buffer.from('remote '))
  ) {
    throw new Error('The downloaded OpenVPN profile is invalid.')
  }

  const ip = profileURL.searchParams.get('ip')?.replace(/[^0-9.]/g, '') || 'vpn'
  const profileDirectory = path.join(app.getPath('temp'), 'open-passage')
  const profileFile = path.join(profileDirectory, `open-passage-${ip}.ovpn`)
  await fs.mkdir(profileDirectory, { recursive: true, mode: 0o700 })
  await fs.writeFile(profileFile, profile, { mode: 0o600 })
  return profileFile
}

function openWithClient(clientName, profileFile) {
  const application = allowedClients.get(clientName)
  if (!application) throw new Error('That VPN client is not supported.')

  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/open', ['-a', application, profileFile], {
      stdio: 'ignore',
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${application} is not installed or could not open the profile.`))
      }
    })
  })
}

function registerIPC() {
  ipcMain.handle('vpn:import-profile', async (event, clientName, profilePath) => {
    const senderOrigin = new URL(event.senderFrame.url).origin
    if (senderOrigin !== localOrigin) {
      throw new Error('Profile imports are only allowed from Open Passage.')
    }
    if (typeof clientName !== 'string' || typeof profilePath !== 'string') {
      throw new Error('Invalid profile import request.')
    }

    const profileFile = await downloadProfile(profilePath)
    await openWithClient(clientName, profileFile)
    return { success: true }
  })
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return false

  if (mainWindow.isMinimized()) mainWindow.restore()
  if (isMac) {
    void app.dock.show()
    app.focus({ steal: true })
  }
  mainWindow.show()
  mainWindow.focus()
  return true
}

async function createWindow() {
  if (showMainWindow()) return

  await startLocalServer()

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 650,
    show: false,
    backgroundColor: '#eef2f0',
    title: 'Open Passage',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 20, y: 18 },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: true,
    },
  })

  mainWindow = window
  window.on('closed', () => {
    if (mainWindow === window) mainWindow = undefined
  })
  window.once('ready-to-show', () => {
    if (mainWindow === window) showMainWindow()
  })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  await window.loadURL(localOrigin)
  showMainWindow()
}

app
  .whenReady()
  .then(() => {
    registerIPC()
    return createWindow()
  })
  .catch((error) => {
    console.error(error)
    dialog.showErrorBox('Open Passage could not start', error.message)
    app.quit()
  })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (!showMainWindow()) void createWindow()
})

app.on('before-quit', () => {
  if (localServer && !localServer.killed) localServer.kill()
})
