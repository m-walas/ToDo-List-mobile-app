// src/screens/CalendarScreen.js

import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  View, 
  FlatList 
} from 'react-native';
import { 
  Text, 
  FAB, 
  Portal, 
  Modal, 
  List, 
  Button, 
  useTheme 
} from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocaleConfig } from 'react-native-calendars';
import { useColorScheme } from 'react-native';

LocaleConfig.locales['pl'] = {
  monthNames: [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ],
  monthNamesShort: [
    'Sty', 'Lu', 'Mar', 'Kw', 'Maj', 'Cze',
    'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'
  ],
  dayNames: [
    'Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'
  ],
  dayNamesShort: ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'],
  today: 'Dziś'
};
LocaleConfig.defaultLocale = 'pl';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tasksForSelectedDate, setTasksForSelectedDate] = useState([]);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [availableBoards, setAvailableBoards] = useState([]);
  const [themeVersion, setThemeVersion] = useState(0);

  // console.log('Aktualny motyw:', colors);

  // Aktualizacja stanu przy zmianie schematu kolorów
  useEffect(() => {
    setThemeVersion(prev => prev + 1);
  }, [colorScheme]);

  // Pobierz tablice użytkownika
  useEffect(() => {
    const boardsRef = collection(db, 'boards');
    const qBoards = query(boardsRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeBoards = onSnapshot(qBoards, (querySnapshot) => {
      const fetchedBoards = [];
      querySnapshot.forEach((doc) => {
        fetchedBoards.push({ id: doc.id, ...doc.data() });
      });
      setAvailableBoards(fetchedBoards);
    });

    return () => {
      unsubscribeBoards();
    };
  }, []);

  // Pobierz zadania użytkownika
  useEffect(() => {
    const tasksRef = collection(db, 'tasks');
    const qTasks = query(tasksRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeTasks = onSnapshot(qTasks, (querySnapshot) => {
      const fetchedTasks = [];

      querySnapshot.forEach((docSnap) => {
        const task = docSnap.data();
        if (!task.deadline || !task.boardId || task.isCompleted) return;

        const board = availableBoards.find((b) => b.id === task.boardId);
        if (!board) return;

        let date;
        try {
          if (typeof task.deadline.toDate === 'function') {
            // Timestamp Firestore
            date = task.deadline.toDate().toISOString().split('T')[0];
          } else if (task.deadline instanceof Date) {
            // JavaScript Date
            date = task.deadline.toISOString().split('T')[0];
          } else if (typeof task.deadline === 'string') {
            // String
            date = new Date(task.deadline).toISOString().split('T')[0];
          } else {
            throw new Error('Nieznany format daty deadline');
          }
        } catch (error) {
          console.warn(`Błąd przy konwersji daty dla zadania ID: ${docSnap.id}`, error);
          return;
        }

        if (date) {
          fetchedTasks.push({
            id: docSnap.id,
            name: task.text || 'Brak nazwy',
            color: board.color || colors.primary,
            description: task.description || '',
            boardName: board.name || 'Brak nazwy tablicy',
            deadline: date
          });
        }
      });

      setTasks(fetchedTasks);
      setLoading(false);
    });

    return () => {
      unsubscribeTasks();
    };
  }, [availableBoards, colors]);

  // Memoizacja oznaczonych dat
  const markedDates = useMemo(() => {
    const dates = {};

    tasks.forEach(task => {
      if (!dates[task.deadline]) {
        dates[task.deadline] = { dots: [] };
      }
      dates[task.deadline].dots.push({ color: task.color });
    });

    // Dzisiejsza data wyróżniona
    const today = new Date().toISOString().split('T')[0];
    dates[today] = {
      ...(dates[today] || {}),
      selected: true,
      selectedColor: colors.primary,
      selectedTextColor: colors.background,
    };

    return dates;
  }, [tasks, colors]);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const tasksForDay = tasks.filter(task => task.deadline === day.dateString);
    setTasksForSelectedDate(tasksForDay);
  };

  const moveTaskHandler = async (newBoardId) => {
    try {
      const taskRef = doc(db, 'tasks', selectedTaskId);
      await updateDoc(taskRef, {
        boardId: newBoardId,
      });
      setMoveModalVisible(false);
      setSelectedTaskId(null);
      Alert.alert('Sukces', 'Zadanie zostało przeniesione.');
    } catch (error) {
      console.error('Błąd przy przenoszeniu zadania:', error);
      Alert.alert('Błąd', 'Nie udało się przenieść zadania.');
    }
  };

  const openMoveModal = (taskId) => {
    setSelectedTaskId(taskId);
    setMoveModalVisible(true);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Calendar
        key={`${colors.background}-${themeVersion}`}
        onDayPress={onDayPress}
        markingType={'multi-dot'}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: colors.primary,
          todayTextColor: colors.primary,
          dotColor: colors.primary,
          selectedDotColor: colors.primary,
          agendaDayTextColor: colors.text,
          agendaKnobColor: colors.primary,
          calendarBackground: colors.background,
          backgroundColor: colors.background,
          textSectionTitleColor: colors.text,
          dayTextColor: colors.text,
          textDisabledColor: colors.disabled || '#d9e1e8',
          selectedDayTextColor: colors.background,
          monthTextColor: colors.text,
          arrowColor: colors.primary,
          indicatorColor: colors.primary,
          textDayFontFamily: 'Roboto',
          textMonthFontFamily: 'Roboto',
          textDayHeaderFontFamily: 'Roboto',
          textDayFontWeight: '400',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '400',
        }}
        style={styles.calendar}
      />

      {selectedDate && (
        <View style={styles.tasksContainer}>
          <Text style={[styles.dateText, { color: colors.text }]}>
            Zadania na {selectedDate}:
          </Text>
          {tasksForSelectedDate.length === 0 ? (
            <Text style={{ color: colors.text }}>Brak zadań na ten dzień.</Text>
          ) : (
            <FlatList
              data={tasksForSelectedDate}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[
                  styles.taskCard, 
                  { 
                    borderLeftColor: item.color, 
                    backgroundColor: colors.surface 
                  }
                ]}>
                  <View style={styles.taskHeader}>
                    <Text style={[styles.taskName, { color: colors.text }]}>{item.name}</Text>
                    <TouchableOpacity onPress={() => openMoveModal(item.id)}>
                      <Text style={[styles.moveText, { color: colors.primary }]}>Przenieś</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.taskDescription, { color: colors.text }]}>
                    {item.description || 'Brak opisu.'}
                  </Text>
                  <Text style={[styles.boardName, { color: colors.text }]}>
                    Tablica: {item.boardName}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      )}

      <FAB
        style={[styles.fab, { backgroundColor: colors.primary }]}
        small
        icon="plus"
        onPress={() => navigation.navigate('AddTaskScreen', { boardId: null })}
        label="Dodaj zadanie"
      />

      <Portal>
        <Modal 
          visible={moveModalVisible} 
          onDismiss={() => setMoveModalVisible(false)} 
          contentContainerStyle={[styles.modalContainer, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.modalTitle, { color: colors.text }]}>Przenieś Zadanie</Text>
          <FlatList
            data={availableBoards}
            renderItem={({ item }) => (
              <List.Item
                key={item.id}
                title={item.name}
                titleStyle={{ color: colors.text }}
                left={() => <List.Icon icon="folder" color={item.color || colors.primary} />}
                onPress={() => moveTaskHandler(item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ maxHeight: '70%' }}
          />
          <Button 
            onPress={() => setMoveModalVisible(false)} 
            style={styles.modalButton}
            color={colors.primary}
          >
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
  loadingContainer: {
    flex:1,
    justifyContent:'center',
    alignItems:'center',
  },
  calendar: {
    marginBottom: 10,
  },
  tasksContainer: {
    flex: 1,
    padding: 10,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  taskCard: {
    borderLeftWidth: 5,
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  moveText: {
    fontSize: 14,
  },
  taskDescription: {
    fontSize: 14,
    marginTop: 5,
  },
  boardName: {
    fontSize: 12,
    marginTop: 5,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
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
});
