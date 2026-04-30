"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, RefreshCw } from "lucide-react";

import { LiveInterviewRoom } from "@/components/live-interview-room";
import { Card, Pill } from "@/components/ui";

type LiveInterviewConsoleProps = {
  candidateId: string;
  candidateName: string;
  initialSuggestions?: LiveSuggestions;
  latestSessionId?: string;
  initialNotes: string;
  participantRole: "manager" | "candidate";
  roomName: string;
};

type TranscriptLine = {
  id: string;
  speaker: "Manager" | "Candidate";
  text: string;
  timestamp: string;
};

type TranscriptionStatus = "idle" | "starting" | "listening" | "transcribing" | "paused" | "error";

type LiveSuggestions = {
  followUpQuestions: string[];
  coveredFollowUpQuestions: string[];
  flags: string[];
  evidenceCaptured: string[];
  meetingNotes: string[];
};

const emptySuggestions: LiveSuggestions = {
  followUpQuestions: [],
  coveredFollowUpQuestions: [],
  flags: [],
  evidenceCaptured: [],
  meetingNotes: []
};

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

function mergeUniqueItems(currentItems: string[], incomingItems: string[] | undefined) {
  const mergedItems = [...currentItems];
  const seenItems = new Set(currentItems);

  for (const item of incomingItems ?? []) {
    const trimmedItem = item.trim();

    if (trimmedItem && !seenItems.has(trimmedItem)) {
      mergedItems.push(trimmedItem);
      seenItems.add(trimmedItem);
    }
  }

  return mergedItems;
}

function mergeSuggestions(currentSuggestions: LiveSuggestions, incomingSuggestions: LiveSuggestions): LiveSuggestions {
  return {
    followUpQuestions: mergeUniqueItems(currentSuggestions.followUpQuestions, incomingSuggestions.followUpQuestions),
    coveredFollowUpQuestions: mergeUniqueItems(
      currentSuggestions.coveredFollowUpQuestions,
      incomingSuggestions.coveredFollowUpQuestions
    ),
    flags: mergeUniqueItems(currentSuggestions.flags, incomingSuggestions.flags),
    evidenceCaptured: mergeUniqueItems(currentSuggestions.evidenceCaptured, incomingSuggestions.evidenceCaptured),
    meetingNotes: mergeUniqueItems(currentSuggestions.meetingNotes, incomingSuggestions.meetingNotes)
  };
}

function normalizedWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function isSimilarText(firstText: string, secondText: string) {
  const firstWords = new Set(normalizedWords(firstText));
  const secondWords = new Set(normalizedWords(secondText));

  if (firstWords.size === 0 || secondWords.size === 0) {
    return false;
  }

  const sharedWordCount = [...firstWords].filter((word) => secondWords.has(word)).length;
  const largerWordCount = Math.max(firstWords.size, secondWords.size);

  return sharedWordCount >= 4 && sharedWordCount / largerWordCount >= 0.75;
}

function setContainsSimilarText(items: Set<string>, item: string) {
  return [...items].some((currentItem) => currentItem === item || isSimilarText(currentItem, item));
}

function cleanQuestionText(question: string) {
  return question.split(/\s[-–—]\s/)[0]?.trim() ?? question.trim();
}

function uniqueCleanItems(items: string[]) {
  const seenItems = new Set<string>();
  const cleanItems: string[] = [];

  for (const item of items) {
    const cleanItem = cleanQuestionText(item);

    if (cleanItem && !seenItems.has(cleanItem)) {
      seenItems.add(cleanItem);
      cleanItems.push(cleanItem);
    }
  }

  return cleanItems;
}

function uniqueItems(items: string[]) {
  const seenItems = new Set<string>();
  const cleanItems: string[] = [];

  for (const item of items) {
    const cleanItem = item.trim();

    if (cleanItem && !seenItems.has(cleanItem)) {
      seenItems.add(cleanItem);
      cleanItems.push(cleanItem);
    }
  }

  return cleanItems;
}

