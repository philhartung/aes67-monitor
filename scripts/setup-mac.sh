#!/usr/bin/env bash
# macOS 개발 환경 세팅. 사용법: ./scripts/setup-mac.sh <포크한 저장소 URL> [대상 폴더]
set -euo pipefail

REPO_URL="${1:?포크한 저장소 URL을 인자로 넘겨주세요}"
DEST="${2:-aes67-app}"

# 1. Xcode Command Line Tools (Audify 소스 빌드가 필요할 때 사용)
if ! xcode-select -p >/dev/null 2>&1; then
	echo "Xcode Command Line Tools가 없습니다. 설치 창이 뜨면 설치 후 다시 실행하세요."
	xcode-select --install || true
	exit 1
fi

# 2. nvm으로 Node 22 준비
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
	echo "nvm이 없습니다. https://github.com/nvm-sh/nvm 안내대로 설치한 뒤 다시 실행하세요."
	exit 1
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

# 3. 클론
git clone "$REPO_URL" "$DEST"
cd "$DEST"

# 4. 이 키트의 파일(CLAUDE.md, .nvmrc, docs/)이 같은 폴더에 있으면 그대로 사용한다.
nvm install
nvm use

# 5. 의존성 설치 (cmake가 필요할 수 있음: brew install cmake)
npm ci

echo
echo "준비 완료. 터미널 2개에서 다음을 실행하세요:"
echo "  1) npm run serve"
echo "  2) npm start"
echo "스트림이 안 보이면 시스템 설정 > 개인정보 보호 및 보안 > 로컬 네트워크 권한을 확인하세요."
