import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

export default function AddTaskScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { boardId: initialBoardId } = route.params || {};
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(initialBoardId || '');

  useEffect(() => {
    if (!auth.currentUser) return;

    const boardsRef = collection(db, 'boards');
    const q = query(boardsRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedBoards = [];
      querySnapshot.forEach((doc) => {
        fetchedBoards.push({ id: doc.id, ...doc.data() });
      });
      setBoards(fetchedBoards);
      if (!initialBoardId && fetchedBoards.length > 0) {
        setSelectedBoard(fetchedBoards[0].id); // Automatyczny wybór pierwszej tablicy
      }
    });

    return () => unsubscribe();
  }, [initialBoardId]);

  const createTask = async () => {
    if (title.trim() === '') {
      Alert.alert('Błąd', 'Proszę podać tytuł zadania.');
      return;
    }

    if (!selectedBoard) {
      Alert.alert('Błąd', 'Proszę wybrać tablicę.');
      return;
    }

    try {
      await addDoc(collection(db, 'tasks'), {
        text: title,
        description,
        deadline: deadline || null,
        boardId: selectedBoard,
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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false); // Zamknij picker
    if (selectedDate) {
      setDeadline(selectedDate); // Ustaw wybraną datę jako deadline
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

      <View style={styles.deadlineContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Deadline</Text>
        <Button onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
          {deadline ? deadline.toLocaleDateString() : 'Wybierz datę'}
        </Button>
        {showDatePicker && (
          <DateTimePicker
            value={deadline || new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Wybierz Tablicę</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedBoard}
          onValueChange={(itemValue) => setSelectedBoard(itemValue)}
          style={[styles.picker, { color: colors.text }]}
          dropdownIconColor={colors.text}
          mode="dropdown"
        >
          <Picker.Item label="Wybierz Tablicę" value="" />
          {boards.map((board) => (
            <Picker.Item label={board.name} value={board.id} key={board.id} />
          ))}
        </Picker>
      </View>

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
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  dateButton: {
    marginLeft: 10,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  picker: {
    width: '100%',
  },
});
