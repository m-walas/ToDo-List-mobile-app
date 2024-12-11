// src/screens/CreateBoardScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Alert, FlatList } from 'react-native';
import { Text, TextInput, Button, useTheme, Dialog, Portal } from 'react-native-paper';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db, storage } from '../firebase';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

export default function CreateBoardScreen({ navigation }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [coverImage, setCoverImage] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.cancelled) {
      setCoverImage(result.uri);
    }
  };

  const createBoard = async () => {
    if (name.trim() === '') {
      Alert.alert('Błąd', 'Proszę podać nazwę tablicy.');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Błąd', 'Użytkownik nie jest zalogowany.');
      return;
    }

    let coverImageURL = null;
    if (coverImage) {
      try {
        const response = await fetch(coverImage);
        const blob = await response.blob();
        const storageRef = ref(storage, `boardCovers/${auth.currentUser.uid}/${Date.now()}`);
        await uploadBytes(storageRef, blob);
        coverImageURL = await getDownloadURL(storageRef);
      } catch (error) {
        console.error('Error uploading cover image:', error);
        Alert.alert('Błąd', 'Nie udało się załadować obrazu.');
        return;
      }
    }

    try {
      await addDoc(collection(db, 'boards'), {
        name,
        color,
        coverImage: coverImageURL,
        userId: auth.currentUser.uid,
      });
      Alert.alert('Sukces', 'Tablica została stworzona.');
      navigation.goBack();
    } catch (error) {
      console.error('Error creating board:', error);
      Alert.alert('Błąd', 'Nie udało się stworzyć tablicy.');
    }
  };

  const renderColorOption = ({ item }) => (
    <TouchableOpacity
      style={[styles.colorOption, { backgroundColor: item }]}
      onPress={() => {
        setColor(item);
        setDialogVisible(false);
      }}
    >
      {color === item && <View style={styles.selectedIndicator} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>Nazwa Tablicy</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        placeholder="Wpisz nazwę tablicy"
        placeholderTextColor={colors.placeholder || '#888'}
        value={name}
        onChangeText={setName}
      />

      <Text style={[styles.label, { color: colors.text }]}>Kolor Tablicy</Text>
      <TouchableOpacity onPress={() => setDialogVisible(true)} style={[styles.colorPreview, { backgroundColor: color }]} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title style={{ color: colors.text }}>Wybierz Kolor</Dialog.Title>
          <Dialog.Content style={{ backgroundColor: colors.surface }}>
            <FlatList
              data={COLORS}
              renderItem={renderColorOption}
              keyExtractor={(item) => item}
              numColumns={4}
              contentContainerStyle={styles.colorsContainer}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)} color={colors.primary}>Anuluj</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Text style={[styles.label, { color: colors.text }]}>Okładka Tablicy</Text>
      <TouchableOpacity onPress={pickImage} style={styles.imagePicker}>
        {coverImage ? (
          <Image source={{ uri: coverImage }} style={styles.coverImage} />
        ) : (
          <Text style={{ color: colors.placeholder || '#888' }}>Wybierz Obraz</Text>
        )}
      </TouchableOpacity>

      <Button mode="contained" onPress={createBoard} style={styles.button} color={colors.primary}>
        Stwórz Tablicę
      </Button>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  colorPreview: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 4,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  colorsContainer: {
    justifyContent: 'center',
  },
  imagePicker: {
    width: '100%',
    height: 150,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  button: {
    marginTop: 20,
  },
});
