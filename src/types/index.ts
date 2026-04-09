export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface WalletInfo {
  tokens: number;
  totalScans: number;
  totalPurchased: number;
  totalEarnedFromAds: number;
}

export interface ScanResult {
  id: string;
  userId: string;
  imageUrl: string;
  aiProbability: number;
  deepfakeProbability?: number;
  aiGenerators?: Record<string, number>; // e.g. { gpt: 95, dalle: 1 }
  classification: 'ai_generated' | 'likely_ai' | 'uncertain' | 'likely_real' | 'real';
  confidenceLevel: 'high' | 'medium' | 'low';
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface TokenPack {
  id: string;
  name: string;
  tokens: number;
  price: number;
  currency: string;
  popular?: boolean;
}

export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// ─── Social Media ─────────────────────────────────────────────────────────────

export type SocialPlatform = 'instagram' | 'twitter' | 'tiktok' | 'facebook' | 'unknown';

export interface SocialPostMeta {
  platform: SocialPlatform;
  postUrl: string;
  thumbnailUrl: string | null;
  authorName: string | null;
  caption: string | null;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  OTPVerify: { email: string };
};

export type MainTabParamList = {
  Home: undefined;
  Wallet: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  Paywall: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  Upload: undefined;
  SocialScan: undefined;
  Processing: {
    imageUri: string;
    socialMeta?: SocialPostMeta;
  };
  Result: { scanId: string };
  Paywall: undefined;
};
