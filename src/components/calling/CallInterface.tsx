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

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);

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

  const getStatusText = () => {
    if (isConnecting) return "Connecting...";
    if (currentCall?.status === "ringing") return "Ringing...";
    if (connectionState === "connecting") return "Connecting...";
    if (connectionState === "connected" || callDuration > 0) return formatDuration(callDuration);
    return "Waiting...";
  };

  // Hidden audio element for audio playback
  const AudioElement = () => (
    <audio
      ref={remoteAudioRef}
      autoPlay
      playsInline
      className="hidden"
    />
  );

  // Incoming call modal
  if (incomingCall && !currentCall) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <AudioElement />
        <div className="bg-card rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-fade-in">
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
    );
  }

  // Active call interface
  if (currentCall) {
    const isVideoCall = currentCall.type === "video";

    return (
      <div className="fixed inset-0 z-50 bg-background">
        <AudioElement />
        
        {isVideoCall ? (
          // Video call UI
          <div className="relative h-full">
            {/* Remote video (full screen) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-black"
            />

            {/* No video placeholder */}
            {(!remoteStream || remoteStream.getVideoTracks().length === 0) && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-primary/20 to-background">
                <Avatar className="w-32 h-32 ring-4 ring-primary/30">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-4xl">
                    {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Local video (picture-in-picture) */}
            <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden shadow-lg bg-black">
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

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
              <div className="text-center text-white mb-6">
                <h3 className="font-semibold">
                  {profile?.display_name || profile?.username || "Call"}
                </h3>
                <p className="text-sm opacity-80">{getStatusText()}</p>
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant={isMuted ? "destructive" : "secondary"}
                  size="lg"
                  className="h-14 w-14 rounded-full"
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
                  className="h-14 w-14 rounded-full"
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
                  className="h-14 w-14 rounded-full"
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
                  className="h-14 w-14 rounded-full"
                  onClick={hangUp}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Audio call UI
          <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-primary/20 to-background">
            <Avatar className="w-32 h-32 mb-6 ring-4 ring-primary/30">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-4xl">
                {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-2xl font-bold mb-2">
              {profile?.display_name || profile?.username || "Call"}
            </h2>
            <p className="text-muted-foreground mb-12">{getStatusText()}</p>

            <div className="flex gap-6">
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="lg"
                className="h-16 w-16 rounded-full"
                onClick={handleToggleAudio}
              >
                {isMuted ? (
                  <MicOff className="h-7 w-7" />
                ) : (
                  <Mic className="h-7 w-7" />
                )}
              </Button>

              <Button
                variant={isSpeakerOff ? "destructive" : "secondary"}
                size="lg"
                className="h-16 w-16 rounded-full"
                onClick={handleToggleSpeaker}
              >
                {isSpeakerOff ? (
                  <VolumeX className="h-7 w-7" />
                ) : (
                  <Volume2 className="h-7 w-7" />
                )}
              </Button>

              <Button
                variant="destructive"
                size="lg"
                className="h-16 w-16 rounded-full"
                onClick={hangUp}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
