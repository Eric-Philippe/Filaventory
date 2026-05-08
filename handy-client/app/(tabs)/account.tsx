import { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, Alert, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type User, updateStoredUser } from '../../src/api/client';
import { colors } from '../../src/theme';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'JPY'];

export default function AccountScreen() {
  const qc = useQueryClient();
  const [profileForm, setProfileForm] = useState({ email: '', username: '', currency: '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [apiKey, setApiKey] = useState('');

  const { data: user, isLoading } = useQuery({
    queryKey: ['account'],
    queryFn: () => api.account.get(),
  });

  const updateProfile = useMutation({
    mutationFn: () =>
      api.account.update({
        email: profileForm.email || undefined,
        username: profileForm.username || undefined,
        currency: profileForm.currency || undefined,
      }),
    onSuccess: async (result) => {
      if ('error' in result) { Alert.alert('Error', result.error); return; }
      await updateStoredUser(result.data as User);
      qc.invalidateQueries({ queryKey: ['account'] });
      qc.invalidateQueries({ queryKey: ['storedUser'] });
      setProfileMsg('Saved!');
      setProfileForm({ email: '', username: '', currency: '' });
      setTimeout(() => setProfileMsg(''), 2500);
    },
  });

  const updatePassword = useMutation({
    mutationFn: () => api.account.updatePassword(pwForm.current, pwForm.next),
    onSuccess: (result) => {
      if ('error' in result) { Alert.alert('Error', result.error); return; }
      setPwMsg('Password changed!');
      setPwForm({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwMsg(''), 2500);
    },
  });

  const generateApiKey = useMutation({
    mutationFn: () => api.account.generateApiKey(),
    onSuccess: (res) => setApiKey(res.api_key),
  });

  const handlePassword = () => {
    if (pwForm.next !== pwForm.confirm) { Alert.alert('Error', 'Passwords do not match'); return; }
    if (pwForm.next.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters'); return; }
    updatePassword.mutate();
  };

  const handleGenerateKey = () => {
    Alert.alert('Generate API key', 'The previous key will stop working.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Generate', onPress: () => generateApiKey.mutate() },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-deep-purple items-center justify-center" edges={['top']}>
        <ActivityIndicator color={colors.lightBlue} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-deep-purple" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-12">
        <View className="pt-2 pb-4">
          <Text className="text-white font-semibold text-xl">Account</Text>
        </View>

        {/* Current profile */}
        <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 flex-row items-center gap-3">
          <View className="w-12 h-12 rounded-full bg-dark-teal/50 border border-light-blue/30 items-center justify-center">
            <Text className="text-light-blue font-semibold text-lg uppercase">
              {user?.username?.[0] ?? '?'}
            </Text>
          </View>
          <View>
            <Text className="text-white/80 font-medium">{user?.username}</Text>
            <Text className="text-white/40 text-sm">{user?.email}</Text>
            <Text className="text-white/30 text-xs mt-0.5">Currency: {user?.currency ?? 'USD'}</Text>
          </View>
        </View>

        {/* Edit profile */}
        <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">Edit profile</Text>

          {!!profileMsg && (
            <View className="bg-vibrant-green/10 border border-vibrant-green/20 rounded-xl px-3 py-2 mb-3">
              <Text className="text-vibrant-green text-sm">{profileMsg}</Text>
            </View>
          )}

          <Text className="text-white/40 text-xs mb-1">New email</Text>
          <TextInput
            value={profileForm.email}
            onChangeText={(v) => setProfileForm((p) => ({ ...p, email: v }))}
            placeholder={user?.email}
            placeholderTextColor="rgba(255,255,255,0.15)"
            autoCapitalize="none"
            keyboardType="email-address"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm mb-3"
          />

          <Text className="text-white/40 text-xs mb-1">New username</Text>
          <TextInput
            value={profileForm.username}
            onChangeText={(v) => setProfileForm((p) => ({ ...p, username: v }))}
            placeholder={user?.username}
            placeholderTextColor="rgba(255,255,255,0.15)"
            autoCapitalize="none"
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm mb-3"
          />

          <Text className="text-white/40 text-xs mb-1">Currency</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {CURRENCIES.map((c) => {
              const active = (profileForm.currency || user?.currency || 'USD') === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => setProfileForm((p) => ({ ...p, currency: c }))}
                  className={`px-3 py-1.5 rounded-lg border ${active ? 'border-light-blue/50 bg-light-blue/10' : 'border-white/10'}`}
                >
                  <Text className={active ? 'text-light-blue text-sm' : 'text-white/40 text-sm'}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="bg-vibrant-orange rounded-xl py-3 items-center active:opacity-80"
          >
            <Text className="text-white font-semibold">
              {updateProfile.isPending ? 'Saving…' : 'Save profile'}
            </Text>
          </Pressable>
        </View>

        {/* Change password */}
        <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
          <Text className="text-white/50 text-xs uppercase tracking-wider mb-3">Change password</Text>

          {!!pwMsg && (
            <View className="bg-vibrant-green/10 border border-vibrant-green/20 rounded-xl px-3 py-2 mb-3">
              <Text className="text-vibrant-green text-sm">{pwMsg}</Text>
            </View>
          )}

          {(['current', 'next', 'confirm'] as const).map((k) => (
            <TextInput
              key={k}
              value={pwForm[k]}
              onChangeText={(v) => setPwForm((p) => ({ ...p, [k]: v }))}
              placeholder={k === 'current' ? 'Current password' : k === 'next' ? 'New password' : 'Confirm new password'}
              placeholderTextColor="rgba(255,255,255,0.2)"
              secureTextEntry
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white text-sm mb-3"
            />
          ))}

          <Pressable
            onPress={handlePassword}
            disabled={updatePassword.isPending}
            className="bg-white/10 rounded-xl py-3 items-center active:opacity-80"
          >
            <Text className="text-white font-medium">
              {updatePassword.isPending ? 'Changing…' : 'Change password'}
            </Text>
          </Pressable>
        </View>

        {/* RFID API key */}
        <View className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <Text className="text-white/50 text-xs uppercase tracking-wider mb-1">RFID device API key</Text>
          <Text className="text-white/30 text-xs mb-3">
            Used by scales and readers via X-API-Key header.
          </Text>

          {!!apiKey && (
            <View className="bg-deep-purple/60 border border-light-blue/20 rounded-xl px-3 py-3 mb-3">
              <Text className="text-white/40 text-xs mb-1">Copy now — won't be shown again:</Text>
              <Text className="text-light-blue text-xs font-mono" selectable>{apiKey}</Text>
            </View>
          )}

          <Pressable
            onPress={handleGenerateKey}
            disabled={generateApiKey.isPending}
            className="bg-white/8 border border-white/10 rounded-xl py-3 items-center active:opacity-80"
          >
            <Text className="text-white/60 font-medium">
              {generateApiKey.isPending ? 'Generating…' : 'Generate new API key'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
