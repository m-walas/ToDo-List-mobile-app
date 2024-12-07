// src/screens/AllTasksScreen.js

import React, { useState, useEffect, memo } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  UIManager, 
  Platform 
} from 'react-native';
import { 
  Text, 
  IconButton, 
  useTheme, 
  FAB, 
  Portal, 
  List, 
  Menu, 
  Button,
  Dialog
} from 'react-native-paper';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TaskItem = memo(({ item, toggleCompletion, navigateToTask, openMenu, prioritize }) => (
  <View style={styles.taskItem}>
    <TouchableOpacity onPress={() => toggleCompletion(item.id, item.isCompleted)}>
      <IconButton
        icon={item.isCompleted ? 'check-circle' : 'checkbox-blank-circle-outline'}
        size={24}
        color="#6200ee"
      />
    </TouchableOpacity>
    <TouchableOpacity onPress={() => navigateToTask(item.id)} style={{ flex: 1 }}>
      <Text style={item.isCompleted ? styles.completedTask : styles.incompleteTask}>
        {item.text}
      </Text>
    </TouchableOpacity>
    <Menu
      visible={item.menuVisible}
      onDismiss={() => openMenu(item.id, false)}
      anchor={
        <IconButton
          icon="dots-vertical"
          size={24}
          color="#6200ee"
          onPress={() => openMenu(item.id, true)}
        />
      }
    >
      <Menu.Item
        onPress={() => {
          openMenu(item.id, false);
          openMoveModal(item.id);
        }}
        title="Przenieś do Innej Tablicy"
      />
      <Menu.Item
        onPress={() => {
          openMenu(item.id, false);
          Alert.alert(
            'Usuń Zadanie',
            'Czy na pewno chcesz usunąć to zadanie?',
            [
              { text: 'Anuluj', style: 'cancel' },
              { text: 'Usuń', style: 'destructive', onPress: () => deleteTask(item.id) },
            ],
            { cancelable: true }
          );
        }}
        title="Usuń Zadanie"
      />
    </Menu>
    <IconButton
      icon={item.isPrioritized ? 'star' : 'star-outline'}
      size={24}
      color={item.isPrioritized ? '#ffd700' : '#555'}
      onPress={() => prioritize(item.id, item.isPrioritized)}
    />
  </View>
));

export default function AllTasksScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [boards, setBoards] = useState([]);
  const [menuVisible, setMenuVisible] = useState({});
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedTasks = [];
      querySnapshot.forEach((doc) => {
        fetchedTasks.push({ id: doc.id, ...doc.data(), menuVisible: false });
      });
      const sortedTasks = fetchedTasks.sort((a, b) => {
        if (a.isPrioritized === b.isPrioritized) {
          if (a.isCompleted === b.isCompleted) {
            return 0;
          }
          return a.isCompleted ? 1 : -1;
        }
        return a.isPrioritized ? -1 : 1;
      });
      setTasks(sortedTasks);
    });

    const boardsRef = collection(db, 'boards');
    const qBoards = query(boardsRef, where('userId', '==', auth.currentUser.uid));

    const unsubscribeBoards = onSnapshot(qBoards, (querySnapshot) => {
      const fetchedBoards = [];
      querySnapshot.forEach((doc) => {
        fetchedBoards.push({ id: doc.id, ...doc.data() });
      });
      setBoards(fetchedBoards);
    });

    return () => {
      unsubscribe();
      unsubscribeBoards();
    };
  }, []);

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        isCompleted: !currentStatus,
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const prioritizeTask = async (taskId, isPrioritized) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        isPrioritized: !isPrioritized,
      });
    } catch (error) {
      console.error('Error prioritizing task:', error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const moveTask = async (taskId, newBoardId) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
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

  const openMoveModal = (taskId) => {
    setSelectedTaskId(taskId);
    setMoveModalVisible(true);
  };

  const openMenu = (taskId, visible) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, menuVisible: visible } : task
      )
    );
  };

  const incompleteTasks = tasks.filter(task => !task.isCompleted);
  const completedTasks = tasks.filter(task => task.isCompleted);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={incompleteTasks}
        renderItem={({ item }) => (
          <TaskItem 
            item={item} 
            toggleCompletion={toggleTaskCompletion} 
            navigateToTask={(id) => navigation.navigate('TaskModal', { taskId: id })}
            openMenu={openMenu}
            prioritize={prioritizeTask}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerText, { color: colors.text }]}>Wszystkie Zadania</Text>
            <Button onPress={() => setShowCompleted(!showCompleted)} mode="text" color={colors.primary}>
              {showCompleted ? 'Ukryj Ukończone' : 'Pokaż Ukończone'}
            </Button>
          </View>
        }
        ListFooterComponent={
          showCompleted && completedTasks.length > 0 ? (
            <View style={styles.completedContainer}>
              <Text style={[styles.headerText, { color: colors.text }]}>Ukończone Zadania</Text>
              <FlatList
                data={completedTasks}
                renderItem={({ item }) => (
                  <TaskItem 
                    item={item} 
                    toggleCompletion={toggleTaskCompletion} 
                    navigateToTask={(id) => navigation.navigate('TaskModal', { taskId: id })}
                    openMenu={openMenu}
                    prioritize={prioritizeTask}
                  />
                )}
                keyExtractor={(item) => item.id}
              />
            </View>
          ) : null
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
        <Dialog 
          visible={moveModalVisible} 
          onDismiss={() => setMoveModalVisible(false)} 
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Przenieś Zadanie</Text>
          <FlatList
            data={boards}
            renderItem={({ item }) => (
              <List.Item
                key={item.id}
                title={item.name}
                left={() => <List.Icon icon="folder" color={item.color || colors.primary} />}
                onPress={() => moveTask(selectedTaskId, item.id)}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ maxHeight: '70%' }}
          />
          <Button onPress={() => setMoveModalVisible(false)} style={styles.modalButton}>
            Anuluj
          </Button>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  list: {
    paddingBottom: 80,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
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
  completedContainer: {
    marginTop: 20,
  },
});
