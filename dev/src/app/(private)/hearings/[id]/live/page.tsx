'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { z } from 'zod';
import { Room, RoomEvent, type Participant, Track } from 'livekit-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mic, MicOff, Monitor, MonitorOff, PhoneOff, Video, VideoOff } from 'lucide-react';

type ApiError = { code: string; message: string };

const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([
    z.object({
      success: z.literal(true),
      data: dataSchema,
      message: z.string().optional(),
    }),
    z.object({
      success: z.literal(false),
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    }),
  ]);

const hearingResponseSchema = apiResponseSchema(
  z.object({
    hearing: z
      .object({
        id: z.string(),
        title: z.string().optional(),
        status: z.string().optional(),
        case: z
          .object({
            caseNumber: z.string().optional(),
            title: z.string().optional(),
          })
          .optional(),
      })
      .passthrough(),
    userRole: z.string().optional(),
    availableActions: z.array(z.string()).optional(),
  })
);

const tokenResponseSchema = apiResponseSchema(
  z.object({
    livekit: z.object({
      url: z.string().min(1),
      token: z.string().min(1),
      roomName: z.string().min(1),
      identity: z.string().min(1),
      displayName: z.string().min(1),
      caseNumber: z.string().optional(),
    }),
  })
);

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const item = document.cookie
    .split('; ')
    .find((c) => c.startsWith(prefix) || c.startsWith(`${name}=`));
  if (!item) return null;
  const raw = item.startsWith(prefix) ? item.slice(prefix.length) : item.slice(`${name}=`.length);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

type HearingSummary = {
  id: string;
  title?: string;
  status?: string;
  caseNumber?: string;
  caseTitle?: string;
  userRole?: string;
};

type LiveKitCredentials = {
  url: string;
  token: string;
  roomName: string;
  identity: string;
  displayName: string;
  caseNumber?: string;
};

function errorMessageOf(error: unknown): string {
  if (!error) return '未知错误';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || '未知错误';
  return '未知错误';
}

