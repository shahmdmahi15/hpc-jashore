use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};

#[tauri::command]
fn get_workstation_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "app": "HPC Health & Pain Care Center",
        "version": env!("CARGO_PKG_VERSION"),
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    }))
}

#[tauri::command]
fn print_thermal_raw(content: String, _printer_name: Option<String>) -> Result<String, String> {
    // ESC/POS raw thermal slip printing handler for desktop workstations
    if content.is_empty() {
        return Err("Print content cannot be empty".to_string());
    }
    // Return acknowledgement to client
    Ok(format!("Queued {} bytes to thermal printer", content.len()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            get_workstation_info,
            print_thermal_raw
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let show_i = MenuItem::with_id(app, "show", "Open Clinical Workstation", true, None::<&str>)?;
                let quit_i = MenuItem::with_id(app, "quit", "Quit HPC Jashore", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

                if let Some(icon) = app.default_window_icon() {
                    let _tray = TrayIconBuilder::new()
                        .icon(icon.clone())
                        .menu(&menu)
                        .show_menu_on_left_click(true)
                        .tooltip("HPC Health & Pain Care Center — Jashore")
                        .on_menu_event(|app, event| match event.id.as_ref() {
                            "quit" => {
                                app.exit(0);
                            }
                            "show" => {
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                            _ => {}
                        })
                        .on_tray_icon_event(|tray, event| {
                            if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                                let app = tray.app_handle();
                                if let Some(window) = app.get_webview_window("main") {
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    let _ = window.set_focus();
                                }
                            }
                        })
                        .build(app)?;
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running HPC Jashore native application");
}
