import React, { useEffect, useState, useRef } from 'react';
import AgoraRTC from "agora-rtc-sdk-ng";
import VirtualBackgroundExtension from "agora-extension-virtual-background";

const VideoChat = () => {
  const client = useRef(AgoraRTC.createClient({ mode: "rtc", codec: "vp8" }));
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [localTracks, setLocalTracks] = useState({ videoTrack: null, audioTrack: null });
  const [remoteUser, setRemoteUser] = useState(null);
  const [localBackgroundColor, setLocalBackgroundColor] = useState('');
  const [localBackgroundImage, setLocalBackgroundImage] = useState(null);
  const appId = "771a48f9b3d747b88c0f02561c215866"; // Your Agora App ID
  const channel = "test"; // Test channel name
  const token = null; // If you use token for authentication, add it here
  const [localUserJoined, setLocalUserJoined] = useState(false);
  const [isLocalAudioMuted, setIsLocalAudioMuted] = useState(false);
  const [isLocalVideoOff, setIsLocalVideoOff] = useState(false);
  const [isBackgroundBlurred, setIsBackgroundBlurred] = useState(false);
  const [currentProcessor, setCurrentProcessor] = useState(null);
  const virtualBackgroundExtension = useRef(new VirtualBackgroundExtension());

  useEffect(() => {
    client.current.on("user-published", handleUserPublished);
    client.current.on("user-unpublished", handleUserUnpublished);

    return () => {
      client.current.off("user-published", handleUserPublished);
      client.current.off("user-unpublished", handleUserUnpublished);
    };
  }, []);

  const joinChannel = async () => {
    try {
      const uid = await client.current.join(appId, channel, token, null);
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      setLocalTracks({ videoTrack, audioTrack });

      if (localVideoRef.current) {
        videoTrack.play(localVideoRef.current);
      }

      await client.current.publish([audioTrack, videoTrack]);
      setLocalUserJoined(true);
    } catch (error) {
      console.error("Failed to join the channel", error);
    }
  };

  const handleUserPublished = async (user, mediaType) => {
    await client.current.subscribe(user, mediaType);

    if (mediaType === "video") {
      const remoteVideoTrack = user.videoTrack;

      if (remoteVideoRef.current) {
        remoteVideoTrack.play(remoteVideoRef.current);
      }
      setRemoteUser(user);
    }
  };

  const handleUserUnpublished = (user) => {
    setRemoteUser(null);
  };

  const handleLocalBackgroundColorChange = (event) => {
    setLocalBackgroundColor(event.target.value);
    setLocalBackgroundImage(null);
  };

  const handleLocalBackgroundImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setLocalBackgroundImage(e.target.result);
        setLocalBackgroundColor('');
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMuteLocalAudio = () => {
    if (localTracks.audioTrack) {
      localTracks.audioTrack.setEnabled(!isLocalAudioMuted);
      setIsLocalAudioMuted(!isLocalAudioMuted);
    }
  };

  const toggleLocalVideo = async () => {
    if (localTracks.videoTrack) {
      await localTracks.videoTrack.setEnabled(!isLocalVideoOff);
      setIsLocalVideoOff(!isLocalVideoOff);
    }
  };

  const toggleBackgroundBlur = () => {
    setIsBackgroundBlurred(!isBackgroundBlurred);
  };

  // const [currentProcessor, setCurrentProcessor] = useState(null);

  const applyVirtualBackground = async () => {
    if (localTracks.videoTrack) {
      const extension = new VirtualBackgroundExtension();
      AgoraRTC.registerExtensions([extension]);
  
      // Unpipe and cleanup previous processor if exists
      if (currentProcessor) {
        try {
          await currentProcessor.disable();
          localTracks.videoTrack.unpipe(currentProcessor);
          currentProcessor.unpipe();
        } catch (error) {
          console.error("Error cleaning up previous processor:", error);
        }
        setCurrentProcessor(null);
      }
  
      const processor = extension.createProcessor();
  
      try {
        await processor.init();
  
        // Apply new background settings
        if (localBackgroundColor) {
          await processor.setOptions({ type: 'color', color: localBackgroundColor });
        } else if (localBackgroundImage) {
          const imgElement = new Image();
          imgElement.src = localBackgroundImage;
          await new Promise((resolve) => {
            imgElement.onload = () => resolve();
          });
          await processor.setOptions({ type: 'img', source: imgElement });
        } else if (isBackgroundBlurred) {
          await processor.setOptions({ type: 'blur', blurDegree: 2 });
        }
  
        // Pipe new processor
        localTracks.videoTrack.pipe(processor).pipe(localTracks.videoTrack.processorDestination);
        await processor.enable();
        setCurrentProcessor(processor);
      } catch (error) {
        console.error("Failed to apply virtual background:", error);
      }
    }
  };
  useEffect(() => {
    if (localUserJoined) {
      applyVirtualBackground();
    }
  }, [localBackgroundColor, localBackgroundImage, isBackgroundBlurred, localUserJoined]);

  return (
    <div style={{ padding: '20px' }}>
      <h1>One-to-One Video Chat</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {/* Local Video */}
        <div>
          <h3>Your Video</h3>
          <div
            ref={localVideoRef}
            style={{
              width: "320px",
              height: "240px",
              position: 'relative',
              overflow: 'hidden',
              backgroundColor: isLocalVideoOff ? "#000" : 'transparent'
            }}
          ></div>
          {localUserJoined && (
            <div>
              {!isLocalVideoOff && (
                <>
                  <label htmlFor="bg-color">Change Background Color: </label>
                  <select
                    id="bg-color"
                    onChange={handleLocalBackgroundColorChange}
                  >
                    <option value="#fff">White</option>
                    <option value="#000">Black</option>
                    <option value="#ff0000">Red</option>
                    <option value="#0000ff">Blue</option>
                  </select>

                  <label htmlFor="bg-image" style={{ marginLeft: '10px' }}>Upload Background Image: </label>
                  <input
                    type="file"
                    id="bg-image"
                    accept="image/*"
                    onChange={handleLocalBackgroundImageChange}
                    style={{ marginLeft: '10px' }}
                  />
                </>
              )}

              <div style={{ marginTop: '10px' }}>
                <button onClick={toggleMuteLocalAudio}>
                  {isLocalAudioMuted ? "Unmute" : "Mute"}
                </button>
                <button onClick={toggleLocalVideo} style={{ marginLeft: '10px' }}>
                  {isLocalVideoOff ? "Turn On Camera" : "Turn Off Camera"}
                </button>
                <button onClick={toggleBackgroundBlur} style={{ marginLeft: '10px' }}>
                  {isBackgroundBlurred ? "Remove Blur" : "Blur Background"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Remote Video */}
        <div>
          <h3>Remote User's Video</h3>
          <div
            ref={remoteVideoRef}
            style={{
              width: "320px",
              height: "240px",
              backgroundColor: "#ddd"
            }}
          ></div>
          {!remoteUser && <p>Waiting for remote user...</p>}
        </div>
      </div>

      {/* Join Button */}
      {!localUserJoined && (
        <button onClick={joinChannel} style={{ marginTop: '20px' }}>
          Join Now
        </button>
      )}
    </div>
  );
};

export default VideoChat;