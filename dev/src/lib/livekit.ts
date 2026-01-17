import { AccessToken, RoomServiceClient, type VideoGrant } from 'livekit-server-sdk';
import { getEnv } from '@/lib/env-validator';

export type LiveKitJoinToken = {
  url: string;
  token: string;
  roomName: string;
  identity: string;
};

function toHttpUrl(url: string): string {
  if (url.startsWith('wss://')) return `https://${url.slice('wss://'.length)}`;
  if (url.startsWith('ws://')) return `http://${url.slice('ws://'.length)}`;
  return url;
}

export function buildHearingRoomName(hearingId: string): string {
  return `hearing-${hearingId}`;
}

export async function createLiveKitJoinToken(params: {
  roomName: string;
  identity: string;
  name?: string;
  canPublish: boolean;
  canSubscribe: boolean;
}): Promise<LiveKitJoinToken> {
  const env = getEnv();

  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error('LIVEKIT_NOT_CONFIGURED');
  }

  const ttlSeconds = env.LIVEKIT_TOKEN_TTL_SECONDS ?? 10 * 60;
  const ttl = `${ttlSeconds}s`;

  const accessToken = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
    identity: params.identity,
    name: params.name,
    ttl,
  });

  const grant: VideoGrant = {
    room: params.roomName,
    roomJoin: true,
    canPublish: params.canPublish,
    canSubscribe: params.canSubscribe,
    canPublishData: true,
  };

  accessToken.addGrant(grant);

  const token = await accessToken.toJwt();

  return {
    url: env.LIVEKIT_URL,
    roomName: params.roomName,
    identity: params.identity,
    token,
  };
}

export async function ensureLiveKitRoom(roomName: string): Promise<void> {
  const env = getEnv();

  if (!env.LIVEKIT_URL || !env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    throw new Error('LIVEKIT_NOT_CONFIGURED');
  }

  const roomService = new RoomServiceClient(toHttpUrl(env.LIVEKIT_URL), env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);

  try {
    await roomService.createRoom({ name: roomName });
  } catch {
    // Room already exists or cannot be created; joining may still succeed if auto-create is enabled.
  }
}
