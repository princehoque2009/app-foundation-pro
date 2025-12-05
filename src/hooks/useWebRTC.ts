import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Call,
  iceServers,
  startCall,
  acceptCall,
  rejectCall,
  endCall,
  sendIceCandidate,
  listenToCallUpdates,
  listenForIncomingCalls,
  listenToIceCandidates,
} from "@/services/callingService";

export const useWebRTC = () => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = listenForIncomingCalls(user.id, setIncomingCall);
    return unsubscribe;
  }, [user?.id]);

  // Listen to current call updates
  useEffect(() => {
    if (!currentCall?.id) return;

    const unsubscribe = listenToCallUpdates(currentCall.id, (call) => {
      if (call) {
        setCurrentCall(call);
        
        if (call.status === "ended" || call.status === "rejected") {
          cleanup();
        }
      }
    });

    return unsubscribe;
  }, [currentCall?.id]);

  // Initialize peer connection
  const initializePeerConnection = useCallback(async (type: "audio" | "video") => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });

    setLocalStream(stream);

    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;

    // Add local tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    // Handle remote stream
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && currentCall?.id && user?.id) {
        await sendIceCandidate(currentCall.id, user.id, event.candidate);
      }
    };

    return pc;
  }, [currentCall?.id, user?.id]);

  // Start a call
  const initiateCall = useCallback(
    async (receiverId: string, type: "audio" | "video") => {
      if (!user?.id) return;

      setIsConnecting(true);

      try {
        const pc = await initializePeerConnection(type);
        
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const callId = await startCall(user.id, receiverId, type, offer);
        
        setCurrentCall({
          id: callId,
          callerId: user.id,
          receiverId,
          type,
          offer,
          status: "ringing",
          timestamp: Date.now(),
        });

        // Listen for answer
        const unsubscribe = listenToCallUpdates(callId, async (call) => {
          if (call?.answer && pc.signalingState !== "stable") {
            await pc.setRemoteDescription(new RTCSessionDescription(call.answer));
          }
          
          if (call?.status === "accepted") {
            setIsConnecting(false);
            startDurationTimer();
          }
        });

        // Listen for ICE candidates from receiver
        listenToIceCandidates(callId, receiverId, async (candidate) => {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        });

      } catch (error) {
        console.error("Failed to start call:", error);
        setIsConnecting(false);
        cleanup();
      }
    },
    [user?.id, initializePeerConnection]
  );

  // Accept incoming call
  const answerCall = useCallback(async () => {
    if (!incomingCall?.id || !user?.id) return;

    setIsConnecting(true);

    try {
      const pc = await initializePeerConnection(incomingCall.type);

      // Set remote description (offer)
      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      }

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await acceptCall(incomingCall.id, answer);

      setCurrentCall(incomingCall);
      setIncomingCall(null);
      setIsConnecting(false);
      startDurationTimer();

      // Listen for ICE candidates from caller
      listenToIceCandidates(incomingCall.id, incomingCall.callerId, async (candidate) => {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      });

    } catch (error) {
      console.error("Failed to answer call:", error);
      setIsConnecting(false);
      cleanup();
    }
  }, [incomingCall, user?.id, initializePeerConnection]);

  // Reject incoming call
  const declineCall = useCallback(async () => {
    if (!incomingCall?.id) return;

    await rejectCall(incomingCall.id);
    setIncomingCall(null);
  }, [incomingCall?.id]);

  // End current call
  const hangUp = useCallback(async () => {
    if (!currentCall?.id) return;

    const duration = callStartTimeRef.current
      ? Math.floor((Date.now() - callStartTimeRef.current) / 1000)
      : 0;

    await endCall(currentCall.id, duration);
    cleanup();
  }, [currentCall?.id]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, [localStream]);

  // Start duration timer
  const startDurationTimer = () => {
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);
  };

  // Cleanup
  const cleanup = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCurrentCall(null);
    setCallDuration(0);
    setIsConnecting(false);
    callStartTimeRef.current = null;
    peerConnectionRef.current = null;
  };

  return {
    localStream,
    remoteStream,
    currentCall,
    incomingCall,
    callDuration,
    isConnecting,
    initiateCall,
    answerCall,
    declineCall,
    hangUp,
    toggleAudio,
    toggleVideo,
  };
};
