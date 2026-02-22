@echo off
REM ============================================================
REM Node-RED Contrib Nodes - Build and Install Script
REM ============================================================
REM This script builds all node packages and installs them into Node-RED
REM ============================================================

setlocal enabledelayedexpansion

echo ============================================================
echo Node-RED Contrib Nodes - Build and Install
echo ============================================================
echo.

REM Set the project root directory
set "PROJECT_ROOT=%~dp0"
set "NODE_RED_DIR=C:\Users\4artu\.node-red"

REM Check if Node-RED directory exists
if not exist "%NODE_RED_DIR%" (
    echo ERROR: Node-RED directory not found: %NODE_RED_DIR%
    echo Please make sure Node-RED is installed.
    exit /b 1
)

echo [1/2] Building all node packages...
echo ============================================================
echo.

REM Counter for build status
set "BUILD_COUNT=0"
set "BUILD_ERRORS=0"

REM Build each node package
for /d %%G in ("%PROJECT_ROOT%node-red-contrib-*") do (
    echo Building: %%~nxG
    cd "%%G"
    call npm install 2>&1
    if errorlevel 1 (
        echo ERROR: Failed to build %%~nxG
        set /a BUILD_ERRORS+=1
    ) else (
        set /a BUILD_COUNT+=1
        echo SUCCESS: %%~nxG
    )
    echo.
)

echo ============================================================
echo Build Summary: !BUILD_COUNT! packages built, !BUILD_ERRORS! errors
echo ============================================================
echo.

if !BUILD_ERRORS! gtr 0 (
    echo WARNING: Some packages failed to build.
    echo Continuing with installation of successful packages...
    echo.
)

echo [2/2] Installing nodes into Node-RED...
echo ============================================================
echo.

REM Change to Node-RED directory
cd "%NODE_RED_DIR%"
if errorlevel 1 (
    echo ERROR: Cannot access Node-RED directory: %NODE_RED_DIR%
    exit /b 1
)

REM Counter for install status
set "INSTALL_COUNT=0"
set "INSTALL_ERRORS=0"

REM Install each node into Node-RED
for /d %%G in ("%PROJECT_ROOT%node-red-contrib-*") do (
    echo Installing: %%~nxG
    call npm install "%%G" 2>&1
    if errorlevel 1 (
        echo ERROR: Failed to install %%~nxG
        set /a INSTALL_ERRORS+=1
    ) else (
        set /a INSTALL_COUNT+=1
        echo SUCCESS: %%~nxG installed
    )
    echo.
)

echo ============================================================
echo Installation Summary: !INSTALL_COUNT! packages installed, !INSTALL_ERRORS! errors
echo ============================================================
echo.

if !INSTALL_ERRORS! gtr 0 (
    echo WARNING: Some packages failed to install.
    echo.
)

echo ============================================================
echo Installation complete!
echo ============================================================
echo.
echo Installed nodes:
echo   - node-red-contrib-ollama-chat (Chat with Ollama models)
echo   - node-red-contrib-ollama-embeddings (Generate embeddings)
echo   - node-red-contrib-faiss (FAISS vector store)
echo   - node-red-contrib-cheerio (HTML parser)
echo   - node-red-contrib-text-splitter (Text chunking)
echo   - node-red-contrib-turndown (HTML to Markdown)
echo   - node-red-contrib-mcp (Model Context Protocol)
echo   - node-red-contrib-mlflow-tracing (MLflow tracking ^& tracing)
echo.
echo Please restart Node-RED to load the new nodes.
echo   node-red-stop
echo   node-red-start
echo.
echo View MLflow UI at: http://localhost:5000
echo.

endlocal
