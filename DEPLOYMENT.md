# isAi — Deployment Guide

## 1. Ön Gereksinimler

```bash
npm install -g eas-cli
eas login
```

## 2. EAS Proje Bağlantısı

```bash
eas init
```

Bu komut `app.json` içindeki `extra.eas.projectId` ve `owner` alanlarını otomatik doldurur.

## 3. Supabase Kurulumu

1. [supabase.com](https://supabase.com) → yeni proje oluştur
2. SQL Editor'a `supabase/migrations/001_initial_schema.sql` içeriğini yapıştır ve çalıştır
3. Authentication → Providers → Google'ı etkinleştir
4. Supabase Dashboard → Project Settings → API → URL ve anon key'i al

### .env dosyasını ayarla:
```
EXPO_PUBLIC_SUPABASE_URL=https://PROJE.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=xxx.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=xxx.apps.googleusercontent.com
```

## 4. Google OAuth Kurulumu

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. OAuth 2.0 istemci kimliği oluştur:
   - **Web**: Authorized redirect URIs → `https://PROJE.supabase.co/auth/v1/callback`
   - **iOS**: Bundle ID → `com.isai.app`
   - **Android**: SHA-1 fingerprint (aşağıdan al) + Package name → `com.isai.app`

### Android SHA-1 fingerprint almak:
```bash
# Production keystore (EAS):
eas credentials

# Debug keystore:
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

3. Supabase Dashboard → Authentication → Providers → Google → Client ID ve Secret gir

## 5. Edge Function Deploy (AI Detection)

```bash
# Supabase CLI kurulumu
npm install -g supabase

# Login
supabase login

# Projeyi bağla
supabase link --project-ref YOUR_PROJECT_REF

# Secrets ayarla (Sightengine veya Hive AI)
supabase secrets set SIGHTENGINE_API_USER=your_user
supabase secrets set SIGHTENGINE_API_SECRET=your_secret

# Deploy
supabase functions deploy detect-ai
```

### Edge Function'ı api.ts'e bağla:

`src/services/api.ts` içindeki `callAIDetection` fonksiyonunu şöyle güncelle:

```typescript
async function callAIDetection(imageUri: string): Promise<{ probability: number }> {
  const { data, error } = await supabase.functions.invoke('detect-ai', {
    body: { image_url: imageUri },
  });
  if (error) throw new Error(error.message);
  return { probability: data.probability };
}
```

## 6. EAS Build

### Development Build (test için):
```bash
npm run build:dev:android
npm run build:dev:ios
```

### Production Build:
```bash
# Android (AAB — Google Play için)
npm run build:prod:android

# iOS (IPA — App Store için)
npm run build:prod:ios

# İkisi birden
npm run build:prod:all
```

## 7. Google Play'e Yükleme

1. [Google Play Console](https://play.google.com/console) → Yeni uygulama oluştur
2. `google-play-service-account.json` oluştur (API erişimi için)
3. İlk yükleme **manuel** yapılmalı (eas submit ilk sürümde çalışmaz):
   - Build tamamlandığında indirilen `.aab` dosyasını Play Console'a yükle
   - Internal test → Closed testing → Production
4. Sonraki sürümler:
```bash
npm run submit:android
```

## 8. App Store'a Yükleme

1. [App Store Connect](https://appstoreconnect.apple.com) → Yeni uygulama
2. `eas.json` içindeki `appleId`, `ascAppId`, `appleTeamId` değerlerini doldur
3. Submit:
```bash
npm run submit:ios
```

## 9. OTA Güncelleme (Expo EAS Update)

Kod değişikliği için native build gerekmediğinde:

```bash
npm run update          # production branch
npm run update:preview  # preview branch
```

`app.json` içindeki `updates.url` için `YOUR_EAS_PROJECT_ID` gerçek ID ile değiştirilmeli.

## 10. Kontrol Listesi

- [ ] `.env` dosyası gerçek değerlerle dolu
- [ ] Supabase migration çalıştırıldı
- [ ] Google OAuth her iki platform için yapılandırıldı
- [ ] `app.json` → `extra.eas.projectId` gerçek ID
- [ ] `app.json` → `owner` Expo kullanıcı adınla güncellendi
- [ ] `app.json` → `updates.url` güncellendi
- [ ] `eas.json` → `submit.production.ios` alanları dolduruldu
- [ ] App icon ve splash screen görselleri eklendi
- [ ] Edge Function deploy edildi (isteğe bağlı, mock çalışıyor)
- [ ] `ProfileScreen.tsx` → App Store ID güncellendi
