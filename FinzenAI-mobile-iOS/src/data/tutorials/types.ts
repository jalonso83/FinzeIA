// Types for Tutorial System

export interface TutorialSlide {
  id: string;
  title: string;
  description: string;
  icon: string;                   // Ionicons name
  backgroundColor: string;        // Hex color for gradient start
  gradientEnd: string;           // Hex color for gradient end
  decorativeElements?: {
    type: 'circles' | 'dots' | 'waves';
    color?: string;
  };
}

export interface Tutorial {
  id: string;
  name: string;
  category: string;
  icon: string;                   // Ionicons name
  color: string;                  // Primary color for card
  screen?: string;                // Related screen name (optional)
  slides: TutorialSlide[];
  duration: number;               // Estimated seconds
  lastUpdated: string;            // ISO date
  tags?: string[];                // For search/filtering
}

export interface TutorialProgress {
  tutorialId: string;
  completed: boolean;
  lastViewed: string;             // ISO date
  currentSlide: number;
}

export interface CoachMark {
  id: string;
  screen: string;
  order: number;
  title: string;
  description: string;
}
