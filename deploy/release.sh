#!/usr/bin/env bash
# Runs on the server, called by .github/workflows/deploy.yml:
#   bash /srv/music-machine/incoming/release.sh <commit sha>
# Unpacks incoming/<sha>.tar.gz (the build's .output) into releases/<sha>,
# points `current` at it, restarts the app and rolls back if it doesn't
# answer. Keeps the last 5 releases.
set -euo pipefail

APP=/srv/music-machine
SHA=${1:?usage: release.sh <commit sha>}
[[ $SHA =~ ^[0-9a-f]{7,40}$ ]] || { echo "bad sha: $SHA" >&2; exit 1; }
ARCHIVE=$APP/incoming/$SHA.tar.gz
RELEASE=$APP/releases/$SHA
PORT=$(sed -n 's/^PORT=\([0-9]\+\)$/\1/p' /etc/music-machine.env)
PORT=${PORT:-3000}

switch_to() {
  ln -sfn "$1" "$APP/current.new"
  mv -T "$APP/current.new" "$APP/current"
  sudo /usr/bin/systemctl restart music-machine
}

healthy() {
  for _ in $(seq 1 30); do
    # -f fails on 4xx/5xx; the root page may redirect to /ru, which is fine.
    curl -fs -o /dev/null --max-time 5 "http://127.0.0.1:$PORT/" && return 0
    sleep 1
  done
  return 1
}

previous=$(readlink -f "$APP/current" 2>/dev/null || true)

rm -rf "$RELEASE"
mkdir -p "$RELEASE"
tar -xzf "$ARCHIVE" -C "$RELEASE"
# tar restores the build's timestamp; the cleanup below sorts by deploy time.
touch "$RELEASE"
rm -f "$ARCHIVE"

switch_to "$RELEASE"
if healthy; then
  echo "released $SHA"
else
  echo "release $SHA does not answer on port $PORT" >&2
  if [[ -n $previous && -d $previous && $previous != "$RELEASE" ]]; then
    echo "rolling back to $(basename "$previous")" >&2
    switch_to "$previous"
    healthy || echo "the previous release doesn't answer either" >&2
  fi
  rm -rf "$RELEASE"
  exit 1
fi

# Keep the newest 5 releases; never the one that's live.
current=$(readlink -f "$APP/current")
ls -1dt "$APP"/releases/*/ | tail -n +6 | while read -r old; do
  old=${old%/}
  [[ $old == "$current" ]] || rm -rf "$old"
done
