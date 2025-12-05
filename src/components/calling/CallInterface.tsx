import React, { useEffect, useRef } from "react";
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
    initiateCall,
    answerCall,
    declineCall,
    hangUp,
    toggleAudio,
    toggleVideo,
  } = useWebRTC();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isMuted, setIsMuted] = React.useState(false);
  const [isVideoOff, setIsVideoOff] = React.useState(false);

  // Set up video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleAudio = () => {
    toggleAudio();
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoOff(!isVideoOff);
  };

  // Incoming call modal
  if (incomingCall && !currentCall) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <div className="bg-card rounded-3xl p-8 shadow-2xl max-w-sm w-full mx-4 animate-bounce-in">
          <div className="text-center">
            <div className="relative mx-auto w-24 h-24 mb-6">
              <Avatar className="w-full h-full ring-4 ring-primary/50 animate-pulse">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-2xl">
                  {profile?.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 p-2 bg-primary rounded-full">
                {incomingCall.type === "video" ? (
                  <Video className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <Phone className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
            </div>

            <h2 className="text-xl font-bold mb-1">
              {profile?.display_name || "Someone"}
            </h2>
            <p className="text-muted-foreground mb-8">
              Incoming {incomingCall.type} call...
            </p>

            <div className="flex justify-center gap-6">
              <Button
                variant="destructive"
                size="lg"
                className="h-14 w-14 rounded-full"
                onClick={declineCall}
              >
                <X className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                className="h-14 w-14 rounded-full bg-green-500 hover:bg-green-600"
                onClick={answerCall}
              >
                <Phone className="h-6 w-6" />
              </Button>
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
        {isVideoCall ? (
          // Video call UI
          <div className="relative h-full">
            {/* Remote video (full screen) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local video (picture-in-picture) */}
            <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            {/* Controls overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
              <div className="text-center text-white mb-6">
                <h3 className="font-semibold">
                  {profile?.display_name || "Call"}
                </h3>
                <p className="text-sm opacity-80">
                  {isConnecting
                    ? "Connecting..."
                    : currentCall.status === "ringing"
                    ? "Ringing..."
                    : formatDuration(callDuration)}
                </p>
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
                {profile?.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>

            <h2 className="text-2xl font-bold mb-2">
              {profile?.display_name || "Call"}
            </h2>
            <p className="text-muted-foreground mb-12">
              {isConnecting
                ? "Connecting..."
                : currentCall.status === "ringing"
                ? "Ringing..."
                : formatDuration(callDuration)}
            </p>

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
