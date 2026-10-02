import React, { useId } from 'react';

interface LumoraLogoProps {
  /**
   * 'horizontal': Icon on left + L U M O R Λ wordmark on right (ideal for Sticky Header)
   * 'stacked': Form 1 from uploaded logo (Circular Horizon Sunset icon above L U M O R Λ wordmark)
   * 'badge': Form 2 from uploaded logo (Circular midnight-blue medallion with L U M O R Λ inside lower half)
   */
  layout?: 'horizontal' | 'stacked' | 'badge';
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Pure SVG vector paths for "L U M O R Λ" (with the signature crossbar-less 'Λ')
 * Coordinate space: width 336 (x: 8..344), height 28 (y: 4..32)
 */
const LumoraWordmarkPaths: React.FC<{ color: string }> = ({ color }) => (
  <>
    {/* L */}
    <path
      d="M8 4V32H28"
      stroke={color}
      strokeWidth="4.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
    {/* U */}
    <path
      d="M64 4V20C64 26.8 69.2 32 76 32C82.8 32 88 26.8 88 20V4"
      stroke={color}
      strokeWidth="4.4"
      strokeLinecap="square"
    />
    {/* M */}
    <path
      d="M126 32V5.5L141 25L156 5.5V32"
      stroke={color}
      strokeWidth="4.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
    {/* O */}
    <circle cx="208" cy="18" r="14" stroke={color} strokeWidth="4.4" />
    {/* R */}
    <path
      d="M260 32V4H273.5C279.5 4 283.5 7.5 283.5 12.5C283.5 17.5 279.5 21 273.5 21H260M272 21L284.5 32"
      stroke={color}
      strokeWidth="4.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
    {/* Λ (Signature crossbar-less A) */}
    <path
      d="M318 32L331 5L344 32"
      stroke={color}
      strokeWidth="4.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
    />
  </>
);

const LumoraWordmarkSvg: React.FC<{
  color: string;
  className?: string;
}> = ({ color, className = 'h-4 w-auto' }) => (
  <svg
    viewBox="0 0 352 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="LUMORA"
  >
    <LumoraWordmarkPaths color={color} />
  </svg>
);

export const LumoraLogo: React.FC<LumoraLogoProps> = ({
  layout = 'horizontal',
  variant = 'light',
  size = 'md',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');

  // Form 2: Full Circular Badge Medallion (L U M O R Λ centered cleanly inside the dark navy circle below the horizon)
  if (layout === 'badge') {
    const badgeDimensions =
      size === 'xl'
        ? 'w-44 h-44'
        : size === 'lg'
        ? 'w-32 h-32'
        : size === 'sm'
        ? 'w-16 h-16'
        : 'w-28 h-28';

    return (
      <span
        className={`inline-flex items-center justify-center select-none shrink-0 ${badgeDimensions} ${className}`}
      >
        <svg
          viewBox="0 0 240 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full drop-shadow-[0_8px_24px_rgba(255,165,0,0.22)]"
          role="img"
          aria-label="Lumora Sunset Emblem"
        >
          <defs>
            <radialGradient id={`bg-${uid}`} cx="50%" cy="48%" r="52%">
              <stop offset="0%" stopColor="#173766" />
              <stop offset="65%" stopColor="#091D3E" />
              <stop offset="100%" stopColor="#041026" />
            </radialGradient>

            <radialGradient id={`arch4-${uid}`} cx="50%" cy="100%" r="85%">
              <stop offset="0%" stopColor="#FFA500" stopOpacity="0.45" />
              <stop offset="70%" stopColor="#FF8C00" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#60A5FA" stopOpacity="0.18" />
            </radialGradient>

            <radialGradient id={`arch3-${uid}`} cx="50%" cy="100%" r="75%">
              <stop offset="0%" stopColor="#FFA500" stopOpacity="0.65" />
              <stop offset="75%" stopColor="#FF7A00" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFB74D" stopOpacity="0.25" />
            </radialGradient>

            <radialGradient id={`arch2-${uid}`} cx="50%" cy="100%" r="65%">
              <stop offset="0%" stopColor="#FFB300" stopOpacity="0.85" />
              <stop offset="80%" stopColor="#FF8000" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#FFD54F" stopOpacity="0.4" />
            </radialGradient>

            <radialGradient id={`sunCore-${uid}`} cx="50%" cy="92%" r="58%">
              <stop offset="0%" stopColor="#FFF3B0" />
              <stop offset="35%" stopColor="#FFB703" />
              <stop offset="85%" stopColor="#FB8500" />
              <stop offset="100%" stopColor="#FF9E00" />
            </radialGradient>

            <radialGradient id={`reflect-${uid}`} cx="50%" cy="0%" r="65%">
              <stop offset="0%" stopColor="#FFB703" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#FB8500" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#071733" stopOpacity="0" />
            </radialGradient>

            <linearGradient id={`horizon-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFA500" stopOpacity="0" />
              <stop offset="20%" stopColor="#FFA500" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#FFF8D6" stopOpacity="1" />
              <stop offset="80%" stopColor="#FFA500" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#FFA500" stopOpacity="0" />
            </linearGradient>

            <clipPath id={`upperHorizon-${uid}`}>
              <rect x="0" y="0" width="240" height="132" />
            </clipPath>
            <clipPath id={`circleClip-${uid}`}>
              <circle cx="120" cy="120" r="116" />
            </clipPath>
          </defs>

          <g clipPath={`url(#circleClip-${uid})`}>
            {/* Deep Midnight Twilight Circle Base */}
            <circle cx="120" cy="120" r="116" fill={`url(#bg-${uid})`} />

            {/* 4 Concentric Glowing Sunset Arches Above Horizon (y = 132) */}
            <g clipPath={`url(#upperHorizon-${uid})`}>
              <circle
                cx="120"
                cy="126"
                r="92"
                fill={`url(#arch4-${uid})`}
                stroke="#93C5FD"
                strokeOpacity="0.22"
                strokeWidth="1.2"
              />
              <circle
                cx="120"
                cy="126"
                r="74"
                fill={`url(#arch3-${uid})`}
                stroke="#FDBA74"
                strokeOpacity="0.35"
                strokeWidth="1.2"
              />
              <circle
                cx="120"
                cy="126"
                r="57"
                fill={`url(#arch2-${uid})`}
                stroke="#FDE047"
                strokeOpacity="0.5"
                strokeWidth="1.4"
              />
              <circle
                cx="120"
                cy="126"
                r="41"
                fill={`url(#sunCore-${uid})`}
                stroke="#FFFBEB"
                strokeOpacity="0.85"
                strokeWidth="1.8"
              />
            </g>

            {/* Below-Horizon Golden Water Reflection */}
            <ellipse
              cx="120"
              cy="133"
              rx="68"
              ry="24"
              fill={`url(#reflect-${uid})`}
            />

            {/* Luminous Golden Horizon Line */}
            <rect
              x="14"
              y="130.8"
              width="212"
              height="2.4"
              fill={`url(#horizon-${uid})`}
            />

            {/* Perfectly Centered White L U M O R Λ Wordmark in Lower Half (x: 46..194, y: 158..173) */}
            <g transform="translate(46, 158) scale(0.42)">
              <LumoraWordmarkPaths color="#FFFFFF" />
            </g>
          </g>

          {/* Subtle Outer Golden Rim */}
          <circle
            cx="120"
            cy="120"
            r="116"
            stroke="#FFA500"
            strokeOpacity="0.3"
            strokeWidth="1.5"
          />
        </svg>
      </span>
    );
  }

  // Shared Horizon Sunset Icon for 'horizontal' and 'stacked' (Form 1) layouts
  const iconSizeClass =
    layout === 'stacked'
      ? size === 'lg'
        ? 'w-20 h-20 sm:w-24 sm:h-24'
        : 'w-14 h-14 sm:w-16 sm:h-16'
      : size === 'sm'
      ? 'w-7 h-7 sm:w-8 sm:h-8'
      : 'w-8 h-8 sm:w-10 sm:h-10';

  const wordmarkColor = variant === 'light' ? '#FFFFFF' : '#0B2144';
  const wordmarkHeightClass =
    layout === 'stacked'
      ? size === 'lg'
        ? 'h-5 sm:h-6 w-auto'
        : 'h-3.5 sm:h-4 w-auto'
      : size === 'sm'
      ? 'h-3 sm:h-3.5 w-auto'
      : 'h-3.5 sm:h-[18px] w-auto';

  return (
    <span
      className={`inline-flex ${
        layout === 'stacked'
          ? 'flex-col items-center gap-2.5 sm:gap-3'
          : 'items-center gap-2 sm:gap-3'
      } select-none ${className}`}
    >
      {/* Horizon Sunset Circular Icon (Form 1) */}
      <svg
        viewBox="0 0 160 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={`${iconSizeClass} shrink-0 drop-shadow-[0_4px_14px_rgba(255,165,0,0.3)]`}
      >
        <defs>
          <radialGradient id={`iconBg-${uid}`} cx="50%" cy="52%" r="52%">
            <stop offset="0%" stopColor="#1B3B6B" />
            <stop offset="70%" stopColor="#0C2346" />
            <stop offset="100%" stopColor="#07162E" />
          </radialGradient>

          <radialGradient id={`iconArch4-${uid}`} cx="50%" cy="100%" r="85%">
            <stop offset="0%" stopColor="#FFA500" stopOpacity="0.45" />
            <stop offset="75%" stopColor="#FF8C00" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.15" />
          </radialGradient>

          <radialGradient id={`iconArch3-${uid}`} cx="50%" cy="100%" r="75%">
            <stop offset="0%" stopColor="#FFA500" stopOpacity="0.68" />
            <stop offset="80%" stopColor="#FF7A00" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FDBA74" stopOpacity="0.25" />
          </radialGradient>

          <radialGradient id={`iconArch2-${uid}`} cx="50%" cy="100%" r="65%">
            <stop offset="0%" stopColor="#FFB300" stopOpacity="0.88" />
            <stop offset="85%" stopColor="#FF8000" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#FDE047" stopOpacity="0.4" />
          </radialGradient>

          <radialGradient id={`iconSun-${uid}`} cx="50%" cy="90%" r="58%">
            <stop offset="0%" stopColor="#FFF5B8" />
            <stop offset="35%" stopColor="#FFB703" />
            <stop offset="85%" stopColor="#FB8500" />
            <stop offset="100%" stopColor="#FF9E00" />
          </radialGradient>

          <radialGradient id={`iconRefl-${uid}`} cx="50%" cy="0%" r="65%">
            <stop offset="0%" stopColor="#FFB703" stopOpacity="0.9" />
            <stop offset="45%" stopColor="#FB8500" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0C2346" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={`iconHoriz-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFA500" stopOpacity="0.1" />
            <stop offset="20%" stopColor="#FFA500" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#FFF9DB" stopOpacity="1" />
            <stop offset="80%" stopColor="#FFA500" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#FFA500" stopOpacity="0.1" />
          </linearGradient>

          <clipPath id={`iconUpper-${uid}`}>
            <rect x="0" y="0" width="160" height="108" />
          </clipPath>
          <clipPath id={`iconCircle-${uid}`}>
            <circle cx="80" cy="80" r="76" />
          </clipPath>
        </defs>

        <g clipPath={`url(#iconCircle-${uid})`}>
          {/* Deep Twilight Blue Circle */}
          <circle cx="80" cy="80" r="76" fill={`url(#iconBg-${uid})`} />

          {/* 4 Concentric Sunset Arches Above Horizon (y = 108) */}
          <g clipPath={`url(#iconUpper-${uid})`}>
            <circle
              cx="80"
              cy="104"
              r="68"
              fill={`url(#iconArch4-${uid})`}
              stroke="#93C5FD"
              strokeOpacity="0.2"
              strokeWidth="1"
            />
            <circle
              cx="80"
              cy="104"
              r="55"
              fill={`url(#iconArch3-${uid})`}
              stroke="#FDBA74"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            <circle
              cx="80"
              cy="104"
              r="43"
              fill={`url(#iconArch2-${uid})`}
              stroke="#FDE047"
              strokeOpacity="0.5"
              strokeWidth="1.2"
            />
            <circle
              cx="80"
              cy="104"
              r="31"
              fill={`url(#iconSun-${uid})`}
              stroke="#FFFBEB"
              strokeOpacity="0.9"
              strokeWidth="1.5"
            />
          </g>

          {/* Warm Horizon Reflection Below y = 108 */}
          <ellipse
            cx="80"
            cy="109"
            rx="50"
            ry="20"
            fill={`url(#iconRefl-${uid})`}
          />

          {/* Crisp Golden Horizon Line */}
          <rect
            x="4"
            y="106.8"
            width="152"
            height="2.2"
            fill={`url(#iconHoriz-${uid})`}
          />
        </g>

        <circle
          cx="80"
          cy="80"
          r="76"
          stroke="#FFA500"
          strokeOpacity="0.3"
          strokeWidth="1.5"
        />
      </svg>

      {/* Geometric L U M O R Λ Wordmark */}
      <LumoraWordmarkSvg
        color={wordmarkColor}
        className={wordmarkHeightClass}
      />
    </span>
  );
};
