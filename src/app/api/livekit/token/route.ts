import { AccessToken } from "livekit-server-sdk";

export async function POST(request: Request) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return Response.json(
      {
        error: "Missing LiveKit environment variables."
      },
      { status: 500 }
    );
  }

  const body = (await request.json()) as {
    roomName?: string;
    participantName?: string;
  };
  const roomName = body.roomName?.trim();
  const participantName = body.participantName?.trim() || "Hiring manager";

  if (!roomName) {
    return Response.json({ error: "roomName is required." }, { status: 400 });
  }

  const identity = `${participantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID()}`;
  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    name: participantName,
    ttl: "2h"
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true
  });

  return Response.json({
    token: await token.toJwt(),
    url: livekitUrl,
    roomName,
    identity
  });
}
