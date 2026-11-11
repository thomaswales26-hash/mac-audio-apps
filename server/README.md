# Serving the showcase site from this Mac

The site is plain static files — no build step, no server-side code:

    site/
      index.html
      img/         app icons
      downloads/   SoundCard-Recorder-1.0.dmg, DanceBox-3.0.0-arm64.dmg

**It is running now on your own Apache, on port 8080, reachable from your whole Wi-Fi:**

| Where | Address |
|---|---|
| This Mac | http://localhost:8080 |
| Phone / other computers on the same Wi-Fi | http://192.168.50.31:8080 |

Start, stop and check it with:

    ./server/site.sh start
    ./server/site.sh stop
    ./server/site.sh status

No sudo needed. It runs as you, with its own config (`server/run/httpd-lan.conf`)
and its own logs (`server/run/access.log`, `server/run/error.log`). Apache is
the copy that already ships with macOS (2.4.67) — nothing was installed.

## What the config does

- Serves `site/` as the document root, `index.html` for `/`.
- Sends `.dmg` files with `Content-Disposition: attachment`, so browsers
  download them instead of trying to open them, plus a one-day cache header.
- Caches icons for an hour, the page for five minutes.
- Refuses dotfiles.

## Using port 80 instead

Port 80 needs root. If you want `http://192.168.50.31` with no port number:

    sudo cp server/httpd-site.conf /etc/apache2/other/soundcard-site.conf
    sudo apachectl start

That file is the system-wide variant (port 80, same document root). Stop the
8080 server first if both would conflict. Undo with:

    sudo rm /etc/apache2/other/soundcard-site.conf
    sudo apachectl stop

## A fixed address on your Wi-Fi

Your Mac is `192.168.50.31` now; the router can reassign it. To pin it, set a
DHCP reservation in the router, or System Settings ▸ Network ▸ Wi-Fi ▸ Details ▸
TCP/IP ▸ Configure IPv4 ▸ Using DHCP with manual address.

## Keeping it up

The server keeps running until you stop it or the Mac restarts. To start it
automatically at login, add this to System Settings ▸ General ▸ Login Items:

    /Users/thomaswales/.abacusai-bot/session-home/server/site.sh start

## Scope: this is a LAN server

Anyone on your Wi-Fi can open it. It is **not** reachable from the internet:
for that the router would have to forward a port to this Mac, which exposes
the machine — not recommended. A public, shareable link comes from deploying
the site to a host instead.

## Alternative: the app's own preview server

This app also serves the folder at http://127.0.0.1:49179 while it is open.
That one listens on loopback only, so other devices cannot reach it. Use the
Apache server above when you want the site on your network.
