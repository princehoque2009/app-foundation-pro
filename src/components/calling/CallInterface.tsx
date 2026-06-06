import React, { useEffect, useRef, useState, useCallback } from "react";
import type { CallStatus } from "@/hooks/useWebRTC";
import { useCall } from "@/contexts/CallContext";
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
  Image,
  Paperclip,
  Send,
  SwitchCamera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CallInterfaceProps {
  profile?: {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface SharedMedia {
  id: string;
  url: string;
  type: "image" | "video" | "document";
  name: string;
  timestamp: number;
}

export const CallInterface = ({ profile }: CallInterfaceProps) => {
  const {
    localStream,
    remoteStream,
    currentCall,
    incomingCall,
    callDuration,
    callStatus,
    answerCall,
    declineCall,
    hangUp,
    toggleAudio,
    toggleVideo,
    switchCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [sharedMedia, setSharedMedia] = useState<SharedMedia[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [showMediaPanel, setShowMediaPanel] = useState(false);

  // Play ringtone for incoming calls
  useEffect(() => {
    if (incomingCall && !currentCall) {
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

  // Set up local video stream — reattach whenever stream or tracks change
  useEffect(() => {
    const vEl = localVideoRef.current;
    if (!vEl || !localStream) return;
    if (vEl.srcObject !== localStream) {
      vEl.srcObject = localStream;
    }
    vEl.muted = true;
    vEl.playsInline = true;
    vEl.autoplay = true;
    const tryPlay = () => vEl.play().catch((e) => console.warn("[CallInterface] local play failed", e));
    tryPlay();
    vEl.onloadedmetadata = tryPlay;
    // Also reattach when tracks change (e.g. switchCamera replaces track)
    const tracks = localStream.getVideoTracks();
    const handlers: Array<() => void> = [];
    tracks.forEach((t) => {
      const onEnd = () => tryPlay();
      t.addEventListener("ended", onEnd);
      handlers.push(() => t.removeEventListener("ended", onEnd));
    });
    return () => {
      handlers.forEach((h) => h());
    };
  }, [localStream, currentCall?.type, callStatus, isVideoOff]);

  // Set up remote video/audio stream — re-attach on every change
  useEffect(() => {
    if (!remoteStream) return;
    console.log(
      "[CallInterface] Attaching remote stream, tracks:",
      remoteStream.getTracks().map((t) => `${t.kind}:${t.enabled}`)
    );

    const vEl = remoteVideoRef.current;
    if (vEl && currentCall?.type === "video") {
      if (vEl.srcObject !== remoteStream) vEl.srcObject = remoteStream;
      vEl.muted = false;
      vEl.playsInline = true;
      vEl.autoplay = true;
      const p = vEl.play();
      if (p && typeof p.catch === "function") p.catch((e) => console.warn("[CallInterface] remote video play failed", e));
    }

    const aEl = remoteAudioRef.current;
    if (aEl && currentCall?.type !== "video") {
      if (aEl.srcObject !== remoteStream) aEl.srcObject = remoteStream;
      aEl.play().catch((e) => console.warn("[CallInterface] remote audio play failed", e));
    }
  }, [remoteStream, currentCall?.type, callStatus]);



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

  // Handle media sharing during call
  const handleMediaUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentCall) return;

    setIsUploadingMedia(true);
    
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `call-media/${currentCall.id}/${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('post-media')
          .upload(fileName, file);
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('post-media')
          .getPublicUrl(data.path);
        
        const mediaType = file.type.startsWith('image/') ? 'image' : 
                         file.type.startsWith('video/') ? 'video' : 'document';
        
        const newMedia: SharedMedia = {
          id: Date.now().toString(),
          url: publicUrl,
          type: mediaType,
          name: file.name,
          timestamp: Date.now(),
        };
        
        setSharedMedia(prev => [...prev, newMedia]);
        toast.success(`Shared ${file.name}`);
      }
    } catch (error) {
      console.error("[CallInterface] Error uploading media:", error);
      toast.error("Failed to share media");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [currentCall]);

  const getStatusDisplay = (status: CallStatus) => {
    switch (status) {
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
      <audio
        ref={ringtoneRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1oa2d4i4+Ej3RnZHR9jJORhHJnaG98j5eSf21obnqLkpCCdG5vfYuRjn92cXN/iY+LfHdydoCIjIt9eHR2gIiLiHx4dHaAiIuIfHh0doCIi4h8eHR2gIiLiHx4dHaAiIuIfHh0doCIi4h8eHR2gIiLiHx4dHaAiIuIfHh0doCIi4h8eHR2gIiLiHx4dHaAiIuIfHh0doCIi4h8"
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,.pdf,.doc,.docx"
        multiple
        className="hidden"
        onChange={handleMediaUpload}
      />
    </>
  );

  // Media panel component
  const MediaPanel = () => (
    <div className="absolute bottom-24 left-4 right-4 bg-card/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-border max-h-48 overflow-y-auto z-20">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Shared Media</h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMediaPanel(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {sharedMedia.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No media shared yet
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {sharedMedia.map((media) => (
            <a
              key={media.id}
              href={media.url}
              target="_blank"
              rel="noopener noreferrer"
              className="aspect-square rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
            >
              {media.type === "image" ? (
                <img src={media.url} alt={media.name} className="w-full h-full object-cover" />
              ) : media.type === "video" ? (
                <video src={media.url} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Paperclip className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
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
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-primary/30 animate-pulse" />
                <Avatar className="w-full h-full ring-4 ring-primary/50 relative z-10">
                  <AvatarImage src={profile?.avatar_url || ""} />
                  <AvatarFallback className="text-2xl bg-primary/10">
                    {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 p-2.5 bg-primary rounded-full z-20 animate-bounce">
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
                    className="h-16 w-16 rounded-full shadow-lg shadow-destructive/30"
                    onClick={declineCall}
                  >
                    <X className="h-7 w-7" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Decline</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    size="lg"
                    className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
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
    const statusDisplay = getStatusDisplay(callStatus);
    const StatusIcon = statusDisplay.icon;

    return (
      <div 
        className="fixed inset-0 z-[100] bg-background flex flex-col"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)', 
          paddingBottom: 'max(env(safe-area-inset-bottom), 32px)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        <AudioElement />
        
        {isVideoCall ? (
          // Video call UI
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

              {/* Local video (picture-in-picture) */}
              <div 
                className="absolute w-28 h-40 rounded-2xl overflow-hidden shadow-lg bg-black border-2 border-background"
                style={{ top: 'max(env(safe-area-inset-top), 16px)', right: '16px' }}
              >
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn("w-full h-full object-cover", isVideoOff && "hidden")}
                />
                {isVideoOff && (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <VideoOff className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Call status overlay at top */}
              <div className="absolute left-4 z-10" style={{ top: 'max(env(safe-area-inset-top), 16px)' }}>
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 inline-flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    callStatus === "connected" ? "bg-green-500" : 
                    callStatus === "calling" || callStatus === "ringing" ? "bg-yellow-500 animate-pulse" :
                    "bg-red-500"
                  )} />
                  <span className="text-white text-sm font-medium">
                    {profile?.display_name || profile?.username}
                  </span>
                  <span className="text-white/80 text-sm">
                    {statusDisplay.text}
                  </span>
                </div>
              </div>

              {/* Media panel */}
              {showMediaPanel && <MediaPanel />}
            </div>

            {/* Controls - mobile-optimised, prominent hangup */}
            <div className="bg-gradient-to-t from-black/70 to-transparent px-4 pt-8 pb-4 absolute bottom-0 left-0 right-0 z-20">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                {/* Secondary controls */}
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  <Button
                    variant="secondary"
                    size="icon"
                    className={cn("h-12 w-12 rounded-full backdrop-blur-md", isMuted ? "bg-destructive text-destructive-foreground" : "bg-white/15 text-white hover:bg-white/25")}
                    onClick={handleToggleAudio}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant="secondary"
                    size="icon"
                    className={cn("h-12 w-12 rounded-full backdrop-blur-md", isVideoOff ? "bg-destructive text-destructive-foreground" : "bg-white/15 text-white hover:bg-white/25")}
                    onClick={handleToggleVideo}
                    aria-label={isVideoOff ? "Turn on video" : "Turn off video"}
                  >
                    {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-12 w-12 rounded-full bg-white/15 text-white hover:bg-white/25 backdrop-blur-md"
                    onClick={switchCamera}
                    aria-label="Switch camera"
                  >
                    <SwitchCamera className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="secondary"
                    size="icon"
                    className={cn("h-12 w-12 rounded-full backdrop-blur-md", isSpeakerOff ? "bg-destructive text-destructive-foreground" : "bg-white/15 text-white hover:bg-white/25")}
                    onClick={handleToggleSpeaker}
                    aria-label="Toggle speaker"
                  >
                    {isSpeakerOff ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </div>

                {/* Prominent hang-up button */}
                <button
                  onClick={hangUp}
                  aria-label="End call"
                  className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground shadow-2xl shadow-destructive/40 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          // Audio call UI
          <div className="flex-1 flex flex-col">
            {/* Main content area */}
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-primary/10 to-background px-6">
              {/* Status indicator badge */}
              <div className="mb-8">
                <div className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                  callStatus === "connected" ? "bg-green-500/20" : 
                  callStatus === "failed" || callStatus === "busy" || callStatus === "ended" ? "bg-destructive/20" :
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

              {/* Profile avatar */}
              <div className="relative mb-6">
                {(callStatus === "calling" || callStatus === "ringing") && (
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
              
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Phone className="h-4 w-4" />
                <span className="text-sm">Voice Call</span>
              </div>

              {/* Media panel for audio calls */}
              {showMediaPanel && (
                <div className="w-full max-w-sm mt-6">
                  <MediaPanel />
                </div>
              )}
            </div>

            {/* Controls — mobile-optimised, prominent hangup */}
            <div className="bg-background/95 backdrop-blur-sm border-t border-border px-4 py-5">
              <div className="flex flex-col items-center gap-5 max-w-md mx-auto">
                <div className="flex justify-center items-center gap-4 flex-wrap">
                  <Button
                    variant={isMuted ? "destructive" : "secondary"}
                    size="icon"
                    className="h-13 w-13 h-12 w-12 rounded-full"
                    onClick={handleToggleAudio}
                    aria-label={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>

                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia || callStatus !== "connected"}
                    aria-label="Share media"
                  >
                    <Image className="h-5 w-5" />
                  </Button>

                  <Button
                    variant={isSpeakerOff ? "destructive" : "secondary"}
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={handleToggleSpeaker}
                    aria-label="Toggle speaker"
                  >
                    {isSpeakerOff ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </div>

                <button
                  onClick={hangUp}
                  aria-label="End call"
                  className="h-16 w-16 rounded-full bg-destructive text-destructive-foreground shadow-2xl shadow-destructive/40 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
              </div>
            </div>
          </div>

        )}
      </div>
    );
  }

  return null;
};
