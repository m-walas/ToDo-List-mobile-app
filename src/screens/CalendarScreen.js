// src/screens/CalendarScreen.js

import React, { useState, useEffect, useMemo } from 'react';
import { 
  StyleSheet, 
  ActivityIndicator, 
  Alert, 
  TouchableOpacity, 
  View, 
  FlatList,
  Platform,
  Linking
} from 'react-native';
import { 
  Text, 
  FAB, 
  Portal, 
  Modal, 
  List, 
  Button, 
  useTheme,
  IconButton
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocaleConfig } from 'react-native-calendars';
import { useColorScheme } from 'react-native';
import * as CalendarExpo from 'expo-calendar';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

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
  const [calendarId, setCalendarId] = useState(null);

  useEffect(() => {
    setThemeVersion(prev => prev + 1);
  }, [colorScheme]);

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

  useEffect(() => {
    const tasksRef = collection(db, 'tasks');
    const qTasks = query(tasksRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeTasks = onSnapshot(qTasks, (querySnapshot) => {
      const fetchedTasks = [];

      querySnapshot.forEach((docSnap) => {
        const task = docSnap.data();
        // Filtrujemy tylko niedokończone zadania, posiadające deadline i przypisaną tablicę
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
            deadline: date,
            deadlineDate: new Date(task.deadline),
            notificationId: task.notificationId || null,
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

  // Uzyskanie lub stworzenie kalendarza po załadowaniu
  useEffect(() => {
    const setupCalendar = async () => {
      const id = await getDefaultCalendarId();
      setCalendarId(id);
    };
    setupCalendar();
  }, []);

  // Memoizacja oznaczonych dat
  const markedDates = useMemo(() => {
    const dates = {};

    tasks.forEach(task => {
      if (!dates[task.deadline]) {
        dates[task.deadline] = { dots: [] };
      }
      dates[task.deadline].dots.push({ color: task.color });
    });

    if (selectedDate) {
      dates[selectedDate] = {
        ...(dates[selectedDate] || {}),
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: colors.background,
      };
    }

    return dates;
  }, [tasks, colors, selectedDate]);

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const tasksForDay = tasks.filter(task => task.deadline === day.dateString);
    setTasksForSelectedDate(tasksForDay);
  };

  useFocusEffect(
    React.useCallback(() => {
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
      const tasksForDay = tasks.filter(task => task.deadline === today);
      setTasksForSelectedDate(tasksForDay);
    }, [tasks])
  );

  const moveTaskHandler = async (newBoardId) => {
    try {
      // Anuluj istniejące powiadomienie
      await cancelScheduledNotifications(selectedTaskId);

      // Aktualizuj boardId
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

  // Funkcja pomocnicza do uzyskania domyślnego kalendarza lub jego utworzenia
  const getDefaultCalendarId = async () => {
    try {
      // Żądanie uprawnień
      const { status } = await CalendarExpo.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Brak uprawnień', 'Aplikacja nie ma dostępu do kalendarza.');
        return null;
      }

      // Pobranie listy kalendarzy
      const calendars = await CalendarExpo.getCalendarsAsync(CalendarExpo.EntityTypes.EVENT);

      // Znalezienie kalendarza domyślnego
      const defaultCalendar = calendars.find(cal => cal.allowsModifications && cal.title === 'TodolistApp Calendar');

      if (defaultCalendar) {
        return defaultCalendar.id;
      }

      // Jeśli nie znaleziono, utwórz nowy kalendarz
      const newCalendarId = await CalendarExpo.createCalendarAsync({
        title: 'TodolistApp Calendar',
        color: 'blue',
        entityType: CalendarExpo.EntityTypes.EVENT,
        sourceId: calendars[0].source.id,
        source: calendars[0].source,
        name: 'internalCalendarName',
        ownerAccount: 'personal',
        accessLevel: CalendarExpo.CalendarAccessLevel.OWNER,
      });

      return newCalendarId;
    } catch (error) {
      console.error('Błąd przy uzyskiwaniu kalendarza:', error);
      return null;
    }
  };

  // Funkcja do uzyskiwania uprawnień do powiadomień i ustawienia konfiguracji
  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      Alert.alert('Błąd', 'Powiadomienia nie działają na emulatorach.');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Brak uprawnień', 'Aplikacja nie ma dostępu do powiadomień.');
      return;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }
  };

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  // Funkcja do harmonogramowania powiadomienia 24h przed terminem zadania
  const scheduleNotification = async (task) => {
    try {
      const trigger = new Date(task.deadlineDate);
      trigger.setDate(trigger.getDate() - 1);
      trigger.setHours(9, 0, 0); // Ustawienie godziny powiadomienia

      if (trigger < new Date()) {
        return;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Przypomnienie: ${task.name}`,
          body: `Masz 24 godziny na wykonanie zadania.`,
          data: { taskId: task.id },
        },
        trigger,
      });

      // Zaktualizuj zadanie w Firestore z notificationId
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, {
        notificationId: notificationId,
      });

    } catch (error) {
      console.error('Błąd przy harmonogramowaniu powiadomienia:', error);
    }
  };

  // Funkcja do usuwania powiadomień związanych z zadaniem
  const cancelScheduledNotifications = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.notificationId) {
      await Notifications.cancelScheduledNotificationAsync(task.notificationId);
      // Usuń notificationId z Firestore
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        notificationId: null,
      });
    }
  };

  // Funkcja do harmonogramowania powiadomień dla wszystkich zadań
  const scheduleAllNotifications = async () => {
    for (const task of tasks) {
      if (!task.notificationId) { // Harmonogramuj tylko, jeśli nie ma notificationId
        await scheduleNotification(task);
      }
    }
  };

  // Harmonogramowanie powiadomień po załadowaniu zadań
  useEffect(() => {
    if (!loading) {
      scheduleAllNotifications();
    }
  }, [loading, tasks]);

  // // Funkcja do eksportowania wszystkich zadań do kalendarza systemowego
  // const exportTasksToCalendar = async () => {
  //   try {
  //     // Sprawdzenie uprawnień
  //     const status = await CalendarExpo.requestCalendarPermissionsAsync();
  //     if (status.status !== 'granted') {
  //       Alert.alert('Brak uprawnień', 'Aplikacja nie ma dostępu do kalendarza.');
  //       return;
  //     }

  //     // Iteracja przez wszystkie zadania i dodawanie ich do kalendarza
  //     for (const task of tasks) {
  //       if (!calendarId) {
  //         Alert.alert('Błąd', 'Kalendarz nie jest dostępny.');
  //         return;
  //       }

  //       // Konwersja daty na Date object
  //       const taskDate = new Date(task.deadline);
  //       // Ustawienie czasu na początek dnia
  //       taskDate.setHours(9, 0, 0); // Możesz dostosować godzinę

  //       // Dodanie wydarzenia do kalendarza
  //       await CalendarExpo.createEventAsync(calendarId, {
  //         title: task.name,
  //         startDate: taskDate,
  //         endDate: new Date(taskDate.getTime() + 60 * 60 * 1000), // 1 godzina później
  //         notes: task.description,
  //         color: task.color,
  //       });
  //     }

  //     Alert.alert('Sukces', 'Wszystkie zadania zostały wyeksportowane do kalendarza.');
  //   } catch (error) {
  //     console.error('Błąd przy eksportowaniu do kalendarza:', error);
  //     Alert.alert('Błąd', 'Nie udało się wyeksportować zadań do kalendarza.');
  //   }
  // };

  // Funkcja do eksportowania pojedynczego zadania do Kalendarza Google
  const exportTaskToGoogleCalendar = (task) => {
    const startDate = new Date(task.deadline);
    startDate.setHours(9, 0, 0); // Ustawienie godziny rozpoczęcia
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 godzina później

    const formatDate = (date) => {
      return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    };

    const eventTitle = encodeURIComponent(task.name);
    const eventDescription = encodeURIComponent(task.description || 'Brak opisu.');
    const eventLocation = encodeURIComponent(task.boardName || 'Brak lokalizacji.');

    const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${eventTitle}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${eventDescription}&location=${eventLocation}&sf=true&output=xml`;

    Linking.canOpenURL(googleCalendarUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(googleCalendarUrl);
        } else {
          Alert.alert('Błąd', 'Nie można otworzyć Kalendarza Google.');
        }
      })
      .catch((err) => console.error('An error occurred', err));
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
                    <View style={{ flexDirection: 'row' }}>
                      {/* Eksport do Kalendarza Google */}
                      <IconButton
                        icon="google"
                        size={20}
                        color="#DB4437"
                        onPress={() => exportTaskToGoogleCalendar(item)}
                      />
                      {/* Eksport do Kalendarza Systemowego
                      <IconButton
                        icon="calendar-export"
                        size={20}
                        color={colors.primary}
                        onPress={() => exportTaskToCalendar(item)}
                      /> */}
                    </View>
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
  exportButton: {
    alignSelf: 'flex-end',
    padding: 10,
    margin: 10,
    borderRadius: 5,
  },
});