# 로드맵

## M0. 베이스 실행 확인
- [ ] 포크 후 클론, `npm ci`, `npm run serve` + `npm start`로 맥에서 실행
- [ ] 로컬 네트워크 권한, Gatekeeper 문제 정리
- [ ] 실제 AES67 소스(믹서·Dante 장비, 또는 GStreamer 테스트 스트림)로 SAP 탐지·재생 확인
- [ ] mac 아이콘을 `.icns`로 교체, `npm run build`로 .dmg 생성 확인

## M1. 현대화
- [ ] Electron 34 → 최신 안정 버전 (Audify 재빌드 검증 포함)
- [ ] 린트 도구(eslint 7) 정리는 선택 사항

## M2. 모니터링 확장
- [ ] 채널별 레벨 미터 (`audio.js`에서 PCM 피크·RMS 계산 후 IPC로 전달)
- [ ] 패킷 손실·지터·시퀀스 점프 통계
- [ ] PTP 상태 표시
- [ ] 다중 스트림 동시 모니터링 (오디오 프로세스 구조 변경 필요)

## M3. Send / Return
- [ ] aes67-sender의 RTP 송신·SDP 생성·PTP 클라이언트 구조 분석
- [ ] macOS(CoreAudio)에서 입력 캡처 → RTP 송신 프로토타입
- [ ] SAP 송신으로 스트림 광고
- [ ] Return(수신 → 가상 출력) 경로 설계: 가상 사운드카드 방식 결정(예: BlackHole 같은 가상 장치 연동 vs 자체 드라이버)
