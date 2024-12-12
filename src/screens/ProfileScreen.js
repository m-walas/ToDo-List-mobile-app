// src/screens/ProfileScreen.js
import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Text, Button, Avatar, useTheme, TextInput, Switch, List } from 'react-native-paper';
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
      console.log('pickImage function called');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      console.log('Image picker result:', result);

      if (!result.canceled) {
        const selectedImageUri = result.assets[0].uri;
        console.log('Selected image URI:', selectedImageUri);
        setAvatar(selectedImageUri);
        await uploadAvatar(selectedImageUri);
      }
    } catch (error) {
      console.error('Error in pickImage:', error);
      Alert.alert('Błąd', 'Nie udało się otworzyć galerii.');
    }
  };

  const uploadAvatar = async (uri) => {
    try {
      console.log('Uploading avatar:', uri);
      const response = await fetch(uri);
      const blob = await response.blob();
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

  const onToggleSwitch = () => {
    setIsSwitchOn(!isSwitchOn);
    toggleTheme();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileSection}>
          {avatar ? (
            <Avatar.Image size={120} source={{ uri: avatar }} />
          ) : (
            <Avatar.Icon size={120} icon="account" />
          )}
          <Button
            onPress={pickImage}
            style={styles.avatarButton}
            mode="outlined"
            color={colors.primary}
            uppercase={false}
            labelStyle={{ fontSize: 14 }}
          >
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
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarButton: {
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  infoSection: {
    width: '100%',
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
    marginBottom: 40,
  },
  listItem: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
  },
  logoutButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 25,
    borderColor: '#B00020',
  },
});
