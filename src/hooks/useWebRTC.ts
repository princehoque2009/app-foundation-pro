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

export type CallStatus = "idle" | "calling" | "ringing" | "connecting" | "connected" | "ended" | "failed" | "busy" | "offline";

export const useWebRTC = () => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const callIdRef = useRef<string | null>(null);
  const unsubscribeCallRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);

  // Update call status based on currentCall and connectionState
  useEffect(() => {
    if (!currentCall) {
      setCallStatus("idle");
      return;
    }

    if (currentCall.status === "busy") {
      setCallStatus("busy");
    } else if (currentCall.status === "rejected") {
      setCallStatus("ended");
    } else if (currentCall.status === "ended") {
      setCallStatus("ended");
    } else if (currentCall.status === "ringing") {
      // For caller, show "Calling..." not "Ringing..."
      const isCaller = currentCall.callerId === user?.id;
      setCallStatus(isCaller ? "calling" : "ringing");
    } else if (currentCall.status === "accepted") {
      if (connectionState === "connected") {
        setCallStatus("connected");
      } else if (connectionState === "connecting" || isConnecting) {
        setCallStatus("connecting");
      } else if (connectionState === "failed" || connectionState === "disconnected") {
        setCallStatus("failed");
      } else {
        setCallStatus("connecting");
      }
    } else if (isConnecting) {
      setCallStatus("calling");
    } else {
      setCallStatus("calling");
    }
  }, [currentCall, connectionState, isConnecting, user?.id]);

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

  // Start a call - CALLER SIDE
  const initiateCall = useCallback(
    async (receiverId: string, type: "audio" | "video") => {
      if (!user?.id) return;

      setIsConnecting(true);
      pendingCandidatesRef.current = [];

      // FORCE UI to appear instantly with a provisional call object
      const provisionalId = `call_${Date.now()}_${user.id}`;
      setCurrentCall({
        id: provisionalId,
        callerId: user.id,
        receiverId,
        type,
        status: "ringing",
        timestamp: Date.now(),
      });
      setCallStatus("calling");

      try {
        const tempCallId = provisionalId;
        
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
        
        // IMMEDIATELY set currentCall so UI shows for caller
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
        setCallStatus("calling"); // Caller sees "Calling..."
        console.log("[WebRTC] Call initiated, caller UI should now be visible");

        // Listen for call status updates (answer, rejected, ended)
        unsubscribeCallRef.current = listenToCallUpdates(callId, async (call) => {
          if (!call) {
            console.log("[WebRTC] Call no longer exists");
            cleanup();
            return;
          }
          
          console.log("[WebRTC] Call update received:", call.status);
          
          // Update currentCall with latest status
          setCurrentCall(prev => prev ? { ...prev, status: call.status, answer: call.answer } : null);
          
          if (call.answer && pc.signalingState === "have-local-offer") {
            console.log("[WebRTC] Received answer, setting remote description");
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(call.answer));
              await processPendingCandidates(pc);
            } catch (err) {
              console.error("[WebRTC] Error setting remote description:", err);
            }
          }
          
          if (call.status === "rejected") {
            console.log("[WebRTC] Call was rejected");
            setCallStatus("ended");
            setTimeout(() => cleanup(), 2000);
          } else if (call.status === "ended") {
            console.log("[WebRTC] Call ended by other party");
            setCallStatus("ended");
            setTimeout(() => cleanup(), 1000);
          } else if (call.status === "busy") {
            console.log("[WebRTC] User is busy");
            setCallStatus("busy");
            setTimeout(() => cleanup(), 2000);
          }
        });

        // Listen for ICE candidates from receiver
        unsubscribeCandidatesRef.current = listenToIceCandidates(callId, receiverId, async (candidate) => {
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
        setCallStatus("failed");
        setTimeout(() => cleanup(), 2000);
        throw error;
      }
    },
    [user?.id, initializePeerConnection, processPendingCandidates]
  );

  // Accept incoming call - RECEIVER SIDE
  const answerCall = useCallback(async () => {
    if (!incomingCall?.id || !user?.id) return;

    setIsConnecting(true);
    pendingCandidatesRef.current = [];

    try {
      // Request media permissions and initialize peer connection
      const pc = await initializePeerConnection(incomingCall.type, incomingCall.id);

      // Set remote description (offer) from caller
      if (incomingCall.offer) {
        console.log("[WebRTC] Setting remote description (offer)");
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        await processPendingCandidates(pc);
      }

      // Create answer
      const answer = await pc.createAnswer();
      console.log("[WebRTC] Created answer");
      
      await pc.setLocalDescription(answer);
      console.log("[WebRTC] Set local description (answer)");

      // Send answer to Firebase
      await acceptCall(incomingCall.id, answer);

      // Set current call and clear incoming call
      setCurrentCall({ ...incomingCall, status: "accepted" });
      setIncomingCall(null);
      setCallStatus("connecting");

      // Listen for call updates
      unsubscribeCallRef.current = listenToCallUpdates(incomingCall.id, async (call) => {
        if (!call) {
          console.log("[WebRTC] Call no longer exists");
          cleanup();
          return;
        }
        
        setCurrentCall(prev => prev ? { ...prev, status: call.status } : null);
        
        if (call.status === "ended") {
          console.log("[WebRTC] Call ended by caller");
          setCallStatus("ended");
          setTimeout(() => cleanup(), 1000);
        }
      });

      // Listen for ICE candidates from caller
      unsubscribeCandidatesRef.current = listenToIceCandidates(incomingCall.id, incomingCall.callerId, async (candidate) => {
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
      setCallStatus("failed");
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
    setCallStatus("ended");
    setTimeout(() => cleanup(), 1000);
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

  // Switch front/back camera (mobile)
  const switchCamera = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const stream = localStreamRef.current;
    if (!pc || !stream) return;
    const currentVideo = stream.getVideoTracks()[0];
    if (!currentVideo) return;
    const currentFacing = (currentVideo.getSettings().facingMode as string) || "user";
    const newFacing = currentFacing === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: newFacing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
      stream.removeTrack(currentVideo);
      currentVideo.stop();
      stream.addTrack(newTrack);
      setLocalStream(new MediaStream(stream.getTracks()));
    } catch (err) {
      console.error("[WebRTC] switchCamera failed", err);
    }
  }, []);

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
    
    // Unsubscribe from listeners
    if (unsubscribeCallRef.current) {
      unsubscribeCallRef.current();
      unsubscribeCallRef.current = null;
    }
    if (unsubscribeCandidatesRef.current) {
      unsubscribeCandidatesRef.current();
      unsubscribeCandidatesRef.current = null;
    }
    
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
    setCallStatus("idle");
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
    callStatus,
    initiateCall,
    answerCall,
    declineCall,
    hangUp,
    toggleAudio,
    toggleVideo,
    switchCamera,
  };
};
