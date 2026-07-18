import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { colors, radius } from '../lib/theme';
import { useResponsive } from '../lib/responsive';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function ResponsiveSheet({ visible, onClose, children }: Props) {
  const { isDesktop, sheetMaxWidth } = useResponsive();

  if (isDesktop) {
    return (
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={s.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={[s.centeredSheet, { maxWidth: sheetMaxWidth }]}>
            {children}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={s.sheet}>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  centeredSheet: {
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    maxHeight: '80%',
    width: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
