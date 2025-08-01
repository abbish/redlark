mod types;
mod database;
mod error;
mod handlers;
mod logger;
mod ai_service;
mod ai_model_handlers;
mod tts_service;
mod tts_handlers;

#[cfg(test)]
mod test_statistics;

use handlers::*;
use database::DatabaseManager;
use logger::Logger;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // 获取主窗口并打开开发者工具
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
                println!("Development mode: DevTools opened automatically");
            }

            tauri::async_runtime::block_on(async {
                // 获取应用数据目录
                let app_data_dir = app.path()
                    .app_data_dir()
                    .expect("Failed to get app data directory");

                // 确保目录存在
                std::fs::create_dir_all(&app_data_dir)
                    .expect("Failed to create app data directory");

                // 初始化日志系统
                let logger = Logger::new(&app_data_dir)
                    .expect("Failed to initialize logger");

                logger.info("APP", "Application starting up");
                logger.info("APP", &format!("App data directory: {}", app_data_dir.display()));

                #[cfg(debug_assertions)]
                logger.info("APP", "Running in development mode with DevTools enabled");

                // 构建数据库路径
                let db_path = app_data_dir.join("vocabulary.db");
                let db_url = format!("sqlite:{}", db_path.to_string_lossy());

                logger.info("DATABASE", &format!("Database path: {}", db_path.display()));

                // 初始化数据库
                match DatabaseManager::new(&db_url).await {
                    Ok(db_manager) => {
                        logger.info("DATABASE", "Database connection established");

                        // 运行迁移
                        match db_manager.migrate().await {
                            Ok(_) => {
                                logger.info("DATABASE", "Database migrations completed successfully");
                            }
                            Err(e) => {
                                logger.error("DATABASE", "Failed to run migrations", Some(&e.to_string()));
                                panic!("Failed to run migrations: {}", e);
                            }
                        }

                        let pool = db_manager.pool().clone();
                        app.manage(pool);
                        app.manage(logger);
                    }
                    Err(e) => {
                        logger.error("DATABASE", "Failed to initialize database", Some(&e.to_string()));
                        panic!("Failed to initialize database: {}", e);
                    }
                }
            });

            // 在初始化完成后显示窗口
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_word_books,
            get_word_book_detail,
            get_word_book_linked_plans,
            get_word_book_statistics,
            get_theme_tags,
            get_global_word_book_statistics,
            update_all_word_book_counts,
            create_word_book,
            update_word_book,
            delete_word_book,
            get_words_by_book,
            add_word_to_book,
            update_word,
            delete_word,
            get_study_plans,
            get_study_plan,
            update_study_plan,
            update_study_plan_basic_info,
            update_study_plan_with_schedule,
            create_study_plan,
            generate_study_plan_schedule,
            create_study_plan_with_schedule,
            get_study_statistics,
            // 学习计划状态管理命令
            start_study_plan,
            complete_study_plan,
            terminate_study_plan,
            restart_study_plan,
            edit_study_plan,
            publish_study_plan,
            delete_study_plan,
            get_study_plan_status_history,
            get_system_logs,

            create_word_book_from_analysis,
            ai_model_handlers::get_ai_providers,
            ai_model_handlers::get_ai_models,
            ai_model_handlers::get_all_ai_providers,
            ai_model_handlers::get_all_ai_models,
            ai_model_handlers::get_default_ai_model,
            ai_model_handlers::set_default_ai_model,
            ai_model_handlers::create_ai_provider,
            ai_model_handlers::update_ai_provider,
            ai_model_handlers::delete_ai_provider,
            ai_model_handlers::create_ai_model,
            ai_model_handlers::update_ai_model,
            ai_model_handlers::delete_ai_model,
            ai_model_handlers::analyze_phonics_with_model,
            get_analysis_progress,
            clear_analysis_progress,
            cancel_analysis,

            // 学习计划AI规划命令
            generate_study_plan_schedule,
            create_study_plan_with_schedule,

            // 新增的学习计划单词管理命令
            get_study_plan_words,
            get_study_plan_word_books,
            remove_word_from_plan,
            batch_remove_words_from_plan,
            get_study_plan_statistics,

            // 日历相关命令
            get_calendar_month_data,
            get_today_study_schedules,
            get_study_plan_calendar_data,
            diagnose_calendar_data,
            diagnose_study_plan_data,
            diagnose_today_schedules,

            // 数据管理相关命令
            get_database_statistics,
            reset_user_data,
            reset_selected_tables,
            delete_database_and_restart,

            // 单词练习相关命令
            start_practice_session,
            submit_step_result,
            pause_practice_session,
            resume_practice_session,
            complete_practice_session,
            cancel_practice_session,
            get_incomplete_practice_sessions,
            get_practice_session_detail,
            get_plan_practice_sessions,
            get_practice_statistics,
            get_study_plan_schedules,

            // TTS相关命令
            tts_handlers::text_to_speech,
            tts_handlers::get_tts_voices,
            tts_handlers::get_default_tts_voice,
            tts_handlers::get_tts_providers,
            tts_handlers::clear_tts_cache,

            tts_handlers::set_default_tts_voice,
            tts_handlers::get_elevenlabs_config,
            tts_handlers::update_elevenlabs_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

