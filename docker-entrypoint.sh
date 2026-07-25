#!/bin/sh
# MotionRx Stretch — container entrypoint
# Ensures DATA_DIR is writable by the app user and AUTH_SECRET is available.
# Named volumes often mount as root:root and hide the image's chown; fix that here.

set -eu

DATA_DIR="${DATA_DIR:-/app/data}"
SECRET_FILE="${DATA_DIR}/.auth_secret"
APP_USER="${APP_USER:-nextjs}"
APP_GROUP="${APP_GROUP:-nodejs}"

mkdir -p "$DATA_DIR/uploads"

# When started as root (default for this image entrypoint), repair volume ownership
# then drop privileges. If already non-root, skip chown (may fail) and continue.
if [ "$(id -u)" = "0" ]; then
  chown -R "${APP_USER}:${APP_GROUP}" "$DATA_DIR" 2>/dev/null || true
  chmod u+rwX,g+rwX "$DATA_DIR" 2>/dev/null || true
  chmod -R u+rwX,g+rwX "$DATA_DIR/uploads" 2>/dev/null || true
fi

# Provision AUTH_SECRET: env → persisted file → generate once and persist
provision_secret() {
  if [ -n "${AUTH_SECRET:-}" ] && [ "${#AUTH_SECRET}" -ge 16 ]; then
    # Persist so restarts without env still work (e.g. Portainer omitted stack env)
    if [ ! -f "$SECRET_FILE" ]; then
      umask 077
      printf '%s' "$AUTH_SECRET" > "$SECRET_FILE" 2>/dev/null || true
      if [ "$(id -u)" = "0" ]; then
        chown "${APP_USER}:${APP_GROUP}" "$SECRET_FILE" 2>/dev/null || true
      fi
    fi
    return 0
  fi

  if [ -f "$SECRET_FILE" ]; then
    # shellcheck disable=SC2155
    AUTH_SECRET="$(cat "$SECRET_FILE")"
    export AUTH_SECRET
    if [ "${#AUTH_SECRET}" -ge 16 ]; then
      echo "motionrx: loaded AUTH_SECRET from ${SECRET_FILE}"
      return 0
    fi
  fi

  # Generate a strong secret (prefer openssl; fall back to /dev/urandom)
  if command -v openssl >/dev/null 2>&1; then
    AUTH_SECRET="$(openssl rand -base64 32 | tr -d '\n')"
  else
    AUTH_SECRET="$(dd if=/dev/urandom bs=32 count=1 2>/dev/null | base64 | tr -d '\n')"
  fi
  export AUTH_SECRET
  umask 077
  printf '%s' "$AUTH_SECRET" > "$SECRET_FILE" 2>/dev/null || true
  if [ "$(id -u)" = "0" ]; then
    chown "${APP_USER}:${APP_GROUP}" "$SECRET_FILE" 2>/dev/null || true
  fi
  echo "motionrx: generated and persisted AUTH_SECRET (set AUTH_SECRET in stack env for multi-node)"
}

provision_secret

# Quick writability probe (surfaces volume issues in logs before Node starts)
if ! touch "$DATA_DIR/.write-probe" 2>/dev/null; then
  echo "motionrx: ERROR — cannot write to DATA_DIR=${DATA_DIR}. Check volume permissions." >&2
  if [ "$(id -u)" = "0" ]; then
    ls -la "$DATA_DIR" >&2 || true
  fi
else
  rm -f "$DATA_DIR/.write-probe"
fi

# Drop privileges when running as root
if [ "$(id -u)" = "0" ]; then
  if command -v su-exec >/dev/null 2>&1; then
    exec su-exec "${APP_USER}" "$@"
  fi
  if command -v gosu >/dev/null 2>&1; then
    exec gosu "${APP_USER}" "$@"
  fi
  # BusyBox su (Alpine): -s sets shell / command
  exec su -s /bin/sh -c "exec \"\$@\"" "${APP_USER}" -- "$@"
fi

exec "$@"
