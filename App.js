import React from 'react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';

import BootScreen    from './src/screens/BootScreen';
import AuthScreen    from './src/screens/AuthScreen';
import MainTabs      from './src/screens/MainTabs';
import RoomScreen    from './src/screens/RoomScreen';
import DMScreen      from './src/screens/DMScreen';
import NewRoomScreen from './src/screens/NewRoomScreen';
import NewDMScreen   from './src/screens/NewDMScreen';
import InviteScreen  from './src/screens/InviteScreen';
import KickedScreen  from './src/screens/KickedScreen';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL ?? 'https://honorable-armadillo-17.eu-west-1.convex.cloud');
const Stack  = createNativeStackNavigator();

const linking = {
  prefixes: ['cyberia://', 'https://chat.cyberiaspace.app'],
  config: {
    screens: {
      Invite: 'invite/:roomId/:password?',
    },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ConvexProvider client={convex}>
        <AuthProvider>
          <StatusBar style="light" />
          <NavigationContainer linking={linking}>
            <Stack.Navigator
              initialRouteName="Boot"
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: { backgroundColor: '#050508' },
              }}
            >
              <Stack.Screen name="Boot"    component={BootScreen} />
              <Stack.Screen name="Auth"    component={AuthScreen} />
              <Stack.Screen name="Main"    component={MainTabs} />
              <Stack.Screen name="Room"    component={RoomScreen} />
              <Stack.Screen name="DM"      component={DMScreen} />
              <Stack.Screen name="NewRoom" component={NewRoomScreen} />
              <Stack.Screen name="NewDM"   component={NewDMScreen} />
              <Stack.Screen name="Invite"  component={InviteScreen} />
              <Stack.Screen name="Kicked"  component={KickedScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </ConvexProvider>
    </SafeAreaProvider>
  );
}
