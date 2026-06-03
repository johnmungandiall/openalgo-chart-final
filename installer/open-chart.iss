; Inno Setup script - standalone Windows installer for Open Chart.
; Packages the single self-contained Tauri binary (app.exe) as a proper
; installed app named "Open Chart.exe" with Start Menu / desktop shortcuts
; and an uninstaller. No admin rights required (per-user install).
;
; Build:  "C:\Program Files\Inno Setup 7\ISCC.exe" installer\open-chart.iss
; Output: installer\Output\Open-Chart-<version>-Setup.exe
;
; Note: the app renders in the WebView2 runtime, which ships with Windows 10/11.

#define MyAppName "Open Chart"
#define MyAppVersion "1.0.3"
#define MyAppPublisher "Quantonomous"
#define MyAppExeName "Open Chart.exe"

[Setup]
AppId={{A1B2C3D4-E5F6-47A8-9B0C-1D2E3F4A5B6C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
VersionInfoVersion={#MyAppVersion}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=Open-Chart-{#MyAppVersion}-Setup
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
SetupIconFile=..\src-tauri\icons\icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "..\src-tauri\target\release\app.exe"; DestDir: "{app}"; DestName: "{#MyAppExeName}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
