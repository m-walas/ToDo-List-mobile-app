// src/components/TaskModal.js

import React, { useState, useEffect } from 'react';
import { StyleSheet, Alert, Platform } from 'react-native';
import { Button, useTheme, Modal, Portal, TextInput } from 'react-native-paper';
import { doc, updateDoc, deleteDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';

export default function TaskModal({ route, navigation }) {
  const { colors } = useTheme();
  const { taskId } = route.params;

  if (!taskId) {
    Alert.alert('Błąd', 'Brak identyfikatora zadania.');
    navigation.goBack();
    return null;
  }

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    const taskRef = doc(db, 'tasks', taskId);
    const unsubscribeTask = onSnapshot(taskRef, (docSnap) => {
      if (docSnap.exists()) {
        const task = docSnap.data();
        setTitle(task.text);
        setDescription(task.description || '');
        setDeadline(task.deadline ? task.deadline.toDate() : null);
        setSelectedBoard(task.boardId || '');
      } else {
        Alert.alert('Błąd', 'Zadanie nie istnieje.');
        navigation.goBack();
      }
    });

    const boardsRef = collection(db, 'boards');
    const q = query(boardsRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeBoards = onSnapshot(q, (querySnapshot) => {
      const fetchedBoards = [];
      querySnapshot.forEach((doc) => {
        fetchedBoards.push({ id: doc.id, ...doc.data() });
      });
      setBoards(fetchedBoards);
    });

    return () => {
      unsubscribeTask();
      unsubscribeBoards();
    };
  }, [taskId, navigation]);

  const saveChanges = async () => {
    if (title.trim() === '') {
      Alert.alert('Błąd', 'Proszę podać tytuł zadania.');
      return;
    }
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        text: title,
        description,
        deadline,
        boardId: selectedBoard,
      });
      navigation.goBack();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Błąd', 'Nie udało się zaktualizować zadania.');
    }
  };

  const deleteTask = async () => {
    Alert.alert(
      'Usuń Zadanie',
      'Czy na pewno chcesz usunąć to zadanie?',
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              const taskRef = doc(db, 'tasks', taskId);
              await deleteDoc(taskRef);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Błąd', 'Nie udało się usunąć zadania.');
            }
          },
        },
      ],
      { cancelable: true }
    );
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
    <Portal>
      <Modal visible={true} onDismiss={() => navigation.goBack()} contentContainerStyle={[styles.container, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
          placeholder="Tytuł zadania"
          placeholderTextColor={colors.placeholder || '#888'}
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
          placeholder="Opis"
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
        {boards.length > 0 && (
          <Picker
            selectedValue={selectedBoard}
            onValueChange={(itemValue) => setSelectedBoard(itemValue)}
            style={{ color: colors.text }}
          >
            <Picker.Item label="Wybierz Tablicę" value="" />
            {boards.map((board) => (
              <Picker.Item label={board.name} value={board.id} key={board.id} />
            ))}
          </Picker>
        )}
        <Button
          mode="contained"
          onPress={saveChanges}
          style={styles.button}
          color={colors.primary}
        >
          Zapisz zmiany
        </Button>
        <Button
          mode="text"
          onPress={deleteTask}
          style={styles.button}
          color="red"
        >
          Usuń zadanie
        </Button>
        <Button
          onPress={() => navigation.goBack()}
          style={styles.button}
          color={colors.primary}
        >
          Anuluj
        </Button>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
  },
  input: {
    borderBottomWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  button: {
    marginTop: 10,
  },
});
