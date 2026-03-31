# Happy Spring Debugging for VS Code

VS Code에서 Tomcat 프로젝트를 디버깅하기 위한 환경을 자동으로 구성해주는 익스텐션입니다. 
`server.xml` 수정, `CATALINA_BASE` 설정, 로그 색상화 등을 한 번에 해결하세요.

## 주요 기능 ✨

- **한 번의 클릭으로 설정**: `Happy Spring: Setup Debug Scripts` 명령어로 디버깅에 필요한 모든 스크립트와 설정 파일을 생성합니다.
- **로그 색상화 (Colorize)**: PowerShell을 통해 로그 레벨(INFO, WARN, ERROR, SQL 등)별로 색상을 입혀 가독성을 높여줍니다.
- **핫 리로드 지원**: JSP 및 Java Class 파일의 실시간 반영을 위한 `PreResources` 설정을 지원합니다.
- **포트 충돌 자동 방지**: Tomcat 시작 시 기존에 동일한 포트를 사용하는 프로세스를 자동으로 종료합니다.
- **JNDI DataSource 설정**: `settings.json`을 통해 JNDI 리소스를 손쉽게 주입할 수 있습니다.

## 사용 방법 🚀

1. **익스텐션 설치**: 마켓플레이스에서 **Happy Spring Debugging**을 검색하여 설치하거나 `.vsix` 파일을 통해 설치합니다.
2. VS Code에서 개발 중인 **프로젝트 폴더**를 엽니다.
3. `Ctrl+Shift+P` (또는 `F1`)를 눌러 커맨드 팔레트를 열고 **`Happy Spring: Setup Debug Scripts`**를 실행합니다.
4. 처음 실행 시 나타나는 폴더 선택창에서 **Tomcat Home 디렉토리**를 선택합니다.
5. `.vscode` 폴더 안에 디버그용 스크립트와 설정이 생성됩니다.
6. `F5`를 눌러 **`🚀 Tomcat — Attach Debug`** 구성을 실행하면 서버가 시작되고 디버거가 연결됩니다.
7. **재시작**: 서버 재시작이 필요한 경우 **`Shift + F5`**를 눌러 디버깅을 중지한 다음, 다시 **`F5`**를 눌러 실행합니다.

## 설정 항목 (Settings) ⚙️

`settings.json` 또는 VS Code 설정 UI에서 다음 항목들을 조정할 수 있습니다:

### Server 설정
- `happySpringDebugging.tomcatHome`: Tomcat이 설치된 경로. (비어있을 시 Setup 실행 시 폴더 선택창 오픈)
- `happySpringDebugging.httpPort`: 서비스 HTTP 포트 (기본: `8080`).
- `happySpringDebugging.debugPort`: JPDA 디버그 포트 (기본: `8000`).
- `happySpringDebugging.javaOpts`: JVM 아규먼트 (`-Dfile.encoding=UTF-8` 등).
- `happySpringDebugging.colorizeLogs`: 로그 레벨별 색상화 활성 여부 (PowerShell 기반).

### Context / Deployment 설정
- `happySpringDebugging.contextPath`: 애플리케이션 컨텍스트 경로 (예: `/`, `/my-app`).
- `happySpringDebugging.docBase`: Tomcat이 서빙할 웹앱 루트 디렉토리 (빌드된 war 또는 exploded 폴더).

### Hot Reload (PreResources) 설정
- `happySpringDebugging.sourceBase`: JSP/정적 파일 핫 리로드 대상 소스 디렉토리.
- `happySpringDebugging.classesBase`: Java 클래스 핫 리로드 대상 컴파일 출력 디렉토리.

### JNDI DataSource 설정
- `happySpringDebugging.jndiResources`: JNDI DataSource 정의 (JSON 배열 형식).

## 개발 및 빌드 🛠️

직접 빌드하여 설치하려면 다음 명령어를 사용하세요:

```bash
# 의존성 설치
npm install

# VSIX 패키징
.\build.bat
```

생성된 `.vsix` 파일을 VS Code로 드래그 앤 드롭하여 설치할 수 있습니다.

---
**Happy Debugging!** 🚀