export function LiveInterviewConsole({
  candidateId,
  candidateName,
  initialSuggestions = emptySuggestions,
  initialNotes,
  latestSessionId,
  participantRole,
  roomName
}: LiveInterviewConsoleProps) {
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [isLiveKitMicEnabled, setIsLiveKitMicEnabled] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [manualNotes, setManualNotes] = useState(initialNotes);
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [transcriptionError, setTranscriptionError] = useState("");
  const [suggestions, setSuggestions] = useState<LiveSuggestions>(() => mergeSuggestions(emptySuggestions, initialSuggestions));
  const [isAiSectionOpen, setIsAiSectionOpen] = useState(true);
  const [isTranscriptSectionOpen, setIsTranscriptSectionOpen] = useState(false);
  const [coveredQuestions, setCoveredQuestions] = useState<Set<string>>(() => new Set());
  const [manuallyUncoveredQuestions, setManuallyUncoveredQuestions] = useState<Set<string>>(() => new Set());
  const [manualMeetingNote, setManualMeetingNote] = useState("");
  const [suggestionsError, setSuggestionsError] = useState("");
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
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
  const hasLoadedInitialSuggestionsRef = useRef(false);
  const suggestionsRequestInFlightRef = useRef(false);
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

  const refreshSuggestions = useCallback(async () => {
    if (!latestSessionId || isCandidate || suggestionsRequestInFlightRef.current) {
      return;
    }

    suggestionsRequestInFlightRef.current = true;
    setSuggestionsLoading(true);
    setSuggestionsError("");

    try {
      const response = await fetch("/api/interview/live-suggestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          candidateId,
          sessionId: latestSessionId
        })
      });
      const payload = (await response.json()) as {
        data?: LiveSuggestions;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to generate live suggestions.");
      }

      if (payload.data) {
        setSuggestions((currentSuggestions) => mergeSuggestions(currentSuggestions, payload.data ?? emptySuggestions));
      }

      if (payload.error) {
        setSuggestionsError(payload.error);
      }
    } catch (error) {
      setSuggestionsError(error instanceof Error ? error.message : "Unable to generate live suggestions.");
    } finally {
      suggestionsRequestInFlightRef.current = false;
      setSuggestionsLoading(false);
    }
  }, [candidateId, isCandidate, latestSessionId, manuallyUncoveredQuestions]);

  const addManualMeetingNote = useCallback(async () => {
    const trimmedNote = manualMeetingNote.trim();

    if (!trimmedNote) {
      return;
    }

    setSuggestions((currentSuggestions) =>
      mergeSuggestions(currentSuggestions, {
        ...emptySuggestions,
        meetingNotes: [trimmedNote]
      })
    );
    setManualMeetingNote("");

    if (!latestSessionId) {
      return;
    }

    try {
      const response = await fetch("/api/interview/live-notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          meetingNote: trimmedNote,
          sessionId: latestSessionId
        })
      });
      const payload = (await response.json()) as { data?: LiveSuggestions; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save meeting note.");
      }

      if (payload.data) {
        setSuggestions((currentSuggestions) => mergeSuggestions(currentSuggestions, payload.data ?? emptySuggestions));
      }
    } catch (error) {
      setSuggestionsError(error instanceof Error ? error.message : "Unable to save meeting note.");
    }
  }, [latestSessionId, manualMeetingNote]);

  useEffect(() => {
    if (suggestions.followUpQuestions.length === 0) {
      return;
    }

    const managerTranscriptLines = transcriptLines.filter((line) => line.speaker === "Manager");

    if (managerTranscriptLines.length === 0) {
      return;
    }

    setCoveredQuestions((currentQuestions) => {
      const nextQuestions = new Set(currentQuestions);
      let hasNewCoveredQuestion = false;

      for (const question of suggestions.followUpQuestions) {
        if (
          setContainsSimilarText(manuallyUncoveredQuestions, cleanQuestionText(question)) ||
          setContainsSimilarText(nextQuestions, cleanQuestionText(question))
        ) {
          continue;
        }

        const wasAskedByManager = managerTranscriptLines.some((line) => isSimilarText(line.text, cleanQuestionText(question)));

        if (wasAskedByManager) {
          nextQuestions.add(cleanQuestionText(question));
          hasNewCoveredQuestion = true;
        }
      }

      return hasNewCoveredQuestion ? nextQuestions : currentQuestions;
    });
  }, [manuallyUncoveredQuestions, suggestions.followUpQuestions, transcriptLines]);

  useEffect(() => {
    if (isCandidate || !candidateId || !latestSessionId || hasLoadedInitialSuggestionsRef.current) {
      return;
    }

    hasLoadedInitialSuggestionsRef.current = true;
    void refreshSuggestions();
  }, [candidateId, isCandidate, latestSessionId, refreshSuggestions]);

  useEffect(() => {
    if (!isRoomConnected || isCandidate || !latestSessionId) {
      return;
    }

    void refreshSuggestions();
    const intervalId = window.setInterval(() => {
      void refreshSuggestions();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCandidate, isRoomConnected, latestSessionId, refreshSuggestions]);

  const statusLabel = {
    idle: "Idle",
    starting: "Starting",
    listening: "Listening",
    transcribing: "Transcribing",
    paused: "Paused",
    error: "Error"
  }[status];
  const latestTranscriptLines = transcriptLines.slice(-3);

  return (
    <div className="relative">
      {isPanelVisible ? null : (
        <button
          aria-label="Show AI panel"
          className="absolute right-0 top-6 z-30 flex h-14 w-10 items-center justify-center rounded-l-2xl bg-clay text-navy shadow-[0_12px_28px_rgba(159,186,242,0.16)] transition-all duration-200 ease-out hover:translate-x-0.5 hover:bg-clay/85 active:scale-95"
          type="button"
          onClick={() => setIsPanelVisible(true)}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      <div
        className={`grid items-start gap-4 transition-[grid-template-columns] duration-300 ease-out ${
          isPanelVisible ? "xl:grid-cols-[minmax(0,1fr)_minmax(360px,400px)]" : "xl:grid-cols-[minmax(0,1fr)_0px]"
        }`}
      >
        <div className="min-w-0 space-y-3">
          <LiveInterviewRoom
            candidateName={candidateName}
            className="lg:min-h-[calc(100vh-10.5rem)]"
            participantName={participantName}
            roomName={roomName}
            onConnectedChange={handleRoomConnectedChange}
            onMicrophoneEnabledChange={setIsLiveKitMicEnabled}
          />
          <div className="min-h-24 rounded-3xl border border-ink/10 bg-ink p-4 text-paper shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-black text-paper/70">Live transcript</p>
              <Pill tone={status === "error" ? "warn" : status === "listening" ? "good" : "neutral"}>
                {statusLabel}
              </Pill>
            </div>
            <div className="mt-3 max-h-24 space-y-2 overflow-hidden">
              {latestTranscriptLines.length > 0 ? (
                latestTranscriptLines.map((line) => (
                  <p key={line.id} className="truncate text-sm leading-5 text-paper/80">
                    <span className="font-black text-paper">{line.speaker}:</span> {line.text}
                  </p>
                ))
              ) : (
                <p className="text-sm leading-5 text-paper/55">
                  Latest transcript lines will appear here during the current session.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside
          aria-hidden={!isPanelVisible}
          className={`relative overflow-visible pr-1 transition-all duration-300 ease-out ${
            isPanelVisible
              ? "pointer-events-auto translate-x-0 opacity-100"
              : "pointer-events-none translate-x-4 opacity-0"
          }`}
        >
        {isCandidate ? (
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Candidate mode</h2>
              <Pill tone={status === "error" ? "warn" : status === "listening" ? "good" : "neutral"}>
                {statusLabel}
              </Pill>
            </div>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              You are joining as {candidateName}. Your microphone is transcribed as Candidate after short pauses in
              speech for this demo. Muting your LiveKit microphone pauses transcription too.
            </p>
            {transcriptionError ? (
              <p className="mt-4 rounded-2xl bg-clay/10 p-3 text-sm font-bold text-clay">{transcriptionError}</p>
            ) : null}
          </Card>
        ) : null}

        {isCandidate ? null : (
          <div className="relative overflow-visible before:absolute before:inset-y-0 before:left-0 before:z-20 before:w-2 before:bg-clay before:content-['']">
            <button
              aria-label="Hide AI panel"
              className="absolute -left-9 top-8 z-30 flex h-14 w-10 items-center justify-center rounded-l-2xl bg-clay text-navy shadow-[0_12px_28px_rgba(159,186,242,0.16)] transition-all duration-200 ease-out hover:-translate-x-0.5 hover:bg-clay/85 active:scale-95"
              type="button"
              onClick={() => setIsPanelVisible(false)}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          <Card className="relative z-10 space-y-3 rounded-l-none border-l-0 p-3 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
            <section className="rounded-2xl border border-ink/10 bg-white/70">
              <div className="flex w-full items-center justify-between gap-3 p-4">
                <h2 className="text-xl font-black">AI copilot</h2>
                <div className="flex items-center gap-2">
                  <button
                    aria-label={suggestionsLoading ? "Updating suggestions" : "Refresh suggestions"}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/20 bg-paper text-navy transition hover:border-ink/40 hover:bg-white disabled:cursor-wait disabled:opacity-60"
                    disabled={suggestionsLoading}
                    title={suggestionsLoading ? "Updating suggestions" : "Refresh suggestions"}
                    type="button"
                    onClick={refreshSuggestions}
                  >
                    {suggestionsLoading ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    aria-label={isAiSectionOpen ? "Collapse AI copilot" : "Expand AI copilot"}
                    className="flex h-9 w-9 items-center justify-center text-ink/60 transition hover:text-ink"
                    type="button"
                    onClick={() => setIsAiSectionOpen((currentValue) => !currentValue)}
                  >
                <ChevronDown
                  className={`h-5 w-5 text-ink/60 transition ${isAiSectionOpen ? "rotate-180" : ""}`}
                />
                  </button>
                </div>
              </div>
              {isAiSectionOpen ? (
                <div className="px-4 pb-4">
            {suggestionsError ? (
              <p className="mt-4 rounded-2xl bg-clay/10 p-3 text-sm font-bold text-clay">{suggestionsError}</p>
            ) : null}
            <div className="grid max-h-[28rem] gap-3 overflow-y-auto pr-1">
              <FollowUpQuestionSection
                coveredQuestions={coveredQuestions}
                emptyText="No follow-up questions yet."
                items={suggestions.followUpQuestions}
                manuallyUncoveredQuestions={manuallyUncoveredQuestions}
                onToggleQuestion={(question) => {
                  const cleanQuestion = cleanQuestionText(question);
                  const isCurrentlyCovered =
                    setContainsSimilarText(coveredQuestions, cleanQuestion) &&
                    !setContainsSimilarText(manuallyUncoveredQuestions, cleanQuestion);

                  setCoveredQuestions((currentQuestions) => {
                    const nextQuestions = new Set(currentQuestions);

                    if (isCurrentlyCovered) {
                      nextQuestions.delete(cleanQuestion);
                    } else {
                      nextQuestions.add(cleanQuestion);
                    }

                    return nextQuestions;
                  });
                  setManuallyUncoveredQuestions((currentQuestions) => {
                    const nextQuestions = new Set(currentQuestions);

                    if (isCurrentlyCovered) {
                      nextQuestions.add(cleanQuestion);
                    } else {
                      nextQuestions.delete(cleanQuestion);
                    }

                    return nextQuestions;
                  });
                }}
                title="Follow-up questions"
              />
              <SuggestionSection emptyText="No flags yet." items={suggestions.flags} title="Flags" />
              <SuggestionSection
                emptyText="No evidence captured yet."
                items={suggestions.evidenceCaptured}
                title="Evidence captured"
              />
              <MeetingNotesSection
                items={suggestions.meetingNotes}
                manualMeetingNote={manualMeetingNote}
                onAddNote={() => void addManualMeetingNote()}
                onManualMeetingNoteChange={setManualMeetingNote}
              />
            </div>
                </div>
              ) : null}
            </section>

          <section className="rounded-2xl border border-ink/10 bg-white/70">
            <button
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
              type="button"
              onClick={() => setIsTranscriptSectionOpen((currentValue) => !currentValue)}
            >
              <h2 className="text-xl font-black">Full transcript</h2>
              <ChevronDown
                className={`h-5 w-5 text-ink/60 transition ${isTranscriptSectionOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isTranscriptSectionOpen ? (
              <div className="px-4 pb-4">
              {transcriptionError ? (
                <p className="mt-4 rounded-2xl bg-clay/10 p-3 text-sm font-bold text-clay">{transcriptionError}</p>
              ) : null}
              <textarea
                className="min-h-36 w-full resize-none rounded-2xl border border-ink/10 bg-white/70 p-3 text-sm leading-6 outline-none focus:border-clay"
                placeholder="Manual fallback: type or paste transcript notes here if automatic transcription is unavailable."
                value={manualNotes}
                onChange={(event) => setManualNotes(event.target.value)}
              />
              </div>
            ) : null}
          </section>
          </Card>
          </div>
        )}
        </aside>
      </div>
    </div>
  );
}

function FollowUpQuestionSection({
  coveredQuestions,
  emptyText,
  items,
  manuallyUncoveredQuestions,
  onToggleQuestion,
  title
}: {
  coveredQuestions: Set<string>;
  emptyText: string;
  items: string[];
  manuallyUncoveredQuestions: Set<string>;
  onToggleQuestion: (question: string) => void;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
      <h3 className="text-sm font-black text-ink">{title}</h3>
      <ul className="mt-3 space-y-2">
        {items.length > 0 ? (
          uniqueCleanItems(items)
            .slice(0, 4)
            .map((item) => {
            const isCovered =
              setContainsSimilarText(coveredQuestions, item) && !setContainsSimilarText(manuallyUncoveredQuestions, item);

            return (
              <li key={item} className="flex gap-3 text-sm leading-6">
                <button
                  aria-label={isCovered ? "Mark follow-up question as not covered" : "Mark follow-up question as covered"}
                  aria-pressed={isCovered}
                  className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border text-xs font-black transition ${
                    isCovered
                      ? "border-sage bg-sage text-white"
                      : "border-ink/20 bg-paper text-transparent hover:border-ink/40"
                  }`}
                  type="button"
                  onClick={() => onToggleQuestion(item)}
                >
                  ✓
                </button>
                <span className={isCovered ? "text-ink/35 line-through" : "text-ink/70"}>{item}</span>
              </li>
            );
          })
        ) : (
          <li className="text-sm leading-6 text-ink/45">{emptyText}</li>
        )}
      </ul>
    </div>
  );
}

function SuggestionSection({
  bullet = false,
  emptyText,
  items,
  title
}: {
  bullet?: boolean;
  emptyText: string;
  items: string[];
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
      <h3 className="text-sm font-black text-ink">{title}</h3>
      <ul className={`mt-3 space-y-2 ${bullet ? "list-disc pl-5" : ""}`}>
        {uniqueItems(items).length > 0 ? (
          uniqueItems(items).slice(0, 4).map((item) => (
            <li key={item} className={`text-sm leading-6 text-ink/70 ${bullet ? "pl-1" : ""}`}>
              {item}
            </li>
          ))
        ) : (
          <li className="text-sm leading-6 text-ink/45">{emptyText}</li>
        )}
      </ul>
    </div>
  );
}

function MeetingNotesSection({
  items,
  manualMeetingNote,
  onAddNote,
  onManualMeetingNoteChange
}: {
  items: string[];
  manualMeetingNote: string;
  onAddNote: () => void;
  onManualMeetingNoteChange: (note: string) => void;
}) {
  const notes = uniqueItems(items);

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/70 p-4">
      <h3 className="text-sm font-black text-ink">Meeting notes</h3>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        {notes.length > 0 ? (
          notes.slice(0, 4).map((item) => (
            <li key={item} className="pl-1 text-sm leading-6 text-ink/70">
              {item}
            </li>
          ))
        ) : (
          <li className="list-none text-sm leading-6 text-ink/45">No meeting notes yet.</li>
        )}
      </ul>
      <textarea
        className="mt-3 min-h-20 w-full resize-none rounded-2xl border border-ink/10 bg-paper p-3 text-sm leading-6 outline-none focus:border-clay"
        placeholder="Add a concise AI meeting note, e.g. Candidate gave strong evidence for customer support experience."
        value={manualMeetingNote}
        onChange={(event) => onManualMeetingNoteChange(event.target.value)}
      />
      <button
        className="mt-3 rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm font-bold text-ink transition hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!manualMeetingNote.trim()}
        type="button"
        onClick={onAddNote}
      >
        Add note
      </button>
    </div>
  );
}
