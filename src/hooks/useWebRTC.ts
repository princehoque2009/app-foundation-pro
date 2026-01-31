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
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callIdRef = useRef<string | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = listenForIncomingCalls(user.id, (call) => {
      // Only set incoming call if we don't have an active call
      if (!currentCall) {
        setIncomingCall(call);
      }
    });
    return unsubscribe;
  }, [user?.id, currentCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Initialize peer connection with proper track handling
  const initializePeerConnection = useCallback(async (type: "audio" | "video", callId: string) => {
    console.log("[WebRTC] Initializing peer connection for", type, "call");
    
    // Get media stream FIRST
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: type === "video" ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      } : false,
    };

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("[WebRTC] Got local stream with tracks:", stream.getTracks().map(t => `${t.kind}: ${t.label}`));
    } catch (err) {
      console.error("[WebRTC] Failed to get user media:", err);
      throw new Error("Could not access camera/microphone. Please check permissions.");
    }

    setLocalStream(stream);
    localStreamRef.current = stream;

    // Create peer connection with ICE servers
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionRef.current = pc;
    callIdRef.current = callId;

    // Add ALL local tracks to peer connection
    stream.getTracks().forEach((track) => {
      console.log("[WebRTC] Adding track to peer connection:", track.kind, track.label);
      pc.addTrack(track, stream);
    });

    // Create remote stream and handle incoming tracks
    const remoteMediaStream = new MediaStream();
    setRemoteStream(remoteMediaStream);

    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote track:", event.track.kind, event.track.label);
      
      // Add track to remote stream
      remoteMediaStream.addTrack(event.track);
      
      // Force state update
      setRemoteStream(new MediaStream(remoteMediaStream.getTracks()));
      
      event.track.onended = () => {
        console.log("[WebRTC] Remote track ended:", event.track.kind);
      };
      
      event.track.onmute = () => {
        console.log("[WebRTC] Remote track muted:", event.track.kind);
      };
      
      event.track.onunmute = () => {
        console.log("[WebRTC] Remote track unmuted:", event.track.kind);
      };
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate && callIdRef.current && user?.id) {
        console.log("[WebRTC] Sending ICE candidate");
        await sendIceCandidate(callIdRef.current, user.id, event.candidate);
      }
    };

    // Monitor ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log("[WebRTC] ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") {
        console.error("[WebRTC] ICE connection failed, attempting restart");
        pc.restartIce();
      }
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        setIsConnecting(false);
        if (!callStartTimeRef.current) {
          startDurationTimer();
        }
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      console.log("[WebRTC] Connection state:", pc.connectionState);
      setConnectionState(pc.connectionState);
      
      if (pc.connectionState === "connected") {
        setIsConnecting(false);
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        console.error("[WebRTC] Connection failed/disconnected");
      }
    };

    // Monitor signaling state
    pc.onsignalingstatechange = () => {
      console.log("[WebRTC] Signaling state:", pc.signalingState);
    };

    // Monitor ICE gathering state
    pc.onicegatheringstatechange = () => {
      console.log("[WebRTC] ICE gathering state:", pc.iceGatheringState);
    };

    return pc;
  }, [user?.id]);

  // Add pending ICE candidates when remote description is set
  const processPendingCandidates = useCallback(async (pc: RTCPeerConnection) => {
    if (pendingCandidatesRef.current.length > 0 && pc.remoteDescription) {
      console.log("[WebRTC] Processing", pendingCandidatesRef.current.length, "pending ICE candidates");
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("[WebRTC] Error adding pending candidate:", err);
        }
      }
      pendingCandidatesRef.current = [];
    }
  }, []);

  // Start a call
  const initiateCall = useCallback(
    async (receiverId: string, type: "audio" | "video") => {
      if (!user?.id) return;

      setIsConnecting(true);
      pendingCandidatesRef.current = [];

      try {
        // Generate call ID first
        const tempCallId = `call_${Date.now()}_${user.id}`;
        
        const pc = await initializePeerConnection(type, tempCallId);
        
        // Create offer with proper constraints
        const offerOptions: RTCOfferOptions = {
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
        };
        
        const offer = await pc.createOffer(offerOptions);
        console.log("[WebRTC] Created offer:", offer.type);
        
        await pc.setLocalDescription(offer);
        console.log("[WebRTC] Set local description");

        const callId = await startCall(user.id, receiverId, type, offer);
        callIdRef.current = callId;
        
        // Immediately set currentCall so UI shows for caller
        const newCall: Call = {
          id: callId,
          callerId: user.id,
          receiverId,
          type,
          offer,
          status: "ringing",
          timestamp: Date.now(),
        };
        
        setCurrentCall(newCall);
        console.log("[WebRTC] Call initiated, waiting for answer...");

        // Listen for call status updates (answer, rejected, ended)
        const unsubscribeCall = listenToCallUpdates(callId, async (call) => {
          if (!call) {
            console.log("[WebRTC] Call no longer exists");
            cleanup();
            return;
          }
          
          // Update currentCall with latest status
          setCurrentCall(prev => prev ? { ...prev, status: call.status } : null);
          
          if (call.answer && pc.signalingState === "have-local-offer") {
            console.log("[WebRTC] Received answer, setting remote description");
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(call.answer));
              await processPendingCandidates(pc);
              // Update status to accepted
              setCurrentCall(prev => prev ? { ...prev, status: "accepted" } : null);
            } catch (err) {
              console.error("[WebRTC] Error setting remote description:", err);
            }
          }
          
          if (call.status === "rejected") {
            console.log("[WebRTC] Call was rejected");
            cleanup();
          } else if (call.status === "ended") {
            console.log("[WebRTC] Call ended by other party");
            cleanup();
          } else if (call.status === "busy") {
            console.log("[WebRTC] User is busy");
            cleanup();
          }
        });

        // Listen for ICE candidates from receiver
        const unsubscribeCandidates = listenToIceCandidates(callId, receiverId, async (candidate) => {
          if (pc.remoteDescription) {
            console.log("[WebRTC] Adding remote ICE candidate");
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
              console.error("[WebRTC] Error adding ICE candidate:", err);
            }
          } else {
            console.log("[WebRTC] Queuing ICE candidate (no remote description yet)");
            pendingCandidatesRef.current.push(candidate);
          }
        });

      } catch (error) {
        console.error("[WebRTC] Failed to start call:", error);
        setIsConnecting(false);
        cleanup();
        throw error;
      }
    },
    [user?.id, initializePeerConnection, processPendingCandidates]
  );

  // Accept incoming call
  const answerCall = useCallback(async () => {
    if (!incomingCall?.id || !user?.id) return;

    setIsConnecting(true);
    pendingCandidatesRef.current = [];

    try {
      const pc = await initializePeerConnection(incomingCall.type, incomingCall.id);

      // Set remote description (offer)
      if (incomingCall.offer) {
        console.log("[WebRTC] Setting remote description (offer)");
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        await processPendingCandidates(pc);
      }

      // Create answer
      const answerOptions: RTCAnswerOptions = {};
      const answer = await pc.createAnswer(answerOptions);
      console.log("[WebRTC] Created answer");
      
      await pc.setLocalDescription(answer);
      console.log("[WebRTC] Set local description (answer)");

      await acceptCall(incomingCall.id, answer);

      setCurrentCall({ ...incomingCall, status: "accepted" });
      setIncomingCall(null);

      // Listen for ICE candidates from caller
      listenToIceCandidates(incomingCall.id, incomingCall.callerId, async (candidate) => {
        if (pc.remoteDescription) {
          console.log("[WebRTC] Adding remote ICE candidate from caller");
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("[WebRTC] Error adding ICE candidate:", err);
          }
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      });

    } catch (error) {
      console.error("[WebRTC] Failed to answer call:", error);
      setIsConnecting(false);
      cleanup();
    }
  }, [incomingCall, user?.id, initializePeerConnection, processPendingCandidates]);

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
    const stream = localStreamRef.current || localStream;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        console.log("[WebRTC] Audio track enabled:", audioTrack.enabled);
        return audioTrack.enabled;
      }
    }
    return true;
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current || localStream;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        console.log("[WebRTC] Video track enabled:", videoTrack.enabled);
        return videoTrack.enabled;
      }
    }
    return true;
  }, [localStream]);

  // Start duration timer
  const startDurationTimer = () => {
    if (callStartTimeRef.current) return; // Already started
    
    callStartTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        setCallDuration(Math.floor((Date.now() - callStartTimeRef.current) / 1000));
      }
    }, 1000);
  };

  // Cleanup
  const cleanup = useCallback(() => {
    console.log("[WebRTC] Cleaning up...");
    
    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("[WebRTC] Stopped local track:", track.kind);
      });
    }
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    // Clear interval
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Reset all state
    setLocalStream(null);
    setRemoteStream(null);
    setCurrentCall(null);
    setCallDuration(0);
    setIsConnecting(false);
    setConnectionState(null);
    callStartTimeRef.current = null;
    peerConnectionRef.current = null;
    localStreamRef.current = null;
    callIdRef.current = null;
    pendingCandidatesRef.current = [];
  }, [localStream]);

  return {
    localStream,
    remoteStream,
    currentCall,
    incomingCall,
    callDuration,
    isConnecting,
    connectionState,
    initiateCall,
    answerCall,
    declineCall,
    hangUp,
    toggleAudio,
    toggleVideo,
  };
};
