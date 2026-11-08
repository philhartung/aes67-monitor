# AES67 Virtual Soundcard & Controller

AES67 네트워크 오디오를 모니터링하고 Send/Return 하는 macOS 데스크톱 앱.
베이스: [philhartung/aes67-monitor](https://github.com/philhartung/aes67-monitor) (MIT, 마지막 커밋 2025-08-20, c61e621)를 포크해서 개발한다.

## 목표
1. 베이스 코드를 최신 macOS(Apple Silicon)에서 안정적으로 실행·빌드한다.
2. 수신(Monitor) 기능을 확장한다: 레벨 미터, 패킷 손실·지터 통계, PTP 상태, 다중 스트림.
3. 송신(Send/Return) 기능을 추가한다. 참고: [philhartung/aes67-sender](https://github.com/philhartung/aes67-sender) (PTP 클라이언트, macOS 미검증).

## 구조
- `main.js`: Electron 메인 프로세스. SDP·오디오 자식 프로세스를 `fork`하고 렌더러와 IPC로 연결한다. `process.platform` 분기에서 오디오 API를 고른다(macOS는 CoreAudio).
- `src/lib/sdp.js`: SAP 수신, SDP 파싱 (sdp-transform).
- `src/lib/audio.js`: UDP 멀티캐스트 RTP 수신, L16/L24 디코딩, 지터 버퍼, Audify(RtAudio) 출력. 현재 스트림 1개만 재생하는 구조다.
- `src/` (Vue 3): UI 페이지(Streams, Settings, Interfaces, Devices, SDP).

## 명령어
- 의존성 설치: `npm ci`
- 개발 실행: 터미널 2개에서 `npm run serve`(Vue, 8888 포트)와 `npm start`(Electron)
- 린트·포맷: `npm run lint`, `npm run format` (탭 들여쓰기)
- 패키징: `npm run build` (electron-builder, 결과는 `release-builds/`)
- 네이티브 모듈 ABI 오류가 나면: `npx @electron/rebuild -f -w audify`

## 환경 메모
- Node는 `.nvmrc` 기준(22). 샌드박스 확인 결과 Node 22에서 `npm ci`와 `require('audify')`(1.9.0)가 정상이다.
- Electron은 34.2.0 고정 상태다. 업그레이드는 별도 작업으로 한 단계씩 한다.
- macOS: 서명 없는 앱은 Gatekeeper가 막는다. 개인 사용은 `xattr -cr <앱>` 또는 `codesign --sign - <앱>`. 멀티캐스트가 안 보이면 시스템 설정의 로컬 네트워크 권한을 먼저 확인한다.
- `electron-builder.yml`의 mac 아이콘이 `icon.ico`다. `.icns`로 교체한다.

## 작업 규칙
- `audio.js`의 RTP 파싱·지터 버퍼를 바꿀 때는 AES67/RFC 3550 기준으로 근거를 주석에 남긴다.
- 오디오 출력과 멀티캐스트 수신은 클라우드 샌드박스에서 검증할 수 없다. 실기기(맥)에서 확인한 결과만 "동작함"으로 기록한다.
- 한 번에 하나만 올린다(Electron, Audify, 기능 추가를 섞지 않는다). 변경마다 `npm start`로 스트림 수신·재생을 확인한다.
- 커밋은 작은 단위로 한다.

## 로드맵
`docs/ROADMAP.md` 참고.
