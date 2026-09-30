#!/usr/bin/env bash
# plink-admin 이미지를 linux/amd64로 빌드해 Artifact Registry에 올린다.
# 태그는 현재 커밋의 짧은 sha. 커밋되지 않은 변경이 있으면 중단한다.
#
# 사용법: deploy/build-push.sh
#   GCP_PROJECT (기본 plink-510000), GCP_REGION (기본 asia-northeast3), AR_REPO (기본 plink)
set -euo pipefail

PROJECT="${GCP_PROJECT:-plink-510000}"
REGION="${GCP_REGION:-asia-northeast3}"
REPO="${AR_REPO:-plink}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/plink-admin"

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  echo "커밋되지 않은 변경이 있습니다. 커밋 후 다시 실행하세요." >&2
  exit 1
fi

TAG="$(git rev-parse --short HEAD)"

docker buildx build --platform linux/amd64 \
  --build-arg APP_VERSION="${TAG}" \
  -t "${IMAGE}:${TAG}" --push .

echo
echo "IMAGE=${IMAGE}"
echo "TAG=${TAG}"
