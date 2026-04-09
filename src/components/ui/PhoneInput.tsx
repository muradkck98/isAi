import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { radius } from '../../theme/radius';
import { typography } from '../../theme/typography';

// ─── Country data ──────────────────────────────────────────────────────────────

export interface Country {
  code: string;   // ISO 3166-1 alpha-2
  dial: string;   // e.g. "+90"
  flag: string;   // emoji
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: 'TR', dial: '+90',  flag: '🇹🇷', name: 'Turkey' },
  { code: 'US', dial: '+1',   flag: '🇺🇸', name: 'United States' },
  { code: 'GB', dial: '+44',  flag: '🇬🇧', name: 'United Kingdom' },
  { code: 'DE', dial: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: 'FR', dial: '+33',  flag: '🇫🇷', name: 'France' },
  { code: 'RU', dial: '+7',   flag: '🇷🇺', name: 'Russia' },
  { code: 'CN', dial: '+86',  flag: '🇨🇳', name: 'China' },
  { code: 'JP', dial: '+81',  flag: '🇯🇵', name: 'Japan' },
  { code: 'KR', dial: '+82',  flag: '🇰🇷', name: 'South Korea' },
  { code: 'IN', dial: '+91',  flag: '🇮🇳', name: 'India' },
  { code: 'BR', dial: '+55',  flag: '🇧🇷', name: 'Brazil' },
  { code: 'MX', dial: '+52',  flag: '🇲🇽', name: 'Mexico' },
  { code: 'AR', dial: '+54',  flag: '🇦🇷', name: 'Argentina' },
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: 'EG', dial: '+20',  flag: '🇪🇬', name: 'Egypt' },
  { code: 'NG', dial: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: 'ZA', dial: '+27',  flag: '🇿🇦', name: 'South Africa' },
  { code: 'AU', dial: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: 'CA', dial: '+1',   flag: '🇨🇦', name: 'Canada' },
  { code: 'IT', dial: '+39',  flag: '🇮🇹', name: 'Italy' },
  { code: 'ES', dial: '+34',  flag: '🇪🇸', name: 'Spain' },
  { code: 'PT', dial: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'NL', dial: '+31',  flag: '🇳🇱', name: 'Netherlands' },
  { code: 'SE', dial: '+46',  flag: '🇸🇪', name: 'Sweden' },
  { code: 'NO', dial: '+47',  flag: '🇳🇴', name: 'Norway' },
  { code: 'PL', dial: '+48',  flag: '🇵🇱', name: 'Poland' },
  { code: 'UA', dial: '+380', flag: '🇺🇦', name: 'Ukraine' },
  { code: 'PK', dial: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: 'BD', dial: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: 'ID', dial: '+62',  flag: '🇮🇩', name: 'Indonesia' },
  { code: 'PH', dial: '+63',  flag: '🇵🇭', name: 'Philippines' },
  { code: 'VN', dial: '+84',  flag: '🇻🇳', name: 'Vietnam' },
  { code: 'TH', dial: '+66',  flag: '🇹🇭', name: 'Thailand' },
  { code: 'MY', dial: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: 'SG', dial: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: 'NZ', dial: '+64',  flag: '🇳🇿', name: 'New Zealand' },
  { code: 'IL', dial: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: 'GR', dial: '+30',  flag: '🇬🇷', name: 'Greece' },
  { code: 'CH', dial: '+41',  flag: '🇨🇭', name: 'Switzerland' },
  { code: 'AT', dial: '+43',  flag: '🇦🇹', name: 'Austria' },
  { code: 'BE', dial: '+32',  flag: '🇧🇪', name: 'Belgium' },
  { code: 'CZ', dial: '+420', flag: '🇨🇿', name: 'Czech Republic' },
  { code: 'HU', dial: '+36',  flag: '🇭🇺', name: 'Hungary' },
  { code: 'RO', dial: '+40',  flag: '🇷🇴', name: 'Romania' },
  { code: 'CO', dial: '+57',  flag: '🇨🇴', name: 'Colombia' },
  { code: 'CL', dial: '+56',  flag: '🇨🇱', name: 'Chile' },
  { code: 'PE', dial: '+51',  flag: '🇵🇪', name: 'Peru' },
  { code: 'IR', dial: '+98',  flag: '🇮🇷', name: 'Iran' },
  { code: 'IQ', dial: '+964', flag: '🇮🇶', name: 'Iraq' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  label?: string;
  value: string;
  onChangeText: (fullNumber: string) => void;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PhoneInput = memo(({
  label = 'Phone Number',
  value,
  onChangeText,
  error,
  ...rest
}: PhoneInputProps) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // TR default
  const [localNumber, setLocalNumber] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);

  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dial.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  const handleNumberChange = (text: string) => {
    // Only digits and spaces
    const cleaned = text.replace(/[^\d\s]/g, '');
    setLocalNumber(cleaned);
    onChangeText(`${selectedCountry.dial}${cleaned.replace(/\s/g, '')}`);
  };

  const handleSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    setPickerVisible(false);
    setSearch('');
    onChangeText(`${country.dial}${localNumber.replace(/\s/g, '')}`);
  };

  const borderColor = error
    ? colors.error
    : focused
    ? colors.primary[500]
    : colors.neutral[200];

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, error && { color: colors.error }]}>{label}</Text>
      ) : null}

      <View style={[styles.row, { borderColor, borderWidth: focused ? 1.5 : 1 }]}>
        {/* Country selector */}
        <TouchableOpacity
          style={styles.dialButton}
          onPress={() => setPickerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.dial}>{selectedCountry.dial}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.neutral[400]} />
        </TouchableOpacity>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.neutral[200] }]} />

        {/* Number input */}
        <TextInput
          {...rest}
          style={styles.input}
          value={localNumber}
          onChangeText={handleNumberChange}
          keyboardType="phone-pad"
          placeholder="555 000 00 00"
          placeholderTextColor={colors.neutral[400]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete="tel"
          returnKeyType="next"
        />
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Country Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Handle */}
            <View style={styles.handle} />

            <Text style={styles.modalTitle}>Select Country</Text>

            {/* Search */}
            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={colors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor={colors.neutral[400]}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.neutral[400]} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryRow,
                    item.code === selectedCountry.code && styles.countryRowSelected,
                  ]}
                  onPress={() => handleSelectCountry(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.countryDial}>{item.dial}</Text>
                  {item.code === selectedCountry.code && (
                    <Ionicons name="checkmark" size={16} color={colors.primary[500]} />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => (
                <View style={{ height: 1, backgroundColor: colors.neutral[100] }} />
              )}
            />

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setPickerVisible(false); setSearch(''); }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: {
    ...typography.bodySm,
    fontWeight: '500',
    color: colors.neutral[700],
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
    minHeight: 48,
  },
  dialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  flag: { fontSize: 20 },
  dial: {
    ...typography.bodySm,
    fontWeight: '600',
    color: colors.neutral[700],
    minWidth: 36,
  },
  divider: { width: 1, height: 28 },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.neutral[900],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    maxHeight: '80%',
    paddingTop: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral[200],
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.neutral[900],
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  countryRowSelected: {
    backgroundColor: colors.primary[50],
  },
  countryFlag: { fontSize: 22, width: 32 },
  countryName: {
    flex: 1,
    ...typography.body,
    color: colors.neutral[800],
  },
  countryDial: {
    ...typography.bodySm,
    color: colors.neutral[500],
    fontWeight: '500',
    minWidth: 44,
    textAlign: 'right',
  },
  cancelBtn: {
    margin: spacing.xl,
    marginTop: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  cancelText: {
    ...typography.bodyMedium,
    color: colors.neutral[600],
  },
});
