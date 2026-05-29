/// Returns a stable per-machine device identifier used to bind license keys
/// and track the free trial. On Windows this reads the OS MachineGuid from the
/// registry (HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid), which survives
/// app reinstalls and is far stickier than a localStorage value. The JS side
/// falls back to a persisted UUID if this command is unavailable.
#[tauri::command]
fn get_device_id() -> Result<String, String> {
  #[cfg(target_os = "windows")]
  {
    use winreg::enums::HKEY_LOCAL_MACHINE;
    use winreg::RegKey;
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let crypto = hklm
      .open_subkey(r"SOFTWARE\Microsoft\Cryptography")
      .map_err(|e| e.to_string())?;
    let guid: String = crypto.get_value("MachineGuid").map_err(|e| e.to_string())?;
    Ok(format!("win-{}", guid))
  }
  #[cfg(not(target_os = "windows"))]
  {
    Err("unsupported_platform".to_string())
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![get_device_id])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
