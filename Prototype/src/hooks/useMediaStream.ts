import { useState, useEffect, useCallback, useRef } from 'react';



export const useMediaStream = () => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<Error | null>(null);

    // Audio Analysis
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<any>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

    const startLocalStream = useCallback(async (video = true, audio = true) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
            setLocalStream(stream);
            setupAudioAnalysis(stream);
            return stream;
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to get media stream'));
            console.error('Error accessing media devices:', err);
            return null;
        }
    }, []);

    const stopLocalStream = useCallback(() => {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            setLocalStream(null);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
    }, [localStream]);

    const toggleAudio = useCallback(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                return audioTrack.enabled;
            }
        }
        return false;
    }, [localStream]);

    const toggleVideo = useCallback(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                return videoTrack.enabled;
            }
        }
        return false;
    }, [localStream]);

    const startScreenShare = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setScreenStream(stream);

            // Handle stream end (user clicked "Stop sharing" in browser UI)
            stream.getVideoTracks()[0].onended = () => {
                setScreenStream(null);
            };

            return stream;
        } catch (err) {
            console.error('Error sharing screen:', err);
            return null;
        }
    }, []);

    const stopScreenShare = useCallback(() => {
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            setScreenStream(null);
        }
    }, [screenStream]);

    const setupAudioAnalysis = (stream: MediaStream) => {
        if (!stream.getAudioTracks().length) return;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);

        analyser.fftSize = 256;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        sourceRef.current = source;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
    };

    const getAudioLevel = useCallback(() => {
        if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            const array = dataArrayRef.current;
            let values = 0;
            const length = array.length;
            for (let i = 0; i < length; i++) {
                values += array[i];
            }
            return values / length;
        }
        return 0;
    }, []);

    useEffect(() => {
        return () => {
            stopLocalStream();
            stopScreenShare();
        };
    }, [stopLocalStream, stopScreenShare]);

    return {
        localStream,
        screenStream,
        error,
        startLocalStream,
        stopLocalStream,
        toggleAudio,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        getAudioLevel
    };
};
