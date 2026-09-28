// Release builds get no console window on Windows. Do not remove.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    stewardpad_desktop_lib::run()
}
