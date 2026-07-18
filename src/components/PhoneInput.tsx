import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { colors, spacing, radius, fontSize, fontWeight } from '../lib/theme';
import { COUNTRIES } from '../lib/countries';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
}

export default function PhoneInput({ value, onChangeText, onSubmitEditing }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = COUNTRIES.find(c => value.startsWith(c.dial)) ?? COUNTRIES[0];
  const localNumber = value.startsWith(selected.dial) ? value.slice(selected.dial.length) : value;

  function handleCountrySelect(country: typeof COUNTRIES[0]) {
    onChangeText(country.dial + localNumber);
    setPickerOpen(false);
    setSearch('');
  }

  function handleNumberChange(text: string) {
    const digits = text.replace(/[^\d]/g, '');
    onChangeText(selected.dial + digits);
  }

  const filtered = search
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dial.includes(search) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.flagBtn} onPress={() => setPickerOpen(true)} activeOpacity={0.7}>
        <Text style={s.flag}>{selected.flag}</Text>
        <Text style={s.dial}>{selected.dial}</Text>
        <ChevronDown size={14} color={colors.textMuted} />
      </TouchableOpacity>

      <TextInput
        style={s.input}
        value={localNumber}
        onChangeText={handleNumberChange}
        placeholder="Phone number"
        placeholderTextColor={colors.textMuted}
        keyboardType="phone-pad"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSubmitEditing}
      />

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={s.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setPickerOpen(false)} />
          <View style={s.sheet}>
            <View style={s.searchWrap}>
              <TextInput
                style={s.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Search country"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
            <FlatList
              data={filtered}
              keyExtractor={c => c.code}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.row} onPress={() => handleCountrySelect(item)} activeOpacity={0.7}>
                  <Text style={s.rowFlag}>{item.flag}</Text>
                  <Text style={s.rowName}>{item.name}</Text>
                  <Text style={s.rowDial}>{item.dial}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={s.empty}>No countries found</Text>}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 56,
    overflow: 'hidden',
  },
  flagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    height: '100%',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  flag: { fontSize: 18 },
  dial: { fontSize: fontSize.body, color: colors.text, fontWeight: fontWeight.medium },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    fontSize: fontSize.body,
    color: colors.text,
    height: '100%',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '70%',
  },
  searchWrap: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.elevated,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: fontSize.body,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowFlag: { fontSize: 22 },
  rowName: { flex: 1, fontSize: fontSize.body, color: colors.text },
  rowDial: { fontSize: fontSize.body, color: colors.textMuted, fontWeight: fontWeight.medium },
  empty: { textAlign: 'center', padding: 20, color: colors.textMuted },
});
