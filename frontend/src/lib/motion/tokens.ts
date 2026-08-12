export const MOTION_DURATIONS = {
  instant: 0.09, // 80-100ms
  micro: 0.14,   // 120-160ms
  standard: 0.22, // 180-240ms
  emphasis: 0.32, // 280-360ms
  signature: 0.5  // 400-650ms
};

export const MOTION_EASINGS = {
  enter: [0, 0, 0.2, 1] as [number, number, number, number],
  exit: [0.4, 0, 1, 1] as [number, number, number, number],
  standard: [0.4, 0, 0.2, 1] as [number, number, number, number]
};

export const MOTION_DISTANCES = {
  micro: 3,
  standard: 7,
  emphasis: 12
};

export const defaultTransition = {
  duration: MOTION_DURATIONS.standard,
  ease: MOTION_EASINGS.standard
};

export const fadeVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: defaultTransition
  }
};

export const pageVariants = {
  hidden: { 
    opacity: 0,
    y: MOTION_DISTANCES.standard
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.standard,
      ease: MOTION_EASINGS.enter
    }
  }
};

export const slideUpVariants = {
  hidden: { 
    opacity: 0,
    y: MOTION_DISTANCES.emphasis
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: MOTION_DURATIONS.emphasis,
      ease: MOTION_EASINGS.enter
    }
  },
  exit: {
    opacity: 0,
    y: MOTION_DISTANCES.emphasis,
    transition: {
      duration: MOTION_DURATIONS.micro,
      ease: MOTION_EASINGS.exit
    }
  }
};
