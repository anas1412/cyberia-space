import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TK = 'cyberia_token';
const UK = 'cyberia_userid';
const LR = 'cyberia_last_room';

function isWeb() {
  return Platform.OS === 'web';
}

export async function saveSession(token: string, userId: string) {
  if (isWeb()) {
    localStorage.setItem(TK, token);
    localStorage.setItem(UK, userId);
  } else {
    await SecureStore.setItemAsync(TK, token);
    await SecureStore.setItemAsync(UK, userId);
  }
}

export async function getSession(): Promise<{ token: string; userId: string } | null> {
  if (isWeb()) {
    const token = localStorage.getItem(TK);
    const userId = localStorage.getItem(UK);
    if (!token || !userId) return null;
    return { token, userId };
  }
  const token = await SecureStore.getItemAsync(TK);
  const userId = await SecureStore.getItemAsync(UK);
  if (!token || !userId) return null;
  return { token, userId };
}

export async function clearSession() {
  if (isWeb()) {
    localStorage.removeItem(TK);
    localStorage.removeItem(UK);
  } else {
    await SecureStore.deleteItemAsync(TK);
    await SecureStore.deleteItemAsync(UK);
  }
}

export async function saveLastRoom(roomId: string, password?: string) {
  const data = JSON.stringify({ roomId, password });
  if (isWeb()) {
    localStorage.setItem(LR, data);
  } else {
    await SecureStore.setItemAsync(LR, data);
  }
}

export async function getLastRoom(): Promise<{ roomId: string; password?: string } | null> {
  if (isWeb()) {
    const data = localStorage.getItem(LR);
    if (!data) return null;
    return JSON.parse(data);
  }
  const data = await SecureStore.getItemAsync(LR);
  if (!data) return null;
  return JSON.parse(data);
}

export async function clearLastRoom() {
  if (isWeb()) {
    localStorage.removeItem(LR);
  } else {
    await SecureStore.deleteItemAsync(LR);
  }
}
