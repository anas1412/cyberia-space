import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TK = 'cyberia_token';
const UK = 'cyberia_userid';

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
