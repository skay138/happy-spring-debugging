# Changelog

All notable changes to "Happy Spring Tomcat" will be documented in this file.

## [1.0.5] - 2026-04-06
- **🔄 Restart Tomcat**: 한 번에 재시작하는 `Restart Tomcat` 커맨드 추가.
- **🌍 크로스 플랫폼**: Mac/Linux용 `.sh` 스크립트 생성 및 `tasks.json` 플랫폼 분기 지원.
- **🔨 빌드 연동**: `preLaunchBuild` 설정으로 Tomcat 시작 전 Maven/Gradle 빌드 자동 실행.

## [1.0.4] - 2026-04-02
- **📁 Clean Search**: 로그/런타임 파일을 익스텐션 스토리지로 이동하여 전역 검색에서 제외.

## [1.0.3] - 2026-03-31
- **🧠 Smart docBase Detection**: `WEB-INF/lib` 기반 자동 감지 및 QuickPick 선택.
- **🚀 Status Bar Menu**: 상태바 로켓 아이콘으로 주요 명령 빠른 접근.
- **🌐 Auto-Open Browser**: 서버 시작 후 브라우저 자동 오픈.
- **⚙️ 새 커맨드**: `Open Settings`, `Clear Cache`, `View Latest Logs`.
- **🛡️ Tomcat Home 유효성 검사 및 포트 충돌 방지**.

## [1.0.1] - 2026-03-31
- **Happy Spring Tomcat** 으로 이름 변경, 마켓플레이스 최초 배포.
- 자동 스캐폴딩, 로그 색상화(PowerShell), JNDI, 핫 리로드, F5 디버깅 지원.
