#[path = "command/commands.rs"]
mod commands;
#[path = "model/models.rs"]
mod models;
#[path = "state/state.rs"]
mod state;

use tauri::Manager;
use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_data_dir()?;

            let db_path = app_data_dir.join("tasklet.db");

            let state = AppState::load(db_path)
                .map_err(std::io::Error::other)?;

            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_board,
            commands::update_board,
            commands::add_task,
            commands::delete_task,
            commands::undo,
            commands::redo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
