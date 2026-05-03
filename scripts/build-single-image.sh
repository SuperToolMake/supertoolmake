#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."
yarn build:apps
version=$(./scripts/getCurrentVersion.sh)
platform="${PLATFORM:-}"

platform_args=()
if [[ -n "$platform" ]]; then
  platform_args=(--platform "$platform")
fi

docker buildx build \
  "${platform_args[@]}" \
  -f hosting/single/Dockerfile \
  -t supertoolmake:latest \
  --build-arg SUPER_VERSION=$version \
  --build-arg TARGETBUILD=single \
  --load \
  .
