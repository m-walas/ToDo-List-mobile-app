// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Image } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginUser = () => {
    signInWithEmailAndPassword(auth, email, password)
      .then(() => {
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
