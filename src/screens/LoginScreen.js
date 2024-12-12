// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TextInput, TouchableOpacity, Image } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import * as AuthSession from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GITHUB_CLIENT_ID, GITHUB_REDIRECT_URI } from '@env';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GITHUB_CLIENT_ID,
      scopes: ['read:user', 'user:email', 'repo'],
      redirectUri: AuthSession.makeRedirectUri({ scheme: 'todolistmobileapp' }),
      usePKCE: true,
    },
    {
      authorizationEndpoint: 'https://github.com/login/oauth/authorize',
      tokenEndpoint: 'https://github.com/login/oauth/access_token',
    }
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code);
    }
  }, [response]);

  const exchangeCodeForToken = async (code) => {
    try {
      const clientId = GITHUB_CLIENT_ID;
      const codeVerifier = request.codeVerifier;
      const url = 'https://github.com/login/oauth/access_token';

      const params = {
        client_id: clientId,
        code,
        code_verifier: codeVerifier,
        redirectUri: AuthSession.makeRedirectUri({ scheme: 'todolistmobileapp' }),
      };

      const formBody = Object.keys(params)
        .map((key) => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
        .join('&');

      const tokenResponse = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
      });

      const data = await tokenResponse.json();

      if (data.access_token) {
        await AsyncStorage.setItem('githubAccessToken', data.access_token);

        Alert.alert('Sukces', 'Zalogowano przez GitHub!');
        // Nie nawigujemy ręcznie do Main, App.js zrobi to sam gdy user będzie zalogowany
      } else {
        Alert.alert('Błąd', 'Nie udało się uzyskać tokenu dostępu.');
      }
    } catch (error) {
      console.error('Error exchanging code for token:', error);
      Alert.alert('Błąd', 'Logowanie przez GitHub nie powiodło się.');
    }
  };

  const loginUser = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
        // Po zalogowaniu user się zmieni, App.js przełączy na Main
      })
      .catch((error) => alert(error.message));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={require('../../assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />

      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        placeholder="Email"
        placeholderTextColor={colors.placeholder || '#888'}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        placeholder="Hasło"
        placeholderTextColor={colors.placeholder || '#888'}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button mode="contained" onPress={loginUser} style={styles.button}>
        Zaloguj się
      </Button>

      <View style={styles.separator} />

      <Button
        mode="outlined"
        onPress={() => {
          promptAsync();
        }}
        style={styles.button}
      >
        Zaloguj się przez GitHub
      </Button>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={[styles.registerText, { color: colors.primary }]}>
          Nie masz konta? Zarejestruj się.
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 150,
    alignSelf: 'center',
    marginBottom: 30,
  },
  input: {
    height: 50,
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  separator: {
    height: 20,
  },
  button: {
    marginBottom: 10,
  },
  registerText: {
    marginTop: 20,
    textAlign: 'center',
  },
});
