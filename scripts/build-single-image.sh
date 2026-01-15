#!/bin/bash
cd "$(dirname "$0")/.."
yarn build:apps
version=$(./scripts/getCurrentVersion.sh)

docker build \
  -f hosting/single/Dockerfile \
  -t supertoolmake:latest \
  --build-arg SUPER_VERSION=$version \
  --build-arg TARGETBUILD=single \
  .
