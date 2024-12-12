// src/screens/ProfileScreen.js
import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Avatar, useTheme, TextInput } from 'react-native-paper';
import { auth, db, storage } from '../firebase';
import ThemeContext from '../contexts/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UnsubContext } from '../contexts/UnsubContext';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { isDarkTheme, toggleTheme } = React.useContext(ThemeContext);
  const { clearUnsubs } = React.useContext(UnsubContext);

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setName(userData.name || '');
          setSurname(userData.surname || '');
          setAvatar(userData.avatar || null);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    fetchUserProfile();
  }, []);

  const pickImage = async () => {
    try {
      console.log('pickImage function called'); // Log wywołania
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Użyj MediaTypeOptions, jeśli inne opcje nie działają
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
  
      console.log('Image picker result:', result); // Log wyniku
  
      if (!result.canceled) {
        const selectedImageUri = result.assets[0].uri; // Pobierz URI obrazu
        console.log('Selected image URI:', selectedImageUri);
        setAvatar(selectedImageUri);
        await uploadAvatar(selectedImageUri);
      }
    } catch (error) {
      console.error('Error in pickImage:', error); // Log błędu
      Alert.alert('Błąd', 'Nie udało się otworzyć galerii.');
    }
  };
  

  const uploadAvatar = async (uri) => {
    try {
      console.log('Uploading avatar:', uri);
      const response = await fetch(uri); // Pobierz obraz z URI
      const blob = await response.blob(); // Konwertuj obraz na blob
      const storageRef = ref(storage, `avatars/${auth.currentUser.uid}`);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL:', downloadURL);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { avatar: downloadURL });
      Alert.alert('Sukces', 'Awatar został zaktualizowany.');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Błąd', 'Nie udało się załadować awatara.');
    }
  };
  

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
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.profileSection}>
        {avatar ? (
          <Avatar.Image size={100} source={{ uri: avatar }} />
        ) : (
          <Avatar.Icon size={100} icon="account" />
        )}
        <Button onPress={pickImage} style={styles.avatarButton} mode="outlined" color={colors.primary}>
          Zmień awatar
        </Button>
      </View>

      <View style={styles.infoSection}>
        <TextInput
          label="Imię"
          value={name}
          onChangeText={setName}
          style={styles.input}
          mode="outlined"
          theme={{ colors: { primary: colors.primary } }}
        />
        <TextInput
          label="Nazwisko"
          value={surname}
          onChangeText={setSurname}
          style={styles.input}
          mode="outlined"
          theme={{ colors: { primary: colors.primary } }}
        />
        <Button mode="contained" onPress={saveProfile} style={styles.saveButton} color={colors.primary}>
          Zapisz profil
        </Button>
      </View>

      <View style={styles.settingsSection}>
        <Text style={[styles.settingText, { color: colors.text }]}>Motyw</Text>
        <Button mode="contained" onPress={toggleTheme} style={styles.themeButton} color={colors.primary}>
          {isDarkTheme ? 'Przełącz na Jasny' : 'Przełącz na Ciemny'}
        </Button>
      </View>

      <Button mode="outlined" onPress={logout} style={styles.logoutButton} color="red">
        Wyloguj się
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarButton: {
    marginTop: 10,
  },
  infoSection: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  saveButton: {
    marginTop: 10,
  },
  settingsSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingText: {
    fontSize: 18,
    marginBottom: 10,
  },
  themeButton: {
    width: '100%',
  },
  logoutButton: {
    width: '100%',
  },
});
