# isAi -- Master Product Requirement Document

## 1. Product Overview

isAi is a mobile application that allows users to detect whether an
image is AI-generated or real.

Users upload an image → system analyzes it using AI detection APIs →
result is shown with probability.

Example: AI Probability: 87% Result: Likely AI Generated

------------------------------------------------------------------------

## 2. Target Users

Primary users: - journalists - researchers - students - social media
users - content moderators

------------------------------------------------------------------------

## 3. Core Value Proposition

The internet is increasingly filled with AI-generated images. isAi
provides a simple mobile tool to quickly detect synthetic content.

------------------------------------------------------------------------

## 4. Core Features

### Image Upload

Users can upload images via: - camera - gallery

### AI Detection

Image is analyzed using external APIs.

Potential providers: - Sightengine - Hive AI

### Result Screen

Display: AI Probability classification confidence level

------------------------------------------------------------------------

## 5. Monetization Model

Token system:

1 scan = 1 token

Users obtain tokens via: - watching ads - purchasing token packs

Example packs: 40 scans 120 scans 300 scans

------------------------------------------------------------------------

## 6. Rewarded Ads

Flow:

User tokens = 0 ↓ Watch rewarded ad ↓ Receive token ↓ Run scan

Ad provider: AdMob

------------------------------------------------------------------------

## 7. Purchase System

Token purchases:

iOS → StoreKit Android → Google Play Billing

Optional layer: RevenueCat

------------------------------------------------------------------------

## 8. User Flow

App open ↓ Splash ↓ Onboarding ↓ Login

Main flow:

Home ↓ Upload image ↓ Check tokens

If tokens available → scan

If tokens empty → watch ad or purchase tokens

------------------------------------------------------------------------

## 9. Scan Pipeline

Image upload ↓ Storage upload ↓ Edge Function ↓ AI detection API ↓
Normalize result ↓ Save result ↓ Return response

------------------------------------------------------------------------

## 10. Backend Architecture

Backend: Supabase

Services: Auth Postgres Storage Edge Functions

------------------------------------------------------------------------

## 11. Security

API keys must not exist inside the mobile app.

Mobile → Edge Function → AI API

Edge functions store secret keys.

------------------------------------------------------------------------

## 12. Database Tables

users wallet scans scan_results transactions

------------------------------------------------------------------------

## 13. Analytics

Track events:

upload_started upload_completed scan_started scan_completed
rewarded_ad_completed token_purchase_completed result_shared

------------------------------------------------------------------------

## 14. Growth Feature

Share Result

Example:

AI Probability: 92% Share → Twitter / WhatsApp / Instagram

------------------------------------------------------------------------

## 15. Scaling

Future:

video detection browser extension web version multiple AI providers

------------------------------------------------------------------------

## 16. Tech Stack

Frontend:

React Native TypeScript

Libraries:

React Navigation React Hook Form Zod TanStack Query Zustand FlashList
Reanimated

------------------------------------------------------------------------

## 17. Project Structure

src/ navigation/ screens/ components/ features/ services/ store/ utils/
theme/ assets/

------------------------------------------------------------------------

## 18. Development Phases

Phase 1: MVP Phase 2: Monetization Phase 3: Growth Phase 4: Scaling

------------------------------------------------------------------------

## 19. Vision

Create the most trusted mobile AI detection tool.
