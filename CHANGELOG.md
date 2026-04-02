# Changelog

All notable changes to the "Happy Spring Tomcat" extension will be documented in this file.

## [1.0.4] - 2026-04-02
- **📁 Clean Search**: Moved logs and runtime files to external storage to prevent them from appearing in global search and keep the workspace tidy.

## [1.0.3] - 2026-03-31
- **🧠 Smart docBase Detection**: Automatically finds the webapp's build output directory (e.g., `target/my-app`) by searching for `WEB-INF/lib`, minimizing manual configuration.
- **📂 Enhanced Picker UX**: Improved `Select docBase` command with a QuickPick for one-click selection of detected candidates.
- **🚀 Status Bar Menu**: Added a rocket icon in the status bar for quick access to Start/Stop/Logs/Settings commands.
- **🌐 Auto-Open Browser**: New setting `happySpringTomcat.autoOpenBrowser` to automatically launch the browser after server startup.
- **⚙️ New Commands & UX**: Added `Open Settings`, `Clear Cache`, and `View Latest Logs` commands. Improved path selection with native folder pickers.
- **🛡️ Stability & Validation**: Added Tomcat Home path validation and optimized port conflict resolution.

## [1.0.1] - 2026-03-31
- Renamed extension to **Happy Spring Tomcat**.
- Official release on Visual Studio Marketplace with updated branding.
- Initial features: Scaffolding, Colorized Logs, JNDI support, Hot Reload.
- Automatic scaffolding of Tomcat debug configurations (`.vscode/happy-spring-tomcat/`).
- Automated `tasks.json` and `launch.json` setup for easy "Press F5" debugging.
- PowerShell-based log colorization for better readability.
- Support for JNDI DataSources and Hot Reload (PreResources).
- Automatic port conflict resolution (kills existing processes on same port).
