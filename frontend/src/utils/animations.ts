import { keyframes } from '@emotion/react';

/**
 * Animation duration tokens (in milliseconds)
 */
export const duration = {
  instant: 0,
  fast: 150,      // Quick hover states and micro-interactions
  normal: 250,    // Standard transitions
  slow: 400,      // Complex animations and page transitions
} as const;

/**
 * Animation easing functions following Material Design guidelines
 */
export const easing = {
  standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',     // Material Design standard easing
  decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',   // Entrance animations
  accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',     // Exit animations
  sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',        // Quick feedback
  easeOut: 'ease-out',                             // General purpose ease out
  easeIn: 'ease-in',                               // General purpose ease in
  easeInOut: 'ease-in-out',                        // General purpose ease in-out
} as const;

/**
 * Transform tokens for common hover and active states
 */
export const transforms = {
  hoverLift: 'translateY(-2px)',
  hoverScale: 'scale(1.02)',
  activePress: 'scale(0.98)',
  scaleIn: 'scale(1)',
  scaleOut: 'scale(0)',
} as const;

/**
 * Keyframe animations
 */

// Fade animations
export const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

export const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

// Slide animations
export const slideInUp = keyframes`
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

export const slideInDown = keyframes`
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

export const slideInLeft = keyframes`
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

export const slideInRight = keyframes`
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

// Scale animations
export const scaleIn = keyframes`
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
`;

export const scaleOut = keyframes`
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.9);
    opacity: 0;
  }
`;

// Pulse animation for status indicators
export const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

// Shake animation for error states
export const shake = keyframes`
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-4px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(4px);
  }
`;

// Spin animation for loading indicators
export const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Bounce animation for success indicators
export const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
`;

// Shimmer animation for skeleton loaders
export const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

// Draw animation for checkmarks
export const draw = keyframes`
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
`;

/**
 * Helper functions to generate animation CSS strings
 */

/**
 * Creates a transition string with specified properties and duration
 * @param properties - CSS properties to transition (e.g., 'all', 'transform', 'opacity')
 * @param durationMs - Duration in milliseconds (use duration tokens)
 * @param easingFn - Easing function (use easing tokens)
 * @returns CSS transition string
 */
export function createTransition(
  properties: string | string[],
  durationMs: number = duration.normal,
  easingFn: string = easing.standard
): string {
  const props = Array.isArray(properties) ? properties : [properties];
  return props
    .map(prop => `${prop} ${durationMs}ms ${easingFn}`)
    .join(', ');
}

/**
 * Creates an animation CSS string
 * @param animationName - Keyframe animation name
 * @param durationMs - Duration in milliseconds
 * @param easingFn - Easing function
 * @param iterationCount - Number of iterations (or 'infinite')
 * @param fillMode - Animation fill mode
 * @returns CSS animation string
 */
export function createAnimation(
  animationName: string,
  durationMs: number = duration.normal,
  easingFn: string = easing.standard,
  iterationCount: number | 'infinite' = 1,
  fillMode: 'none' | 'forwards' | 'backwards' | 'both' = 'both'
): string {
  return `${animationName} ${durationMs}ms ${easingFn} ${iterationCount} ${fillMode}`;
}

/**
 * Creates hover state styles with lift and shadow effect
 * @param shouldAnimate - Whether to apply animation (respects reduced motion)
 * @returns CSS object for hover state
 */
export function createHoverLift(shouldAnimate: boolean = true) {
  if (!shouldAnimate) {
    return {};
  }

  return {
    transition: createTransition(['transform', 'box-shadow'], duration.fast),
    '&:hover': {
      transform: transforms.hoverLift,
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  };
}

/**
 * Creates hover state styles with scale effect
 * @param shouldAnimate - Whether to apply animation (respects reduced motion)
 * @param scale - Scale factor (default 1.02)
 * @returns CSS object for hover state
 */
export function createHoverScale(shouldAnimate: boolean = true, scale: number = 1.02) {
  if (!shouldAnimate) {
    return {};
  }

  return {
    transition: createTransition('transform', duration.fast),
    '&:hover': {
      transform: `scale(${scale})`,
    },
    '&:active': {
      transform: transforms.activePress,
    },
  };
}

/**
 * Creates pulse animation for status indicators
 * @param shouldAnimate - Whether to apply animation (respects reduced motion)
 * @returns CSS object with pulse animation
 */
export function createPulse(shouldAnimate: boolean = true) {
  if (!shouldAnimate) {
    return {};
  }

  return {
    animation: createAnimation('pulse', 2000, easing.easeInOut, 'infinite'),
  };
}

/**
 * Creates shake animation for error states
 * @param shouldAnimate - Whether to apply animation (respects reduced motion)
 * @returns CSS object with shake animation
 */
export function createShake(shouldAnimate: boolean = true) {
  if (!shouldAnimate) {
    return {};
  }

  return {
    animation: createAnimation('shake', 500, easing.sharp, 1),
  };
}

/**
 * Creates a shimmer loading effect for skeleton screens
 * @param shouldAnimate - Whether to apply animation (respects reduced motion)
 * @returns CSS object with shimmer animation
 */
export function createShimmer(shouldAnimate: boolean = true) {
  if (!shouldAnimate) {
    return {
      background: 'linear-gradient(90deg, #f0f0f0 0%, #f0f0f0 100%)',
    };
  }

  return {
    background: 'linear-gradient(90deg, #f0f0f0 0%, #e0e0e0 50%, #f0f0f0 100%)',
    backgroundSize: '1000px 100%',
    animation: createAnimation('shimmer', 2000, easing.easeInOut, 'infinite'),
  };
}

/**
 * Creates fade-in animation CSS
 * @param shouldAnimate - Whether to apply animation (respects reduced motion)
 * @param durationMs - Duration in milliseconds
 * @returns CSS object with fade-in animation
 */
export function createFadeIn(shouldAnimate: boolean = true, durationMs: number = duration.normal) {
  if (!shouldAnimate) {
    return { opacity: 1 };
  }

  return {
    animation: createAnimation('fadeIn', durationMs, easing.decelerate),
  };
}

/**
 * Creates slide-in animation CSS
 * @param shouldAnimate - Whether to apply animation (respects reduced motion)
 * @param direction - Direction to slide from ('up', 'down', 'left', 'right')
 * @param durationMs - Duration in milliseconds
 * @returns CSS object with slide-in animation
 */
export function createSlideIn(
  shouldAnimate: boolean = true,
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  durationMs: number = duration.normal
) {
  if (!shouldAnimate) {
    return {
      transform: 'none',
      opacity: 1,
    };
  }

  const animationMap = {
    up: 'slideInUp',
    down: 'slideInDown',
    left: 'slideInLeft',
    right: 'slideInRight',
  };

  return {
    animation: createAnimation(animationMap[direction], durationMs, easing.decelerate),
  };
}

/**
 * Exports all keyframe names for use in styled components
 */
export const keyframeAnimations = {
  fadeIn,
  fadeOut,
  slideInUp,
  slideInDown,
  slideInLeft,
  slideInRight,
  scaleIn,
  scaleOut,
  pulse,
  shake,
  spin,
  bounce,
  shimmer,
  draw,
} as const;
