// screens/ToDoListScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { fetchGitHubIssues, mapIssuesToTasks } from '../services/github';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme, Switch, Button, Text } from 'react-native-paper';
import { useThemeContext } from '../App';
import { GITHUB_REPO_OWNER, GITHUB_REPO_NAME } from '@env';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import { Dimensions } from 'react-native';

LocaleConfig.locales['pl'] = {
  monthNames: [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ],
  monthNamesShort: [
    'Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze',
    'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'
  ],
  dayNames: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
  dayNamesShort: ['Nie', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'So'],
  today: 'Dziś'
};
LocaleConfig.defaultLocale = 'pl';

export default function ToDoListScreen() {
  const { colors } = useTheme();
  const { isDarkTheme, toggleTheme } = useThemeContext();
  const [tasks, setTasks] = useState([]);
  const [githubTasks, setGithubTasks] = useState([]);
  const [task, setTask] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [markedDates, setMarkedDates] = useState({});
  const [gitHubAccessToken, setGitHubAccessToken] = useState(null);

  const tasksRef = collection(db, 'tasks');

  useEffect(() => {
    const fetchAccessToken = async () => {
      try {
        const token = await AsyncStorage.getItem('githubAccessToken');
        if (token) {
          setGitHubAccessToken(token);
        }
      } catch (error) {
        console.error('Error fetching GitHub access token:', error);
      }
    };

    fetchAccessToken();
  }, []);

  const loadGitHubIssues = async () => {
    if (!gitHubAccessToken) {
      Alert.alert('Błąd', 'Brak tokenu dostępu GitHub. Zaloguj się ponownie.');
      return;
    }

    try {
      const issues = await fetchGitHubIssues(gitHubAccessToken, GITHUB_REPO_OWNER, GITHUB_REPO_NAME);
      const tasksFromGitHub = mapIssuesToTasks(issues);
      setGithubTasks(tasksFromGitHub);

      // NOTE: Dodaje zadania z GitHub do Firestore
      for (const task of tasksFromGitHub) {
        try {
          // info: Sprawdzenie, czy zadanie już istnieje, aby uniknąć duplikatów
          const existingTaskQuery = query(
            tasksRef,
            where('id', '==', task.id),
            where('userId', '==', auth.currentUser.uid)
          );

          const snapshot = await getDocs(existingTaskQuery);
          if (snapshot.empty) {
            await addDoc(tasksRef, {
              id: task.id,
              text: task.title,
              createdAt: new Date(),
              userId: auth.currentUser.uid,
              isCompleted: task.isCompleted,
            });
          }
        } catch (error) {
          console.error('Error adding task from GitHub:', error);
        }
      }

      Alert.alert('Sukces', 'Zadania zostały zsynchronizowane z GitHub!');
    } catch (error) {
      console.error('Error fetching GitHub issues:', error);
      Alert.alert('Błąd', 'Nie udało się pobrać zadań z GitHub.');
    }
  };

  useEffect(() => {
    const q = query(
      tasksRef,
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const firestoreTasks = [];
      const dates = {};
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        firestoreTasks.push({
          id: doc.id,
          ...data,
        });
        if (data.deadline) {
          const date = data.deadline.toDate().toISOString().split('T')[0];
          dates[date] = { marked: true, dotColor: 'blue' };
        }
      });
      setTasks(firestoreTasks);
      setMarkedDates(dates);
    });

    return unsubscribe;
  }, []);

  const addTask = async () => {
    if (task.length > 0) {
      try {
        await addDoc(tasksRef, {
          text: task,
          createdAt: new Date(),
          userId: auth.currentUser.uid,
          isCompleted: false,
          deadline: deadline ? deadline : null,
        });
        setTask('');
        setDeadline(null);
      } catch (error) {
        alert(error);
      }
    }
  };

  const logout = () => {
    signOut(auth).catch((error) => alert(error));
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || deadline;
    setShowDatePicker(false);
    setDeadline(currentDate);
  };

  // TabView konfiguracja
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'userTasks', title: 'Moje Zadania' },
    { key: 'githubTasks', title: 'GitHub Issues' },
  ]);

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'userTasks':
        return <UserTasksView />;
      case 'githubTasks':
        return <GitHubTasksView />;
      default:
        return null;
    }
  };

  function UserTasksView() {
    return (
      <View style={styles.scene}>
        <TextInput
          style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
          placeholder="Dodaj nowe zadanie"
          placeholderTextColor={colors.placeholder || 'gray'}
          value={task}
          onChangeText={setTask}
        />
        <Button mode="outlined" onPress={() => setShowDatePicker(true)} style={styles.button}>
          Wybierz deadline
        </Button>
        {deadline && (
          <Text style={[styles.deadlineText, { color: colors.text }]}>
            Deadline: {deadline.toDateString()}
          </Text>
        )}
        {showDatePicker && (
          <DateTimePicker
            value={deadline || new Date()}
            mode="date"
            display="default"
            onChange={onChangeDate}
          />
        )}
        <Button mode="contained" onPress={addTask} style={styles.button}>
          Dodaj zadanie
        </Button>
        <FlatList
          data={tasks}
          renderItem={({ item }) => (
            <View style={styles.taskItem}>
              <Text style={item.isCompleted ? styles.completedTask : styles.incompleteTask}>
                {item.text}
              </Text>
              {item.deadline && (
                <Text style={styles.deadline}>
                  Deadline: {item.deadline.toDate().toLocaleDateString()}
                </Text>
              )}
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
    );
  }

  function GitHubTasksView() {
    return (
      <View style={styles.scene}>
        <Button mode="contained" onPress={loadGitHubIssues} style={styles.button}>
          Synchronizuj zadania z GitHub
        </Button>
        <FlatList
          data={githubTasks}
          renderItem={({ item }) => (
            <View style={styles.taskItem}>
              <Text style={item.isCompleted ? styles.completedTask : styles.incompleteTask}>
                {item.title}
              </Text>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Przełącznik motywu */}
      <View style={styles.themeSwitch}>
        <Text style={{ color: colors.text }}>Motyw Dark</Text>
        <Switch value={isDarkTheme} onValueChange={toggleTheme} />
      </View>

      {/* Kalendarz */}
      <Calendar
        markedDates={markedDates}
        onDayPress={(day) => {
          console.log('Selected day', day);
        }}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          textSectionTitleColor: colors.text,
          selectedDayBackgroundColor: colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: colors.primary,
          dayTextColor: colors.text,
          textDisabledColor: 'gray',
          dotColor: colors.primary,
          selectedDotColor: '#ffffff',
          arrowColor: colors.primary,
          monthTextColor: colors.text,
          indicatorColor: colors.primary,
        }}
      />

      {/* TabView */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: Dimensions.get('window').width }}
        renderTabBar={props => (
          <TabBar
            {...props}
            indicatorStyle={{ backgroundColor: colors.primary }}
            style={{ backgroundColor: colors.background }}
            labelStyle={{ color: colors.text }}
          />
        )}
      />

      <Button onPress={logout} style={styles.logoutButton}>
        Wyloguj się
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  themeSwitch: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
  },
  scene: {
    flex: 1,
    padding: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  button: {
    marginBottom: 10,
  },
  deadlineText: {
    marginBottom: 15,
    textAlign: 'center',
    color: 'gray',
  },
  taskItem: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    color: 'gray',
  },
  incompleteTask: {
    color: 'black',
  },
  deadline: {
    fontSize: 12,
    color: 'gray',
  },
  logoutButton: {
    margin: 10,
  },
});
