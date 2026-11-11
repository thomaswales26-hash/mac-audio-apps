#!/bin/bash
# Start / stop the showcase site on your own Apache.
#
#   ./server/site.sh start      serve the site on port 8080 (LAN reachable)
#   ./server/site.sh stop
#   ./server/site.sh status
#   ./server/site.sh restart
#
# No sudo needed: it runs as you, on port 8080, with its own config and logs.

set -u
ROOT="/Users/thomaswales/.abacusai-bot/session-home"
CONF="$ROOT/server/run/httpd-lan.conf"
HTTPD=/usr/sbin/httpd
PIDFILE="$ROOT/server/run/httpd.pid"
PORT=8080

lan_ip() {
  ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1"
}

case "${1:-status}" in
  start)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "Already running (pid $(cat "$PIDFILE"))."
    else
      "$HTTPD" -f "$CONF" -k start && echo "Started."
    fi
    sleep 1
    echo "This Mac:   http://localhost:$PORT"
    echo "On Wi-Fi:   http://$(lan_ip):$PORT"
    ;;
  stop)
    "$HTTPD" -f "$CONF" -k stop 2>/dev/null && echo "Stopped." || echo "Not running."
    ;;
  restart)
    "$0" stop >/dev/null 2>&1; sleep 1; "$0" start
    ;;
  status)
    if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
      echo "Running (pid $(cat "$PIDFILE")) on port $PORT."
      echo "This Mac:   http://localhost:$PORT"
      echo "On Wi-Fi:   http://$(lan_ip):$PORT"
    else
      echo "Not running. Start it with: $0 start"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
