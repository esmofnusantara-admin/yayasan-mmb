import React from 'react';

interface MMBLogoProps {
  className?: string;
  size?: number | string;
}

export default function MMBLogo({ className = '', size = '100%' }: MMBLogoProps) {
  return (
    <svg 
      viewBox="0 0 500 500" 
      width={size} 
      height={size} 
      className={`select-none ${className}`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dynamic artistic circle brush strokes */}
      {/* Left upper arc ending with brush tail */}
      <path 
        d="M 110,350 C 75,280 85,160 180,105 C 220,82 270,80 320,95" 
        stroke="#9E1B1B" 
        strokeWidth="16" 
        strokeLinecap="round" 
      />
      {/* Right lower arc ending with brush tail */}
      <path 
        d="M 320,95 C 370,110 400,160 400,240 C 400,320 340,410 240,430 C 200,438 160,425 125,395" 
        stroke="#9E1B1B" 
        strokeWidth="16" 
        strokeLinecap="round" 
      />
      
      {/* Open Book at the bottom as base */}
      <g transform="translate(0, 15)">
        {/* Book cover / hardback lines */}
        <path 
          d="M 80,430 Q 250,405 420,430 L 420,442 Q 250,417 80,442 Z" 
          fill="#9E1B1B" 
        />
        {/* Book pages lines */}
        <path 
          d="M 85,424 Q 250,400 415,424" 
          stroke="#9E1B1B" 
          strokeWidth="3" 
          fill="none" 
        />
        <path 
          d="M 90,418 Q 250,395 410,418" 
          stroke="#9E1B1B" 
          strokeWidth="2" 
          fill="none" 
        />
        {/* Book divider page crease */}
        <line x1="250" y1="410" x2="250" y2="442" stroke="#7F1D1D" strokeWidth="4" />
      </g>

      {/* Styled thick red strokes representing the bottom hand/flame shapes if any, 
          as well as the left-bottom brush hook */}
      <path 
        d="M 110,350 C 110,350 150,410 240,415" 
        stroke="#9E1B1B" 
        strokeWidth="22" 
        strokeLinecap="round" 
      />
      
      {/* Christian Cross in the Center-Right */}
      {/* Horizontal Crossbeam */}
      <path 
        d="M 135,160 L 360,160 C 365,160 365,188 360,188 L 135,188 C 130,188 130,160 135,160 Z" 
        fill="#9E1B1B" 
      />
      {/* Vertical Post */}
      <path 
        d="M 266,95 L 266,420 C 266,425 294,425 294,420 L 294,95 C 294,90 266,90 266,95 Z" 
        fill="#9E1B1B" 
      />

      {/* MMB Text nested cleanly on the left side of the cross */}
      <text 
        x="120" 
        y="320" 
        fill="#9E1B1B" 
        fontFamily="sans-serif, Inter, system-ui" 
        fontWeight="bold" 
        fontSize="108" 
        letterSpacing="-3"
      >
        MMB
      </text>

      {/* Graduation Cap overlapping on Top-Right */}
      <g transform="translate(350, 80) rotate(-10)">
        {/* Under cap band */}
        <path 
          d="M -35,5 L -35,22 Q 0,33 35,22 L 35,5 Q 0,14 -35,5" 
          fill="#7F1D1D" 
        />
        {/* Main Diamond top plate of mortarboard */}
        <path 
          d="M 0,-40 L 80,-12 L 0,16 L -80,-12 Z" 
          fill="#9E1B1B" 
          stroke="#7F1D1D" 
          strokeWidth="3" 
        />
        {/* Soft dimension outline to match image graduation cap style */}
        <path 
          d="M 0,-40 L 80,-12 L 0,16 Z" 
          fill="#FFFFFF" 
          fillOpacity="0.08" 
        />
        
        {/* Cap tassel hanging down */}
        <path 
          d="M 0,-12 Q 55,-5 72,40" 
          stroke="#7F1D1D" 
          strokeWidth="4.5" 
          fill="none" 
          strokeLinecap="round" 
        />
        {/* Tassel fringe ornament base */}
        <circle cx="72" cy="40" r="7.5" fill="#9E1B1B" />
        <path 
          d="M 66,45 L 78,45 L 78,80 L 66,80 Z" 
          fill="#9E1B1B" 
          stroke="#7F1D1D" 
          strokeWidth="1" 
        />
        {/* Fine threads on the tassel fringe */}
        <line x1="69" y1="45" x2="69" y2="80" stroke="#7F1D1D" strokeWidth="1" />
        <line x1="72" y1="45" x2="72" y2="80" stroke="#7F1D1D" strokeWidth="1" />
        <line x1="75" y1="45" x2="75" y2="80" stroke="#7F1D1D" strokeWidth="1" />
      </g>
    </svg>
  );
}
