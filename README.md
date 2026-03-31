# Happy Spring Tomcat for VS Code

VS Code에서 Tomcat 프로젝트를 디버깅하기 위한 환경을 자동으로 구성해주는 익스텐션입니다. 
`server.xml` 수정, `CATALINA_BASE` 설정, 로그 색상화 등을 한 번에 해결하세요.

## 주요 기능 ✨

- **⚡ 한 번의 클릭으로 설정**: `Happy Spring Tomcat: Setup Debug Scripts` 명령어로 디버깅에 필요한 모든 스크립트와 설정 파일을 생성합니다.
- **🧠 스마트 docBase 자동 감지**: `target/` 또는 `build/` 폴더를 자동으로 스캔하여 `WEB-INF/lib`이 포함된 최적의 배포 디렉토리를 찾아줍니다.
- **🚀 상태 표시줄 단축 메뉴**: 우측 하단 🚀 아이콘을 통해 시작/중지/로그확인/설정 등 주요 명령에 빠르게 접근할 수 있습니다.
- **🌐 브라우저 자동 오픈**: 서버가 정상적으로 기동되면 브라우저에서 웹 애플리케이션을 자동으로 열어줍니다.
- **🧬 JNDI & Context 자동 병합**: 프로젝트의 `META-INF/context.xml` 내용을 자동으로 읽어와 Tomcat 설정에 병합해줍니다.
- **🎨 로그 색상화 (Colorize)**: PowerShell을 통해 로그 레벨(INFO, WARN, ERROR, SQL 등)별로 색상을 입혀 가독성을 높여줍니다.
- **🔥 핫 리로드 지원**: JSP 및 Java Class 파일의 실시간 반영을 위한 `PreResources` 설정을 지원합니다.
- **🛡️ 포트 충돌 자동 방지**: Tomcat 시작 시 기존에 동일한 포트를 사용하는 프로세스를 자동으로 종료합니다.

## 사용 방법 🚀

1. **익스텐션 설치**: 마켓플레이스에서 **Happy Spring Tomcat**을 검색하여 설치하거나 `.vsix` 파일을 통해 설치합니다.
2. VS Code에서 개발 중인 **프로젝트 폴더**를 엽니다.
3. `Ctrl+Shift+P` (또는 `F1`)를 눌러 커맨드 팔레트를 열고 **`Happy Spring Tomcat: Setup Debug Scripts`**를 실행합니다.
4. 처음 실행 시 나타나는 폴더 선택창에서 **Tomcat Home 디렉토리**를 선택합니다.
5. `.vscode` 폴더 안에 디버그용 스크립트와 설정이 생성됩니다.
6. `F5`를 눌러 **`🚀 Tomcat — Attach Debug`** 구성을 실행하면 서버가 시작되고 디버거가 연결됩니다.
7. **재시작**: 서버 재시작이 필요한 경우 **`Shift + F5`** (Stop)를 눌러 중지한 다음, 다시 **`F5`** (Start)를 눌러 실행하는 것이 가장 확실한 방법입니다.

### 💡 중요 설정 및 주의사항
- **Java 프로젝트 인식**: VS Code의 Java 익스텐션(Language Support for Java by Red Hat)이 프로젝트를 정상적으로 인식하고 있어야 디버깅(Breakpoints 등)이 가능합니다.
- **`docBase` 자동 감지**: `Setup` 실행 시 빌드 결과물 경로를 **자동으로 감지**합니다. 만약 감지되지 않거나 여러 개일 경우, 상단 퀵픽(QuickPick) 창에서 올바른 폴더를 선택하기만 하면 됩니다.

## 설정 항목 (Settings) ⚙️

`settings.json` 또는 VS Code 설정 UI에서 다음 항목들을 조정할 수 있습니다:

### Server 설정
- `happySpringTomcat.tomcatHome`: Tomcat이 설치된 경로. (비어있을 시 Setup 실행 시 폴더 선택창 오픈)
- `happySpringTomcat.httpPort`: 서비스 HTTP 포트 (기본: `8080`).
- `happySpringTomcat.debugPort`: JPDA 디버그 포트 (기본: `8000`).
- `happySpringTomcat.javaOpts`: JVM 아규먼트 (`-Dfile.encoding=UTF-8` 등).
- `happySpringTomcat.colorizeLogs`: 로그 레벨별 색상화 활성 여부 (PowerShell 기반).
- `happySpringTomcat.autoOpenBrowser`: 서버 시작 후 브라우저 자동 오픈 여부.
- `happySpringTomcat.showStatusBarIcon`: 상태 표시줄에 🚀 메뉴 아이콘 표시 여부.

### Context / Deployment 설정
- `happySpringTomcat.contextPath`: 애플리케이션 컨텍스트 경로 (예: `/`, `/my-app`).
- `happySpringTomcat.docBase`: Tomcat이 서빙할 웹앱 루트 디렉토리 (자동 감지 지원, 빌드된 war 또는 exploded 폴더).

### Hot Reload (PreResources) 설정
- `happySpringTomcat.sourceBase`: JSP/정적 파일 핫 리로드 대상 소스 디렉토리.
- `happySpringTomcat.classesBase`: Java 클래스 핫 리로드 대상 컴파일 출력 디렉토리.

### JNDI DataSource 설정
- `happySpringTomcat.jndiResources`: JNDI DataSource 정의 (JSON 배열 형식).
- **자동 병합**: 프로젝트의 `/META-INF/context.xml` 파일에 정의된 `<Resource>` 태그들을 자동으로 읽어와 생성되는 Tomcat 설정에 병합합니다.

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
