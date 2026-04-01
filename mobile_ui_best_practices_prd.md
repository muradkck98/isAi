# isAi Mobile App UI/UX PRD (React Native)

## 1. Product Goal

Build a premium-quality React Native mobile app with extremely smooth
UX, modern animations, low friction interaction patterns, and scalable
architecture.

Focus: - best mobile UX practices - keyboard-safe forms - safe-area
handling - responsive layouts - meaningful animations - scalable
component architecture - startup-ready React Native structure

The application should feel: fast, minimal, premium, intuitive, and
polished.

Core rule: Beautiful UI is not enough --- frictionless interaction wins.

------------------------------------------------------------------------

# 2. UX Principles

1.  Every screen must have one clear primary action.
2.  The next step must always be obvious.
3.  Loading states must never show blank screens.
4.  Buttons must always be reachable with one thumb.
5.  Animations must explain transitions, not decorate them.
6.  Forms must never hide inputs behind the keyboard.
7.  Spacing and hierarchy must reduce cognitive load.
8.  The UI must feel equally premium on iOS and Android.
9.  Every user action must provide feedback.
10. The system should feel fast even when waiting.

------------------------------------------------------------------------

# 3. Layout Rules

Spacing scale: 4, 8, 12, 16, 20, 24, 32

Border radius: Inputs: 12--16 Cards: 16--24 Buttons: 14--18 Sheets: 24+

Typography: Hero: 28--32 Screen title: 24 Section title: 18--20 Body:
15--16 Secondary text: 13--14 Caption: 12

------------------------------------------------------------------------

# 4. Navigation

Root Stack Auth Stack Main Bottom Tabs Modal Layer

Bottom tabs example: Home Analyze History Wallet Profile

Rules: Maximum 5 tabs Predictable back navigation

------------------------------------------------------------------------

# 5. Form UX

Rules: Short forms Step flows for long forms Labels required Early
validation

Keyboard-safe structure:

SafeAreaProvider → SafeAreaView → KeyboardAvoidingView → ScrollView

Input types: email → email-address phone → phone-pad number → numeric

Return key flow: next → next → done

Tap outside closes keyboard.

------------------------------------------------------------------------

# 6. Lists

Use FlashList for large lists.

Rules: Skeleton loading Pull-to-refresh Meaningful empty states

Example: "No scans yet. Upload an image to start analyzing."

------------------------------------------------------------------------

# 7. Loading & Feedback

Loading: Use skeleton loaders instead of blank screens.

Success: Toast + micro animation + haptic.

Error: "Something went wrong. Please try again."

Always include retry action.

------------------------------------------------------------------------

# 8. Animation System

Animations must: Explain state changes Be fast Be subtle

Durations: Tap: 80--150ms Screen transition: 180--280ms Modal:
220--320ms

Avoid: Heavy bounce Slow easing Animating everything

Tools: react-native-reanimated react-native-gesture-handler
lottie-react-native (optional)

------------------------------------------------------------------------

# 9. Accessibility

Minimum touch target: 44x44

Rules: Strong contrast Icons with labels Dynamic font scaling support
Avoid color-only meaning

------------------------------------------------------------------------

# 10. Performance

Optimize lists Lazy load images Memoize expensive components Cache
network responses Minimize re-renders

------------------------------------------------------------------------

# 11. Tech Stack

React Native TypeScript React Navigation react-native-safe-area-context
react-native-reanimated react-native-gesture-handler React Hook Form Zod
TanStack Query Zustand FlashList

------------------------------------------------------------------------

# 12. Project Structure

src/ navigation/ screens/ components/ features/ services/ hooks/ store/
utils/ theme/ constants/ types/ assets/

------------------------------------------------------------------------

# 13. Core Screens

Splash Onboarding Login Home Analyze/Upload Processing Result Wallet
History Profile

------------------------------------------------------------------------

# 14. Monetization UX

Rules: Transparent monetization Clear ad rewards Understandable token
system

Example: "You ran out of tokens. Watch an ad or purchase a token pack."

------------------------------------------------------------------------

# 15. Development Order

Theme system Navigation structure Layout components UI components Auth
screens Upload flow Result screen History & wallet Animation polish
Analytics

------------------------------------------------------------------------

# 16. Summary

The product must feel:

minimal smooth premium fast modern

Goal: Exceptional usability and interaction quality.
