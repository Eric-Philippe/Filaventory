import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { initApi, getServerUrl, isAuthenticated } from '../src/api/client';
import { colors } from '../src/theme';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [target, setTarget] = useState<'/setup' | '/login' | '/(tabs)'>('/login');

  useEffect(() => {
    initApi()
      .then(() => {
        if (!getServerUrl()) {
          setTarget('/setup');
        } else if (!isAuthenticated()) {
          setTarget('/login');
        } else {
          setTarget('/(tabs)');
        }
      })
      .catch(() => {
        setTarget('/setup');
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.deepPurple, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.lightBlue} size="large" />
      </View>
    );
  }

  return <Redirect href={target} />;
}
