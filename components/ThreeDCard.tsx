
import React, { useRef, useState } from 'react';

interface ThreeDCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  depth?: number; // Intensity of the 3D effect
}

export const ThreeDCard: React.FC<ThreeDCardProps> = ({ 
  children, 
  className = "", 
  onClick,
  depth = 10 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
  const [glow, setGlow] = useState("50% 50%");
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    const centerX = width / 2;
    const centerY = height / 2;

    // Calculate rotation (inverted Y axis for X rotation)
    const rotateX = ((y - centerY) / centerY) * -depth; 
    const rotateY = ((x - centerX) / centerX) * depth;

    setTransform(`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`);
    setGlow(`${(x / width) * 100}% ${(y / height) * 100}%`);
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    setOpacity(0);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`relative transition-all duration-300 ease-out transform-gpu preserve-3d ${className}`}
      style={{ transform }}
    >
      {/* Dynamic Glow Effect */}
      <div 
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none rounded-2xl z-0"
        style={{
          opacity,
          background: `radial-gradient(circle at ${glow}, rgba(0, 243, 255, 0.15), transparent 70%)`
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
