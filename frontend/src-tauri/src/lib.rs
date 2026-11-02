use std::sync::Mutex;

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

struct BackendProcess(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            #[cfg(not(debug_assertions))]
            {
                let (mut events, child) = app
                    .shell()
                    .sidecar("atscheck-backend")?
                    .args(["--host", "127.0.0.1", "--port", "8000"])
                    .spawn()?;

                app.manage(BackendProcess(Mutex::new(Some(child))));
                tauri::async_runtime::spawn(async move {
                    while events.recv().await.is_some() {}
                });
            }

            #[cfg(debug_assertions)]
            let _ = app;

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build ATSCheck Desktop");

    app.run(|app_handle, event| {
        if matches!(event, RunEvent::Exit) {
            if let Some(backend) = app_handle.try_state::<BackendProcess>() {
                if let Ok(mut child) = backend.0.lock() {
                    if let Some(child) = child.take() {
                        if let Err(error) = child.kill() {
                            eprintln!("Could not stop the local ATSCheck API: {error}");
                        }
                    }
                }
            }
        }
    });
}
