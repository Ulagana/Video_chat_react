import React, { useEffect, useRef } from 'react';

function VideoPlayer({ videoRef, stream, muted = false }) {
  const internalVideoRef = useRef(null);
  const ref = videoRef || internalVideoRef;

  useEffect(() => {
    if (stream && ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      muted={muted}
      className="w-100"
      style={{ height: '200px', objectFit: 'cover' }}
    />
  );
}

export default VideoPlayer;
