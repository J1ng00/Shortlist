"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { LiveInterviewRoom } from "@/components/live-interview-room";
import { Card, Pill } from "@/components/ui";

type LiveInterviewConsoleProps = {
  candidateName: string;
  companyName: string;
  latestSessionId?: string;
  initialNotes: string;
  participantRole: "manager" | "candidate";
  roleTitle: string;
  roomName: string;
};

type TranscriptLine = {
  id: string;
  speaker: "Manager" | "Candidate";
  text: string;
  timestamp: string;
};

type TranscriptionStatus = "idle" | "starting" | "listening" | "transcribing" | "paused" | "error";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const recordingMimeType = "audio/webm;codecs=opus";
const silenceStopMs = 650;
const maxSegmentMs = 15000;
const minSegmentMs = 600;
const voiceStartThreshold = 0.035;
const voiceStopThreshold = 0.02;

function parseTranscriptNotes(notes: string, speakerFilter?: "Manager" | "Candidate"): TranscriptLine[] {
  return notes
    .split("\n")
    .map((line, index) => {
      const match = line.match(/^\[(.+?)]\s+(Manager|Candidate):\s+(.+)$/);

      if (!match) {
        return null;
      }

      const [, rawTimestamp, speaker, text] = match;

      if (speakerFilter && speaker !== speakerFilter) {
        return null;
      }

      const parsedDate = new Date(rawTimestamp);
      const timestamp = Number.isNaN(parsedDate.getTime())
        ? rawTimestamp
        : parsedDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          });

      return {
        id: `${rawTimestamp}-${speaker}-${index}`,
        speaker: speaker as "Manager" | "Candidate",
        text,
        timestamp
      };
    })
    .filter((line): line is TranscriptLine => Boolean(line));
}

