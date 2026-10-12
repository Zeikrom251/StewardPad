use std::io::{BufRead, BufReader, Write};
use std::net::TcpListener;
use std::sync::mpsc;

use super::{replay_time_path, seek};
use crate::error::ErrorKind;

const GAME_STATE: &str = include_str!("../../../tests/fixtures/live-game-state.json");

/// The live capture was taken while driving: the same payload with the replay open.
fn replay_open() -> String {
    GAME_STATE.replace("\"isReplayActive\": false", "\"isReplayActive\": true")
}

/// A stand-in for the game: answers each request with the next (status, body) and reports the
/// request line it received ("PUT /rest/... HTTP/1.1").
fn fake_game(answers: Vec<(u16, String)>) -> (String, mpsc::Receiver<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind a free port");
    let base = format!("http://{}", listener.local_addr().expect("local address"));
    let (requests, received) = mpsc::channel();
    std::thread::spawn(move || {
        for (status, body) in answers {
            let (mut stream, _) = listener.accept().expect("accept");
            let mut reader = BufReader::new(stream.try_clone().expect("clone stream"));
            let mut line = String::new();
            reader.read_line(&mut line).expect("request line");
            let mut header = String::new();
            while reader.read_line(&mut header).expect("header") > 2 {
                header.clear();
            }
            requests.send(line.trim_end().to_string()).expect("report the request");
            let head = format!("HTTP/1.1 {status} X\r\nContent-Length: {}\r\nConnection: close\r\n\r\n", body.len());
            stream.write_all(format!("{head}{body}").as_bytes()).expect("answer");
        }
    });
    (base, received)
}

#[test]
fn moves_the_open_replay_to_the_incident_time() {
    let (base, requests) = fake_game(vec![(200, replay_open()), (200, String::new())]);
    assert_eq!(seek(&base, 754.25, None), Ok(()));
    let sent: Vec<String> = requests.iter().collect();
    assert_eq!(sent, ["GET /rest/sessions/GetGameState HTTP/1.1", "PUT /rest/watch/replaytime/754.25 HTTP/1.1"]);
}

#[test]
fn points_the_camera_at_the_car_once_the_replay_has_moved() {
    let ok = || (200, String::new());
    let (base, requests) = fake_game(vec![(200, replay_open()), ok(), ok()]);
    assert_eq!(seek(&base, 754.25, Some(8)), Ok(()));
    let sent: Vec<String> = requests.iter().skip(1).collect();
    assert_eq!(sent, ["PUT /rest/watch/replaytime/754.25 HTTP/1.1", "PUT /rest/watch/focus/8 HTTP/1.1"]);
}

#[test]
fn says_the_replay_moved_when_only_the_camera_is_refused() {
    let (base, _requests) = fake_game(vec![(200, replay_open()), (200, String::new()), (404, String::new())]);
    let error = seek(&base, 754.25, Some(8)).expect_err("the camera was refused");
    assert_eq!(error.kind, ErrorKind::Refused);
    assert!(error.message.contains("replay moved"), "{}", error.message);
}

#[test]
fn asks_for_the_replay_and_moves_nothing_while_it_is_closed() {
    let (base, requests) = fake_game(vec![(200, GAME_STATE.to_string())]);
    let error = seek(&base, 754.25, None).expect_err("the replay is closed");
    assert_eq!(error.kind, ErrorKind::Invalid);
    assert_eq!(requests.iter().count(), 1, "only the game state is read");
}

#[test]
fn says_the_game_is_unreachable_when_nothing_listens() {
    let free = TcpListener::bind("127.0.0.1:0").expect("bind a free port");
    let base = format!("http://{}", free.local_addr().expect("local address"));
    drop(free);
    assert_eq!(seek(&base, 10.0, None).expect_err("nothing listens").kind, ErrorKind::Offline);
}

#[test]
fn reports_a_refused_seek() {
    let (base, _requests) = fake_game(vec![(200, replay_open()), (404, String::new())]);
    assert_eq!(seek(&base, 10.0, None).expect_err("the game refused").kind, ErrorKind::Refused);
}

#[test]
fn sends_milliseconds_and_never_a_time_before_the_start() {
    assert_eq!(replay_time_path(754.25), "/rest/watch/replaytime/754.25");
    assert_eq!(replay_time_path(60.0), "/rest/watch/replaytime/60");
    assert_eq!(replay_time_path(0.1 + 0.2), "/rest/watch/replaytime/0.3");
    assert_eq!(replay_time_path(-4.0), "/rest/watch/replaytime/0");
}
