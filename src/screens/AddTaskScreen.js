// src/screens/AddTaskScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddTaskScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { boardId } = route.params;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const createTask = async () => {
    if (title.trim() === '') {
      Alert.alert('Błąd', 'Proszę podać tytuł zadania.');
      return;
    }

    if (!boardId) {
      Alert.alert('Błąd', 'Brak wybranej tablicy. Przejdź z ekranu tablicy, aby wybrać tablicę.');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('Błąd', 'Użytkownik nie jest zalogowany.');
      return;
    }

    try {
      await addDoc(collection(db, 'tasks'), {
        text: title,
        description,
        deadline: deadline || null,
        boardId,
        userId: auth.currentUser.uid,
        isCompleted: false,
        isPrioritized: false,
        createdAt: new Date(),
      });
      Alert.alert('Sukces', 'Zadanie zostało dodane.');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Błąd', 'Nie udało się dodać zadania.');
    }
  };

  const onChangeDate = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.label, { color: colors.text }]}>Tytuł Zadania</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        placeholder="Wpisz tytuł zadania"
        placeholderTextColor={colors.placeholder || '#888'}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={[styles.label, { color: colors.text }]}>Opis</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
        placeholder="Wpisz opis zadania"
        placeholderTextColor={colors.placeholder || '#888'}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Button
        mode="outlined"
        onPress={() => setShowDatePicker(true)}
        style={styles.button}
      >
        {deadline ? `Deadline: ${deadline.toLocaleDateString()}` : 'Wybierz deadline'}
      </Button>

      {showDatePicker && (
        <DateTimePicker
          value={deadline || new Date()}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      <Button
        mode="contained"
        onPress={createTask}
        style={styles.button}
        color={colors.primary}
      >
        Dodaj Zadanie
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
  button: {
    marginTop: 20,
  },
});