export function LiveInterviewConsole({
  candidateName,
  companyName,
  initialNotes,
  latestSessionId,
  participantRole,
  roleTitle,
  roomName
}: LiveInterviewConsoleProps) {
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [isLiveKitMicEnabled, setIsLiveKitMicEnabled] = useState(false);
  const [manualNotes, setManualNotes] = useState(initialNotes);
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [transcriptionError, setTranscriptionError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const vadFrameRef = useRef<number | null>(null);
  const shouldRecordRef = useRef(false);
  const segmentStartedAtRef = useRef(0);
  const silenceStartedAtRef = useRef<number | null>(null);
  const notesBaselineRef = useRef(initialNotes);
  const savedNotesRef = useRef(initialNotes);
  const isCandidate = participantRole === "candidate";
  const participantName = isCandidate ? candidateName : "Hiring manager";
  const speakerLabel = isCandidate ? "Candidate" : "Manager";

  const transcribeChunk = useCallback(async (audio: Blob) => {
    const formData = new FormData();
    formData.append("sessionId", latestSessionId ?? "");
    formData.append("speaker", speakerLabel);
    formData.append("audio", audio, "manager-audio.webm");

    setStatus("transcribing");

    try {
      const response = await fetch("/api/interview/transcribe", {
        method: "POST",
        body: formData
      });

      const payload = (await response.json()) as { error?: string; text?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Transcription failed.");
      }

      const transcriptText = payload.text?.trim();

      if (transcriptText) {
        const timestamp = new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });

        setTranscriptLines((currentLines) => [
          ...currentLines,
          {
            id: crypto.randomUUID(),
            speaker: speakerLabel,
            text: transcriptText,
            timestamp
          }
        ]);
        setManualNotes(
          (currentNotes) => {
            const nextNotes = `${currentNotes}${currentNotes ? "\n" : ""}[${timestamp}] ${speakerLabel}: ${transcriptText}`;
            return nextNotes;
          }
        );
      }

      setStatus(shouldRecordRef.current ? "listening" : "paused");
    } catch (error) {
      setStatus("error");
      setTranscriptionError(error instanceof Error ? error.message : "Unable to transcribe audio.");
    }
  }, [latestSessionId, speakerLabel]);

  const startSpeechSegment = useCallback((stream: MediaStream) => {
    const chunks: Blob[] = [];
    const options = MediaRecorder.isTypeSupported(recordingMimeType) ? { mimeType: recordingMimeType } : undefined;
    const recorder = new MediaRecorder(stream, options);

    recorderRef.current = recorder;
    segmentStartedAtRef.current = Date.now();

    recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener("stop", () => {
      void (async () => {
        const segmentMs = Date.now() - segmentStartedAtRef.current;

        if (chunks.length > 0 && segmentMs >= minSegmentMs) {
          const type = recorder.mimeType || "audio/webm";
          await transcribeChunk(new Blob(chunks, { type }));
        }
      })();
    });

    recorder.start();
    setStatus("listening");
  }, [transcribeChunk]);

  const startTranscription = useCallback(async () => {
    if (shouldRecordRef.current) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setTranscriptionError("This browser does not support microphone recording.");
      return;
    }

    setStatus("starting");
    setTranscriptionError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextConstructor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const samples = new Uint8Array(analyser.fftSize);

      analyser.fftSize = 2048;
      source.connect(analyser);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      shouldRecordRef.current = true;

      const detectSpeech = () => {
        if (!shouldRecordRef.current) {
          return;
        }

        analyser.getByteTimeDomainData(samples);

        let sum = 0;

        for (const sample of samples) {
          const normalizedSample = (sample - 128) / 128;
          sum += normalizedSample * normalizedSample;
        }

        const volume = Math.sqrt(sum / samples.length);
        const isRecording = recorderRef.current?.state === "recording";
        const now = Date.now();

        if (!isRecording && volume >= voiceStartThreshold) {
          silenceStartedAtRef.current = null;
          startSpeechSegment(stream);
        }

        if (isRecording) {
          const segmentMs = now - segmentStartedAtRef.current;

          if (volume < voiceStopThreshold) {
            silenceStartedAtRef.current ??= now;
          } else {
            silenceStartedAtRef.current = null;
          }

          const silenceMs = silenceStartedAtRef.current ? now - silenceStartedAtRef.current : 0;

          if ((silenceMs >= silenceStopMs && segmentMs >= minSegmentMs) || segmentMs >= maxSegmentMs) {
            recorderRef.current?.stop();
            silenceStartedAtRef.current = null;
          }
        }

        vadFrameRef.current = window.requestAnimationFrame(detectSpeech);
      };

      setStatus("listening");
      vadFrameRef.current = window.requestAnimationFrame(detectSpeech);
    } catch (error) {
      setStatus("error");
      setTranscriptionError(error instanceof Error ? error.message : "Unable to start microphone transcription.");
    }
  }, [startSpeechSegment]);

  const stopTranscription = useCallback(() => {
    shouldRecordRef.current = false;

    if (vadFrameRef.current) {
      window.cancelAnimationFrame(vadFrameRef.current);
      vadFrameRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioContextRef.current?.close();
    recorderRef.current = null;
    streamRef.current = null;
    audioContextRef.current = null;
  }, []);

  const handleRoomConnectedChange = useCallback((isConnected: boolean) => {
    setIsRoomConnected(isConnected);

    if (isConnected) {
      notesBaselineRef.current = savedNotesRef.current;
      setTranscriptLines([]);
    } else {
      notesBaselineRef.current = savedNotesRef.current;
      setTranscriptLines([]);
      setTranscriptionError("");
    }
  }, []);

  useEffect(() => {
    if (!isRoomConnected || !isLiveKitMicEnabled) {
      stopTranscription();
      setStatus((currentStatus) => (currentStatus === "idle" ? "idle" : "paused"));
      return;
    }

    void startTranscription();

    return () => {
      stopTranscription();
    };
  }, [isLiveKitMicEnabled, isRoomConnected, startTranscription, stopTranscription]);

  useEffect(() => {
    if (!latestSessionId || isCandidate || !isRoomConnected) {
      return;
    }

    let isActive = true;

    async function refreshNotes() {
      try {
        const response = await fetch(`/api/interview/session-notes?sessionId=${latestSessionId}`);

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { notes?: string };
        const notes = payload.notes ?? "";

        if (isActive) {
          savedNotesRef.current = notes;
          setManualNotes(notes);
          const baseline = notesBaselineRef.current;
          const currentSessionNotes = notes.startsWith(baseline) ? notes.slice(baseline.length).trim() : notes;
          const remoteCandidateLines = parseTranscriptNotes(currentSessionNotes, "Candidate");

          setTranscriptLines((currentLines) => {
            const existingIds = new Set(currentLines.map((line) => line.id));
            const newLines = remoteCandidateLines.filter((line) => !existingIds.has(line.id));

            return newLines.length > 0 ? [...currentLines, ...newLines] : currentLines;
          });
        }
      } catch {
        // Keep the local transcript and notes visible if a polling refresh fails.
      }
    }

    void refreshNotes();
    const intervalId = window.setInterval(refreshNotes, 1000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [isCandidate, isRoomConnected, latestSessionId]);

  useLayoutEffect(() => {
    const transcriptScrollContainer = transcriptScrollRef.current;

    if (transcriptScrollContainer) {
      const currentWindowScrollY = window.scrollY;
      transcriptScrollContainer.scrollTop = transcriptScrollContainer.scrollHeight;
      window.scrollTo({ top: currentWindowScrollY });
    }
  }, [transcriptLines]);

  const statusLabel = {
    idle: "Idle",
    starting: "Starting",
    listening: "Listening",
    transcribing: "Transcribing",
    paused: "Paused",
    error: "Error"
  }[status];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <LiveInterviewRoom
        candidateName={candidateName}
        participantName={participantName}
        roomName={roomName}
        onConnectedChange={handleRoomConnectedChange}
        onMicrophoneEnabledChange={setIsLiveKitMicEnabled}
      />

      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Session</h2>
            <Pill tone={latestSessionId ? "good" : "warn"}>{latestSessionId ? "Scheduled" : "No session yet"}</Pill>
          </div>
          <div className="mt-4 space-y-3 text-sm leading-6 text-ink/70">
            <p>
              <strong className="text-ink">Candidate:</strong> {candidateName}
            </p>
            <p>
              <strong className="text-ink">You are joining as:</strong> {participantName}
            </p>
            <p>
              <strong className="text-ink">Role:</strong> {roleTitle}
            </p>
            <p>
              <strong className="text-ink">Company:</strong> {companyName}
            </p>
            {latestSessionId ? (
              <p>
                <strong className="text-ink">Session id:</strong> {latestSessionId}
              </p>
            ) : null}
          </div>
        </Card>

        {isCandidate ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Candidate mode</h2>
              <Pill tone={status === "error" ? "warn" : status === "listening" ? "good" : "neutral"}>
                {statusLabel}
              </Pill>
            </div>
            <p className="mt-4 text-sm leading-6 text-ink/70">
              You are joining as {candidateName}. Your microphone is transcribed as Candidate after short pauses in
              speech for this demo. Muting your LiveKit microphone pauses transcription too.
            </p>
            {transcriptionError ? (
              <p className="mt-4 rounded-2xl bg-clay/10 p-3 text-sm font-bold text-clay">{transcriptionError}</p>
            ) : null}
          </Card>
        ) : (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Live transcript</h2>
              <Pill tone={status === "error" ? "warn" : status === "listening" ? "good" : "neutral"}>
                {statusLabel}
              </Pill>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/60">
              Manager and candidate browsers each transcribe their own microphone after short pauses in speech.
              Successful transcript lines are saved to the current interview session notes. Muting your LiveKit
              microphone pauses transcription too.
            </p>
            {transcriptionError ? (
              <p className="mt-4 rounded-2xl bg-clay/10 p-3 text-sm font-bold text-clay">{transcriptionError}</p>
            ) : null}
            <div
              ref={transcriptScrollRef}
              className="mt-4 h-60 space-y-3 overflow-y-auto rounded-2xl border border-ink/10 bg-white/70 p-4"
            >
              {transcriptLines.length > 0 ? (
                transcriptLines.map((line) => (
                  <div key={line.id} className="text-sm leading-6">
                    <p className="font-black text-ink">
                      {line.speaker} <span className="font-semibold text-ink/40">{line.timestamp}</span>
                    </p>
                    <p className="text-ink/70">{line.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-ink/50">
                  Join the room and speak into your mic. Transcript lines will appear after you pause speaking.
                </p>
              )}
            </div>
            <textarea
              className="mt-4 min-h-36 w-full resize-none rounded-2xl border border-ink/10 bg-white/70 p-4 text-sm leading-6 outline-none focus:border-clay"
              placeholder="Manual fallback: type or paste transcript notes here if automatic transcription is unavailable."
              value={manualNotes}
              onChange={(event) => setManualNotes(event.target.value)}
            />
          </Card>
        )}

        {isCandidate ? null : (
          <Card>
            <h2 className="text-2xl font-black">AI copilot</h2>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-moss/10 p-4 text-sm leading-6 text-ink/70">
                Next step: send the rolling transcript to the copilot API for live follow-up suggestions.
              </div>
              <div className="rounded-2xl bg-clay/10 p-4 text-sm leading-6 text-ink/70">
                Missing-evidence flags and rubric updates are not wired in this slice yet.
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
