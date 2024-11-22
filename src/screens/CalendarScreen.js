// src/screens/CalendarScreen.js

import React, { useState, useEffect, memo } from 'react';
import { 
  View, 
  StyleSheet, 
  Alert, 
  Platform, 
  UIManager, 
  ActivityIndicator, 
  FlatList, 
  TouchableOpacity 
} from 'react-native';
import { Text, useTheme, FAB, Portal, Modal, List, Button } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TaskItem = memo(({ item, onPress }) => (
  <TouchableOpacity style={[styles.taskItem, { backgroundColor: item.color }]} onPress={onPress}>
    <Text style={styles.taskText}>{item.name}</Text>
  </TouchableOpacity>
));

export default function CalendarScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState({});
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [availableBoards, setAvailableBoards] = useState([]);

  useEffect(() => {
    const boardsRef = collection(db, 'boards');
    const qBoards = query(boardsRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeBoards = onSnapshot(qBoards, (querySnapshot) => {
      const fetchedBoards = [];
      querySnapshot.forEach((doc) => {
        fetchedBoards.push({ id: doc.id, ...doc.data() });
      });
      setBoards(fetchedBoards);
      setAvailableBoards(fetchedBoards);
    });

    return () => {
      unsubscribeBoards();
    };
  }, []);

  useEffect(() => {
    const tasksRef = collection(db, 'tasks');
    const qTasks = query(tasksRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeTasks = onSnapshot(qTasks, (querySnapshot) => {
      const newTasks = {};
      const datesSet = new Set();

      querySnapshot.forEach((doc) => {
        const task = doc.data();
        if (!task.deadline || !task.boardId) return;

        const board = boards.find((b) => b.id === task.boardId);
        if (!board) return;

        const color = board.color || colors.primary;

        let date;
        try {
          if (typeof task.deadline.toDate === 'function') {
            // Firestore Timestamp
            date = task.deadline.toDate().toISOString().split('T')[0];
          } else if (task.deadline instanceof Date) {
            // JavaScript Date
            date = task.deadline.toISOString().split('T')[0];
          } else if (typeof task.deadline === 'string') {
            // String date
            date = new Date(task.deadline).toISOString().split('T')[0];
          } else {
            throw new Error('Unknown deadline format');
          }
        } catch (error) {
          console.warn(`Błąd konwersji daty dla zadania ID: ${doc.id}`, error);
          return;
        }

        if (date) {
          if (!newTasks[date]) {
            newTasks[date] = [];
          }

          newTasks[date].push({
            id: doc.id,
            name: task.text || 'Brak nazwy',
            color: color || '#0366d6',
          });

          datesSet.add(date);
        }
      });

      const marks = {};
      datesSet.forEach((date) => {
        marks[date] = { marked: true, dotColor: colors.primary };
      });
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary };

      setMarkedDates(marks);
      setTasks(newTasks);
      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
    };
  }, [boards, colors.primary, selectedDate]);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setMarkedDates(prevMarks => ({
      ...prevMarks,
      [day.dateString]: { ...prevMarks[day.dateString], selected: true, selectedColor: colors.primary },
      [selectedDate]: { ...prevMarks[selectedDate], selected: false, selectedColor: colors.primary },
    }));
  };

  const openMoveModal = (taskId) => {
    setSelectedTaskId(taskId);
    setMoveModalVisible(true);
  };

  const moveTask = async (newBoardId) => {
    try {
      const taskRef = doc(db, 'tasks', selectedTaskId);
      await updateDoc(taskRef, {
        boardId: newBoardId,
      });
      setMoveModalVisible(false);
      setSelectedTaskId(null);
      Alert.alert('Sukces', 'Zadanie zostało przeniesione.');
    } catch (error) {
      console.error('Error moving task:', error);
      Alert.alert('Błąd', 'Nie udało się przenieść zadania.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Calendar
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType={'multi-dot'}
        style={styles.calendar}
        theme={{
          selectedDayBackgroundColor: colors.primary,
          todayTextColor: colors.primary,
          dotColor: colors.primary,
          selectedDotColor: colors.accent,
          agendaDayTextColor: colors.text,
          agendaKnobColor: colors.primary,
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.text,
          dayTextColor: colors.text,
          textDisabledColor: '#d9e1e8',
          selectedDayTextColor: colors.background,
          monthTextColor: colors.text,
        }}
      />

      <FlatList
        data={tasks[selectedDate] || []}
        renderItem={({ item }) => (
          <TaskItem 
            item={item} 
            onPress={() => navigation.navigate('TaskModal', { taskId: item.id })}
          />
        )}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyDate}>
            <Text style={{ color: colors.text }}>Brak zadań na ten dzień.</Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        small
        icon="plus"
        onPress={() => navigation.navigate('AddTaskScreen', { boardId: null })}
        label="Dodaj Zadanie"
      />

      <Portal>
        <Modal 
          visible={moveModalVisible} 
          onDismiss={() => setMoveModalVisible(false)} 
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Przenieś Zadanie</Text>
          <FlatList
            data={availableBoards}
            renderItem={({ item }) => (
              <List.Item
                key={item.id}
                title={item.name}
                left={() => <List.Icon icon="folder" color={item.color || colors.primary} />}
                onPress={() => moveTask(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ maxHeight: '70%' }}
          />
          <Button onPress={() => setMoveModalVisible(false)} style={styles.modalButton}>
            Anuluj
          </Button>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendar: {
    margin: 10,
  },
  taskItem: {
    padding: 10,
    marginVertical: 4,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  taskText: {
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalButton: {
    marginTop: 10,
  },
  emptyDate: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex:1,
    justifyContent:'center',
    alignItems:'center',
  }
});
