// src/screens/ProfileScreen.js

import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Button, useTheme, TextInput, Switch, List } from 'react-native-paper';
import { auth, db } from '../firebase';
import ThemeContext from '../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UnsubContext } from '../contexts/UnsubContext';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { isDarkTheme, toggleTheme } = React.useContext(ThemeContext);
  const { clearUnsubs } = React.useContext(UnsubContext);

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [isSwitchOn, setIsSwitchOn] = useState(isDarkTheme);

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setName(userData.name || '');
          setSurname(userData.surname || '');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        Alert.alert('Błąd', 'Nie udało się pobrać danych użytkownika.');
      }
    };
    fetchUserProfile();
  }, []);

  const saveProfile = async () => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name,
        surname,
      });
      Alert.alert('Sukces', 'Profil został zaktualizowany.');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Błąd', 'Nie udało się zaktualizować profilu.');
    }
  };

  const logout = () => {
    Alert.alert(
      'Wyloguj się',
      'Czy na pewno chcesz się wylogować?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj się',
          onPress: async () => {
            try {
              clearUnsubs();
              await auth.signOut();
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Błąd', 'Nie udało się wylogować.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const onToggleSwitch = () => {
    setIsSwitchOn(!isSwitchOn);
    toggleTheme();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <Text style={[styles.title, { color: colors.text }]}>GitHub ToDo List</Text>

        <View style={styles.infoSection}>
          <TextInput
            label="Imię"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary, background: colors.surface } }}
            outlineColor={colors.primary}
            activeOutlineColor={colors.primary}
          />
          <TextInput
            label="Nazwisko"
            value={surname}
            onChangeText={setSurname}
            style={styles.input}
            mode="outlined"
            theme={{ colors: { primary: colors.primary, background: colors.surface } }}
            outlineColor={colors.primary}
            activeOutlineColor={colors.primary}
          />
          <Button
            mode="contained"
            onPress={saveProfile}
            style={styles.saveButton}
            color={colors.primary}
            uppercase={false}
            labelStyle={{ fontSize: 16 }}
          >
            Zapisz profil
          </Button>
        </View>

        <View style={styles.settingsSection}>
          <List.Item
            title="Motyw"
            description={isDarkTheme ? 'Ciemny' : 'Jasny'}
            left={() => <List.Icon icon="theme-light-dark" color={colors.primary} />}
            right={() => (
              <Switch value={isDarkTheme} onValueChange={onToggleSwitch} color={colors.primary} />
            )}
            style={styles.listItem}
          />
        </View>

        <Button
          mode="outlined"
          onPress={logout}
          style={styles.logoutButton}
          color="#B00020"
          uppercase={false}
          labelStyle={{ fontSize: 16 }}
        >
          Wyloguj się
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 30,
    marginBottom: 30,
    textAlign: 'center',
  },
  infoSection: {
    width: '100%',
    marginTop: 70,
    marginBottom: 40,
  },
  input: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  saveButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 25,
  },
  settingsSection: {
    width: '100%',
    marginTop: 150,
    marginBottom: 0,
  },
  listItem: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
  },
  logoutButton: {
    width: '100%',
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 25,
    borderColor: '#B00020',
  },
});
