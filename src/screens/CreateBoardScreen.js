// src/screens/CreateBoardScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, FlatList } from 'react-native';
import { Text, TextInput, Button, useTheme, Dialog, Portal } from 'react-native-paper';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

export default function CreateBoardScreen({ navigation }) {
  const { colors } = useTheme();
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [dialogVisible, setDialogVisible] = useState(false);


  const createBoard = async () => {
    if (name.trim() === '') {
      Alert.alert('Błąd', 'Proszę podać nazwę tablicy.');
      return;
    }
  
    if (!auth.currentUser) {
      Alert.alert('Błąd', 'Użytkownik nie jest zalogowany.');
      return;
    }

    try {
      console.log('Creating board in Firestore...');
      await addDoc(collection(db, 'boards'), {
        name,
        color,
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
      <Text style={[styles.label, { color: colors.text }]}>Nazwa tablicy</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        placeholder="Wpisz nazwę tablicy"
        placeholderTextColor={colors.placeholder || '#888'}
        value={name}
        onChangeText={setName}
      />

      <Text style={[styles.label, { color: colors.text }]}>Kolor tablicy</Text>
      <TouchableOpacity onPress={() => setDialogVisible(true)} style={[styles.colorPreview, { backgroundColor: color }]} />

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title style={{ color: colors.text }}>Wybierz kolor</Dialog.Title>
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

      <Button mode="contained" onPress={createBoard} style={styles.button} color={colors.primary}>
        Stwórz tablicę
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
  button: {
    marginTop: 20,
  },
});
