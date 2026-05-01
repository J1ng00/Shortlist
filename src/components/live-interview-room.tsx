"use client";

import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useLocalParticipant
} from "@livekit/components-react";
import { useEffect, useState, useTransition } from "react";

import { Card } from "@/components/ui";
import { cn } from "@/lib/utils";

type LiveInterviewRoomProps = {
  candidateName: string;
  className?: string;
  onConnectedChange?: (isConnected: boolean) => void;
  onMicrophoneEnabledChange?: (isEnabled: boolean) => void;
  participantName: string;
  roomName: string;
};

type TokenResponse = {
  token: string;
  url: string;
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const responseText = await response.text();

  try {
    return responseText ? (JSON.parse(responseText) as T) : ({} as T);
  } catch {
    throw new Error("API returned an HTML page instead of JSON. If this is the ngrok candidate link, the ngrok warning or a server error page is blocking the request.");
  }
}

export function LiveInterviewRoom({
  candidateName,
  className,
  onConnectedChange,
  onMicrophoneEnabledChange,
  participantName,
  roomName
}: LiveInterviewRoomProps) {
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function joinRoom() {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/livekit/token", {
          method: "POST",
          headers: {
            "ngrok-skip-browser-warning": "true",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            roomName,
            participantName
          })
        });

        const payload = await readJsonResponse<TokenResponse & { error?: string }>(response);

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to join LiveKit room.");
        }

        setConnection(payload);
      } catch (joinError) {
        setError(joinError instanceof Error ? joinError.message : "Unable to join LiveKit room.");
      }
    });
  }

  if (!connection) {
    return (
      <Card className={cn("min-h-[28rem] bg-ink text-paper", className)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-paper/60">Meeting room</p>
            <h2 className="mt-1 text-3xl font-black">LiveKit interview room</h2>
          </div>
        </div>
        <div className="mt-8 grid min-h-72 place-items-center rounded-3xl border border-paper/15 bg-paper/10 p-6 text-center">
          <div>
            <p className="text-lg font-black">Join the live interview room for {candidateName}.</p>
            <p className="mt-3 max-w-xl text-sm leading-6 text-paper/70">
              You will appear as {participantName}. This will request camera and microphone permission, then create or
              join a LiveKit room for this candidate.
            </p>
            {error ? (
              <p className="mt-5 rounded-2xl bg-clay/20 p-3 text-sm font-bold text-paper">{error}</p>
            ) : null}
            <button
              className="mt-6 rounded-full bg-paper px-5 py-3 text-sm font-bold text-ink transition hover:bg-sand disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              type="button"
              onClick={joinRoom}
            >
              {isPending ? "Joining..." : "Join with camera and mic"}
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden bg-ink p-0 text-paper", className)}>
      <LiveKitRoom
        key={connection.token}
        audio
        video
        connect
        data-lk-theme="default"
        serverUrl={connection.url}
        token={connection.token}
        className="min-h-[30rem] lg:h-[calc(100vh-10.5rem)]"
        onConnected={() => onConnectedChange?.(true)}
        onDisconnected={() => {
          onConnectedChange?.(false);
          onMicrophoneEnabledChange?.(false);
          setConnection(null);
        }}
      >
        <MicrophoneStateBridge onMicrophoneEnabledChange={onMicrophoneEnabledChange} />
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </Card>
  );
}

function MicrophoneStateBridge({
  onMicrophoneEnabledChange
}: {
  onMicrophoneEnabledChange?: (isEnabled: boolean) => void;
}) {
  const { isMicrophoneEnabled } = useLocalParticipant();

  useEffect(() => {
    onMicrophoneEnabledChange?.(isMicrophoneEnabled);
  }, [isMicrophoneEnabled, onMicrophoneEnabledChange]);

  return null;
}
