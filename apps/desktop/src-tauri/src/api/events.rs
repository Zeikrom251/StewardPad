//! Server-Sent Events, as the API's live events send them: `event:`, `data:` and `id:` lines,
//! a blank line ending each event, and `: ping` comments every 20 s to show the line is alive.

use std::io::{self, BufRead, BufReader, Read};

#[derive(Debug, PartialEq, Eq)]
pub struct SseEvent {
    pub name: String,
    pub data: String,
    pub id: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Line {
    Event(SseEvent),
    /// A comment: nothing to apply, but the connection is alive.
    Heartbeat,
}

pub struct EventStream<R> {
    reader: BufReader<R>,
    name: Option<String>,
    data: Vec<String>,
    id: Option<String>,
}

impl<R: Read> EventStream<R> {
    pub fn new(reader: R) -> Self {
        Self { reader: BufReader::new(reader), name: None, data: Vec::new(), id: None }
    }

    /// The next event or heartbeat; None when the API ended the stream.
    pub fn next_line(&mut self) -> io::Result<Option<Line>> {
        let mut raw = String::new();
        loop {
            raw.clear();
            if self.reader.read_line(&mut raw)? == 0 {
                return Ok(None);
            }
            let line = raw.trim_end_matches(['\r', '\n']);
            if line.is_empty() {
                if let Some(event) = self.dispatch() {
                    return Ok(Some(Line::Event(event)));
                }
            } else if line.starts_with(':') {
                return Ok(Some(Line::Heartbeat));
            } else {
                self.field(line);
            }
        }
    }

    fn field(&mut self, line: &str) {
        let (key, value) = line.split_once(':').unwrap_or((line, ""));
        let value = value.strip_prefix(' ').unwrap_or(value).to_string();
        match key {
            "event" => self.name = Some(value),
            "data" => self.data.push(value),
            "id" => self.id = Some(value),
            _ => {}
        }
    }

    fn dispatch(&mut self) -> Option<SseEvent> {
        let name = self.name.take();
        let id = self.id.take();
        if self.data.is_empty() && name.is_none() {
            return None;
        }
        let data = std::mem::take(&mut self.data).join("\n");
        Some(SseEvent { name: name.unwrap_or_else(|| "message".into()), data, id })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_events_heartbeats_and_ids_and_stops_at_the_end() {
        let wire = ": ping\n\nevent: hello\ndata: {\"revision\":\"7\"}\n\n\
                    event: incident\nid: 8\ndata: {\"a\":\ndata: 1}\r\n\r\n";
        let mut stream = EventStream::new(wire.as_bytes());
        assert_eq!(stream.next_line().unwrap(), Some(Line::Heartbeat));
        let hello = SseEvent { name: "hello".into(), data: "{\"revision\":\"7\"}".into(), id: None };
        assert_eq!(stream.next_line().unwrap(), Some(Line::Event(hello)));
        let incident = SseEvent { name: "incident".into(), data: "{\"a\":\n1}".into(), id: Some("8".into()) };
        assert_eq!(stream.next_line().unwrap(), Some(Line::Event(incident)));
        assert_eq!(stream.next_line().unwrap(), None);
    }
}
