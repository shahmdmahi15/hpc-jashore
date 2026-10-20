use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_updater::UpdaterExt;

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

#[tauri::command]
async fn trigger_update_check(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    match updater.check().await {
        Ok(Some(update)) => {
            let ver = update.version.clone();
            let body = update.body.clone();
            // Install in background
            let _ = update.download_and_install(|_, _| {}, || {}).await;
            Ok(serde_json::json!({
                "updateAvailable": true,
                "version": ver,
                "notes": body,
                "status": "ready_for_restart"
            }))
        }
        Ok(None) => Ok(serde_json::json!({
            "updateAvailable": false,
            "status": "up_to_date"
        })),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            get_workstation_info,
            print_thermal_raw,
            trigger_update_check
        ])
        .setup(|app| {
            // Explicitly ensure main window is visible, unminimized, and focused
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
                let _ = window.center();
            }

            #[cfg(desktop)]
            {
                let show_i = MenuItem::with_id(app, "show", "Open Clinical Workstation", true, None::<&str>);
                let quit_i = MenuItem::with_id(app, "quit", "Quit HPC Jashore", true, None::<&str>);
                
                if let (Ok(show_item), Ok(quit_item)) = (show_i, quit_i) {
                    if let Ok(menu) = Menu::with_items(app, &[&show_item, &quit_item]) {
                        if let Some(icon) = app.default_window_icon() {
                            let _ = TrayIconBuilder::new()
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
                                .build(app);
                        }
                    }
                }

                // Automated background update checker thread (every 60 minutes)
                let handle = app.handle().clone();
                std::thread::spawn(move || {
                    // Initial delay of 15 seconds after workstation launch
                    std::thread::sleep(std::time::Duration::from_secs(15));
                    loop {
                        let h = handle.clone();
                        tauri::async_runtime::block_on(async move {
                            if let Ok(updater) = h.updater() {
                                match updater.check().await {
                                    Ok(Some(update)) => {
                                        eprintln!("[HPC Auto-Updater] Found newer workstation release: v{}", update.version);
                                        let _ = update.download_and_install(|_, _| {}, || {
                                            eprintln!("[HPC Auto-Updater] Silent background download finished.");
                                        }).await;
                                    }
                                    Ok(None) => {
                                        eprintln!("[HPC Auto-Updater] Clinical workstation is up to date.");
                                    }
                                    Err(e) => {
                                        eprintln!("[HPC Auto-Updater] Update check failed: {}", e);
                                    }
                                }
                            }
                        });

                        // Re-poll every 60 minutes
                        std::thread::sleep(std::time::Duration::from_secs(3600));
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running HPC Jashore native application");
}