function ParticipantTile({
  participant,
  version,
  isActiveSpeaker,
}: {
  participant: Participant;
  version: number;
  isActiveSpeaker: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const videoTrack = useMemo(() => {
    const publications = Array.from(participant.videoTrackPublications.values());
    const pub = publications.find((p) => p.track && !p.isMuted);
    return pub?.track ?? null;
  }, [participant, version]);

  const audioTrack = useMemo(() => {
    const publications = Array.from(participant.audioTrackPublications.values());
    const pub = publications.find((p) => p.track && !p.isMuted);
    return pub?.track ?? null;
  }, [participant, version]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (!videoTrack) {
      el.srcObject = null;
      return;
    }
    videoTrack.attach(el);
    return () => {
      try {
        videoTrack.detach(el);
      } catch {}
    };
  }, [videoTrack]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!audioTrack) {
      el.srcObject = null;
      return;
    }
    if (participant.isLocal) return;
    audioTrack.attach(el);
    return () => {
      try {
        audioTrack.detach(el);
      } catch {}
    };
  }, [audioTrack, participant.isLocal]);

  const hasVideo = !!videoTrack && videoTrack.kind === Track.Kind.Video;

  return (
    <div
      className={[
        'relative overflow-hidden rounded-lg border bg-black/30',
        isActiveSpeaker ? 'border-emerald-400 shadow-[0_0_0_2px_rgba(52,211,153,0.35)]' : 'border-white/10',
      ].join(' ')}
    >
      <div className="aspect-video w-full bg-black">
        {hasVideo ? (
          <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted={participant.isLocal} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/60">
            <VideoOff className="h-6 w-6" />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-2 bg-black/60 px-2 py-1">
        <span className="truncate text-xs text-white/90">
          {participant.name || participant.identity}
          {participant.isLocal ? '（我）' : ''}
        </span>
        <div className="flex items-center gap-1">
          {!participant.isSpeaking ? (
            <Badge variant="secondary" className="bg-white/10 text-white/80">
              静音
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/20 text-emerald-200">发言中</Badge>
          )}
        </div>
      </div>

      <audio ref={audioRef} autoPlay playsInline />
    </div>
  );
}

function LiveKitRoomView({
  url,
  token,
  onDisconnected,
}: {
  url: string;
  token: string;
  onDisconnected: () => void;
}) {
  const [room, setRoom] = useState<Room | null>(null);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  useEffect(() => {
    const nextRoom = new Room({ adaptiveStream: true, dynacast: true });
    setRoom(nextRoom);

    const bump = () => setVersion((v) => v + 1);

    nextRoom.on(RoomEvent.ParticipantConnected, bump);
    nextRoom.on(RoomEvent.ParticipantDisconnected, bump);
    nextRoom.on(RoomEvent.ActiveSpeakersChanged, bump);
    nextRoom.on(RoomEvent.TrackSubscribed, bump);
    nextRoom.on(RoomEvent.TrackUnsubscribed, bump);
    nextRoom.on(RoomEvent.LocalTrackPublished, bump);
    nextRoom.on(RoomEvent.LocalTrackUnpublished, bump);
    nextRoom.on(RoomEvent.Disconnected, () => {
      bump();
      onDisconnected();
    });

    nextRoom
      .connect(url, token)
      .then(() => bump())
      .catch((err) => {
        setError(errorMessageOf(err));
      });

    return () => {
      try {
        nextRoom.removeAllListeners();
        nextRoom.disconnect();
      } catch {}
    };
  }, [url, token, onDisconnected]);

  useEffect(() => {
    if (!room) return;
    room.localParticipant
      .setMicrophoneEnabled(micEnabled)
      .catch((err) => setError(errorMessageOf(err)));
  }, [room, micEnabled]);

  useEffect(() => {
    if (!room) return;
    room.localParticipant
      .setCameraEnabled(cameraEnabled)
      .catch((err) => setError(errorMessageOf(err)));
  }, [room, cameraEnabled]);

  useEffect(() => {
    if (!room) return;
    room.localParticipant
      .setScreenShareEnabled(screenShareEnabled)
      .catch((err) => setError(errorMessageOf(err)));
  }, [room, screenShareEnabled]);

  const participants = useMemo(() => {
    if (!room) return [];
    const remotes = Array.from(room.remoteParticipants.values());
    return [room.localParticipant, ...remotes];
  }, [room, version]);

  const activeSpeakerIds = useMemo(() => {
    const ids = new Set<string>();
    room?.activeSpeakers?.forEach((p) => ids.add(p.identity));
    return ids;
  }, [room, version]);

  if (error) {
    return (
      <Card className="border-red-500/30 bg-red-500/10 text-white">
        <CardHeader>
          <CardTitle>连接失败</CardTitle>
          <CardDescription className="text-white/70">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="secondary" onClick={onDisconnected}>
            返回
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={() => setMicEnabled((v) => !v)}>
          {micEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          <span className="ml-2">{micEnabled ? '关闭麦克风' : '开启麦克风'}</span>
        </Button>
        <Button variant="secondary" onClick={() => setCameraEnabled((v) => !v)}>
          {cameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
          <span className="ml-2">{cameraEnabled ? '关闭摄像头' : '开启摄像头'}</span>
        </Button>
        <Button variant="secondary" onClick={() => setScreenShareEnabled((v) => !v)}>
          {screenShareEnabled ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
          <span className="ml-2">{screenShareEnabled ? '停止共享' : '共享屏幕'}</span>
        </Button>
        <Button variant="destructive" onClick={onDisconnected}>
          <PhoneOff className="h-4 w-4" />
          <span className="ml-2">离开庭审</span>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {participants.map((p) => (
          <ParticipantTile
            key={p.identity}
            participant={p}
            version={version}
            isActiveSpeaker={activeSpeakerIds.has(p.identity)}
          />
        ))}
      </div>
    </div>
  );
}

export default function LiveHearingPage() {
  const params = useParams<{ id: string }>();
  const hearingId = params?.id;

  const [hearing, setHearing] = useState<HearingSummary | null>(null);
  const [hearingError, setHearingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [credentials, setCredentials] = useState<LiveKitCredentials | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!hearingId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setHearingError(null);

        const res = await fetch(`/api/hearings/${encodeURIComponent(hearingId)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const json = (await res.json()) as unknown;
        const parsed = hearingResponseSchema.safeParse(json);
        if (!parsed.success) {
          throw new Error('响应格式错误');
        }

        if (parsed.data.success === false) {
          throw new Error(parsed.data.error.message);
        }

        const data = parsed.data.data;
        const nextHearing: HearingSummary = {
          id: data.hearing.id,
          title: data.hearing.title,
          status: data.hearing.status,
          caseNumber: data.hearing.case?.caseNumber,
          caseTitle: data.hearing.case?.title,
          userRole: data.userRole,
        };

        if (!cancelled) setHearing(nextHearing);
      } catch (err) {
        if (!cancelled) setHearingError(errorMessageOf(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hearingId]);

  const requestToken = useCallback(async () => {
    if (!hearingId) return;
    setJoining(true);
    try {
      const csrfToken = getCookieValue('csrf-token');

      const res = await fetch(`/api/hearings/${encodeURIComponent(hearingId)}/livekit/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ device: 'unknown' }),
      });

      const json = (await res.json()) as unknown;
      const parsed = tokenResponseSchema.safeParse(json);
      if (!parsed.success) {
        throw new Error('响应格式错误');
      }

      if (parsed.data.success === false) {
        throw new Error(parsed.data.error.message);
      }

      setCredentials(parsed.data.data.livekit);
    } catch (err) {
      setHearingError(errorMessageOf(err));
    } finally {
      setJoining(false);
    }
  }, [hearingId]);

  const onDisconnected = useCallback(() => {
    setCredentials(null);
  }, []);

  const title = hearing?.title || hearing?.caseTitle || '在线庭审';
  const caseNumber = hearing?.caseNumber || credentials?.caseNumber;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="border-b border-white/10 bg-gray-800 px-4 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold">{title}</h1>
              {caseNumber ? <Badge variant="secondary">{caseNumber}</Badge> : null}
            </div>
            {hearing?.userRole ? (
              <p className="mt-1 text-xs text-white/70">当前身份：{hearing.userRole}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={joining || !!credentials || loading} onClick={requestToken}>
              {joining ? '正在进入…' : credentials ? '已连接' : '进入视频庭审'}
            </Button>
            {credentials ? (
              <Button variant="destructive" onClick={onDisconnected}>
                <PhoneOff className="h-4 w-4" />
                <span className="ml-2">退出</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-4">
        {loading ? (
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>加载庭审信息</CardTitle>
              <CardDescription className="text-white/70">正在获取庭审详情与权限…</CardDescription>
            </CardHeader>
          </Card>
        ) : hearingError ? (
          <Card className="border-red-500/30 bg-red-500/10 text-white">
            <CardHeader>
              <CardTitle>无法进入庭审</CardTitle>
              <CardDescription className="text-white/70">{hearingError}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="secondary" onClick={() => setHearingError(null)}>
                关闭
              </Button>
            </CardContent>
          </Card>
        ) : credentials ? (
          <>
            <Separator className="my-4 bg-white/10" />
            <LiveKitRoomView url={credentials.url} token={credentials.token} onDisconnected={onDisconnected} />
          </>
        ) : (
          <Card className="border-white/10 bg-white/5 text-white">
            <CardHeader>
              <CardTitle>准备进入视频庭审</CardTitle>
              <CardDescription className="text-white/70">
                点击「进入视频庭审」后，系统将生成临时凭证并连接到会议室。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-white/70">
                <p>请确保浏览器已允许使用摄像头与麦克风。</p>
                <p>建议使用 Chrome/Edge 最新版本以获得最佳稳定性。</p>
              </div>
              <Button disabled={joining} onClick={requestToken}>
                {joining ? '正在进入…' : '进入视频庭审'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
