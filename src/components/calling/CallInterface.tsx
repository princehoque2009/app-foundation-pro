import React, { useEffect, useRef, useState } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  X,
  Volume2,
  VolumeX,
  PhoneCall,
  PhoneMissed,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CallInterfaceProps {
  profile?: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

type CallStatus = "idle" | "calling" | "ringing" | "connecting" | "connected" | "ended" | "failed" | "busy" | "offline";

export const CallInterface = ({ profile }: CallInterfaceProps) => {
  const {
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
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");

  // Determine call status based on currentCall and connectionState
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
      setCallStatus("ringing");
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
  }, [currentCall, connectionState, isConnecting]);

  // Play ringtone for incoming calls
  useEffect(() => {
    if (incomingCall && !currentCall) {
      // Play ringtone (using Web Audio API for cross-browser support)
      const playRingtone = () => {
        if (ringtoneRef.current) {
          ringtoneRef.current.loop = true;
          ringtoneRef.current.play().catch(console.error);
        }
      };
      playRingtone();
      
      return () => {
        if (ringtoneRef.current) {
          ringtoneRef.current.pause();
          ringtoneRef.current.currentTime = 0;
        }
      };
    }
  }, [incomingCall, currentCall]);

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log("[CallInterface] Setting local video stream");
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(err => {
        console.error("[CallInterface] Error playing local video:", err);
      });
    }
  }, [localStream]);

  // Set up remote video/audio stream
  useEffect(() => {
    if (remoteStream) {
      console.log("[CallInterface] Setting remote stream, tracks:", 
        remoteStream.getTracks().map(t => `${t.kind}: ${t.enabled}`)
      );
      
      // For video calls, use video element
      if (remoteVideoRef.current && currentCall?.type === "video") {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(err => {
          console.error("[CallInterface] Error playing remote video:", err);
        });
      }
      
      // For audio calls or as backup, use audio element
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(err => {
          console.error("[CallInterface] Error playing remote audio:", err);
        });
      }
    }
  }, [remoteStream, currentCall?.type]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleAudio = () => {
    const enabled = toggleAudio();
    setIsMuted(!enabled);
  };

  const handleToggleVideo = () => {
    const enabled = toggleVideo();
    setIsVideoOff(!enabled);
  };

  const handleToggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsSpeakerOff(remoteAudioRef.current.muted);
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
    }
  };

  const getStatusDisplay = () => {
    switch (callStatus) {
      case "calling":
        return { text: "Calling...", color: "text-yellow-500", icon: PhoneCall, animate: true };
      case "ringing":
        return { text: "Ringing...", color: "text-blue-500", icon: Phone, animate: true };
      case "connecting":
        return { text: "Connecting...", color: "text-yellow-500", icon: PhoneCall, animate: true };
      case "connected":
        return { text: formatDuration(callDuration), color: "text-green-500", icon: Phone, animate: false };
      case "ended":
        return { text: "Call Ended", color: "text-muted-foreground", icon: PhoneOff, animate: false };
      case "failed":
        return { text: "Connection Failed", color: "text-destructive", icon: PhoneMissed, animate: false };
      case "busy":
        return { text: "User is Busy", color: "text-orange-500", icon: PhoneMissed, animate: false };
      case "offline":
        return { text: "User Offline", color: "text-muted-foreground", icon: PhoneMissed, animate: false };
      default:
        return { text: "", color: "", icon: Phone, animate: false };
    }
  };

  // Hidden audio element for audio playback
  const AudioElement = () => (
    <>
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="hidden"
      />
      {/* Ringtone for incoming calls - using a simple oscillator would be better but this is placeholder */}
      <audio
        ref={ringtoneRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1oa2d4i4+Ej3RnZHR9jJORhHJnaG98j5eSf21obnqLkpCCdG5vfYuRjn92cXN/iY+LfHdydoCIjIt9eHR2gIiLiHx4dHaAiIuIfHh0doCIi4h8eHR2gIiLiHx4dHaAiIuIfHh0doCIi4h8eHR2gIiLiHx4dHaAiIuIfHh0doCIi4h8eHR2gIiLiHx4dHaAiIuIfHh0doCIi4h8"
        className="hidden"
      />
    </>
  );

  // Incoming call modal - fullscreen with safe areas
  if (incomingCall && !currentCall) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}>
        <AudioElement />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-card rounded-3xl p-8 shadow-2xl max-w-sm w-full animate-fade-in">
            <div className="text-center">
              <div className="relative mx-auto w-28 h-28 mb-6">
                {/* Pulse rings */}
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
                <Avatar className="w-full h-full ring-4 ring-primary/50 relative z-10 animate-pulse-scale">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 p-2.5 bg-primary rounded-full z-20 animate-ring">
                  {incomingCall.type === "video" ? (
                    <Video className="h-5 w-5 text-primary-foreground" />
                  ) : (
                    <Phone className="h-5 w-5 text-primary-foreground" />
                  )}
                </div>
              </div>

              <h2 className="text-xl font-bold mb-1">
                {profile?.display_name || profile?.username || "Incoming Call"}
              </h2>
              <p className="text-muted-foreground mb-8 animate-pulse">
                Incoming {incomingCall.type} call...
              </p>

              <div className="flex justify-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="h-16 w-16 rounded-full press-effect shadow-lg shadow-destructive/30"
                    onClick={declineCall}
                  >
                    <X className="h-7 w-7" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Decline</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    size="lg"
                    className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 press-effect shadow-lg shadow-green-500/30"
                    onClick={answerCall}
                  >
                    <Phone className="h-7 w-7" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Answer</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active call interface - fullscreen with proper safe areas
  if (currentCall) {
    const isVideoCall = currentCall.type === "video";
    const statusDisplay = getStatusDisplay();
    const StatusIcon = statusDisplay.icon;

    return (
      <div 
        className="fixed inset-0 z-[100] bg-background flex flex-col"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)', 
          paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        <AudioElement />
        
        {isVideoCall ? (
          // Video call UI - fullscreen layout
          <div className="relative flex-1 flex flex-col">
            {/* Remote video (main view) */}
            <div className="flex-1 relative bg-black">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* No video placeholder */}
              {(!remoteStream || remoteStream.getVideoTracks().length === 0 || callStatus !== "connected") && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-primary/20 to-background">
                  <Avatar className="w-32 h-32 mb-4 ring-4 ring-primary/30">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="text-4xl">
                      {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-semibold mb-2">
                    {profile?.display_name || profile?.username}
                  </h2>
                  <div className={cn("flex items-center gap-2", statusDisplay.color)}>
                    <StatusIcon className={cn("h-5 w-5", statusDisplay.animate && "animate-pulse")} />
                    <span className="text-lg">{statusDisplay.text}</span>
                  </div>
                </div>
              )}

              {/* Local video (picture-in-picture) - positioned with safe area */}
              <div 
                className="absolute w-28 h-40 rounded-2xl overflow-hidden shadow-lg bg-black border-2 border-background"
                style={{ top: 'max(env(safe-area-inset-top), 16px)', right: '16px' }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover",
                    isVideoOff && "hidden"
                  )}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <VideoOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Call status overlay at top - only when connected */}
              {callStatus === "connected" && (
                <div className="absolute left-4 z-10" style={{ top: 'max(env(safe-area-inset-top), 16px)' }}>
                  <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 inline-flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-white text-sm font-medium">
                      {profile?.display_name || profile?.username}
                    </span>
                    <span className="text-white/80 text-sm">
                      {formatDuration(callDuration)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls - fixed at bottom with safe padding */}
            <div className="bg-background/95 backdrop-blur-sm border-t border-border px-6 py-6">
              <div className="flex justify-center gap-4 max-w-md mx-auto">
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="lg"
                  className="h-14 w-14 rounded-full press-effect"
                  onClick={handleToggleAudio}
                >
                  {isMuted ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  variant={isVideoOff ? "destructive" : "secondary"}
                  size="lg"
                  className="h-14 w-14 rounded-full press-effect"
                  onClick={handleToggleVideo}
                >
                  {isVideoOff ? (
                    <VideoOff className="h-6 w-6" />
                  ) : (
                    <Video className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  variant={isSpeakerOff ? "destructive" : "secondary"}
                  size="lg"
                  className="h-14 w-14 rounded-full press-effect"
                  onClick={handleToggleSpeaker}
                >
                  {isSpeakerOff ? (
                    <VolumeX className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </Button>

                <Button
                  variant="destructive"
                  size="lg"
                  className="h-14 w-14 rounded-full press-effect"
                  onClick={hangUp}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Audio call UI - centered layout with bottom controls
          <div className="flex-1 flex flex-col">
            {/* Main content area */}
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background px-6">
              {/* Status indicator badge */}
              <div className="mb-8">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                  callStatus === "connected" ? "bg-green-500/20" : 
                  callStatus === "failed" || callStatus === "busy" ? "bg-destructive/20" :
                  "bg-yellow-500/20"
                )}>
                  <StatusIcon className={cn(
                    "h-4 w-4",
                    statusDisplay.color,
                    statusDisplay.animate && "animate-pulse"
                  )} />
                  <span className={cn("text-sm font-medium", statusDisplay.color)}>
                    {statusDisplay.text}
                  </span>
                </div>
              </div>

              {/* Profile avatar with animation based on status */}
              <div className="relative mb-6">
                {callStatus === "ringing" && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping scale-110" />
                    <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse scale-105" />
                  </>
                )}
                <Avatar className="w-32 h-32 ring-4 ring-primary/30 relative z-10">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-4xl">
                    {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {profile?.display_name || profile?.username || "Call"}
              </h2>
              
              {/* Call type indicator */}
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">Voice Call</span>
              </div>
            </div>

            {/* Controls - fixed at bottom with safe padding */}
            <div className="bg-background/95 backdrop-blur-sm border-t border-border px-6 py-6">
              <div className="flex justify-center gap-6 max-w-md mx-auto">
                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="lg"
                    className="h-16 w-16 rounded-full press-effect"
                    onClick={handleToggleAudio}
                  >
                    {isMuted ? (
                      <MicOff className="h-7 w-7" />
                    ) : (
                      <Mic className="h-7 w-7" />
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {isMuted ? "Unmute" : "Mute"}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant={isSpeakerOff ? "destructive" : "secondary"}
                    size="lg"
                    className="h-16 w-16 rounded-full press-effect"
                    onClick={handleToggleSpeaker}
                  >
                    {isSpeakerOff ? (
                      <VolumeX className="h-7 w-7" />
                    ) : (
                      <Volume2 className="h-7 w-7" />
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {isSpeakerOff ? "Speaker Off" : "Speaker"}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <Button
                    variant="destructive"
                    size="lg"
                    className="h-16 w-16 rounded-full press-effect"
                    onClick={hangUp}
                  >
                    <PhoneOff className="h-7 w-7" />
                  </Button>
                  <span className="text-xs text-muted-foreground">End</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
