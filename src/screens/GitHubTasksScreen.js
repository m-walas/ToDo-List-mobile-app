import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { auth } from '../firebase';
import { GithubAuthProvider, signInWithCredential } from 'firebase/auth';
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from '@env';
import * as WebBrowser from 'expo-web-browser';

const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'todolistmobileapp' });

const GitHubTasksScreen = () => {
  const [githubToken, setGithubToken] = useState(null);

  const handleGitHubLogin = async () => {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&scope=repo`;
  
    const result = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);
    console.log('WebBrowser result:', result);
  
    if (result.type === 'success' && result.url) {
      const params = new URLSearchParams(result.url.split('?')[1]);
      const code = params.get('code');
  
      if (code) {
        // Wymień kod na token
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: REDIRECT_URI,
          }),
        });
  
        const data = await tokenResponse.json();
  
        if (data.access_token) {
          // Ustaw token GitHub i zaloguj do Firebase
          setGithubToken(data.access_token);
          const credential = GithubAuthProvider.credential(data.access_token);
          await signInWithCredential(auth, credential);
          Alert.alert('Success', 'You are now logged in with GitHub!');
        } else {
          Alert.alert('Error', 'Failed to retrieve access token');
        }
      }
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>GitHub Tasks</Text>
      <Button
        title="Login with GitHub"
        onPress={handleGitHubLogin}
        color="#0366d6"
      />
      {githubToken && (
        <Text style={styles.token}>Logged in! Token: {githubToken}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  token: {
    marginTop: 20,
    fontSize: 14,
    color: '#586069',
    textAlign: 'center',
  },
});

export default GitHubTasksScreen;