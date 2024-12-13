// src/screens/AllTasksScreen.js

import React, { useState, useEffect, memo } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  Alert, 
  UIManager, 
  Platform,
  TouchableOpacity
} from 'react-native';
import { 
  Text, 
  IconButton, 
  useTheme, 
  FAB, 
  Portal, 
  Menu, 
  Button,
  Dialog,
  Card,
  Divider
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
import { Picker } from '@react-native-picker/picker';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TaskItem = memo(({ 
  item, 
  toggleCompletion, 
  navigateToTask, 
  openMenu, 
  openMoveModal, 
  prioritize, 
  deleteTask 
}) => {
  const { colors } = useTheme();
  
  return (
    <Card 
      style={[styles.taskCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      elevation={2}
    >
      <View style={styles.taskItem}>
        <IconButton
          icon={item.isCompleted ? 'check-circle' : 'checkbox-blank-circle-outline'}
          size={24}
          color={colors.primary}
          onPress={() => toggleCompletion(item.id, item.isCompleted)}
        />
        <TouchableOpacity 
          onPress={() => navigateToTask(item.id)} 
          style={styles.taskContent}
        >
          <Text 
            style={[
              styles.taskText, 
              item.isCompleted ? styles.completedTask : styles.incompleteTask,
              { color: colors.text }
            ]}
          >
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
              color={colors.primary}
              onPress={() => openMenu(item.id, true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              openMenu(item.id, false);
              openMoveModal(item.id); // Open move modal
            }}
            title="Przenieś do innej tablicy"
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
            title="Usuń zadanie"
          />
        </Menu>
        <IconButton
          icon={item.isPrioritized ? 'star' : 'star-outline'}
          size={24}
          color={item.isPrioritized ? colors.primary : colors.text}
          onPress={() => prioritize(item.id, item.isPrioritized)}
        />
      </View>
    </Card>
  );
});

export default function AllTasksScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [boards, setBoards] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [moveModalVisible, setMoveModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState('');

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
      Alert.alert('Błąd', 'Nie udało się zaktualizować zadania.');
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
      Alert.alert('Błąd', 'Nie udało się zmienić priorytetu zadania.');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      await deleteDoc(taskRef);
    } catch (error) {
      console.error('Error deleting task:', error);
      Alert.alert('Błąd', 'Nie udało się usunąć zadania.');
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
      setSelectedBoard('');
      Alert.alert('Sukces', 'Zadanie zostało przeniesione.');
    } catch (error) {
      console.error('Error moving task:', error);
      Alert.alert('Błąd', 'Nie udało się przenieść zadania.');
    }
  };

  const openMoveModal = (taskId) => {
    setSelectedTaskId(taskId); // Set task ID to move
    setMoveModalVisible(true); // Show modal
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
            openMoveModal={openMoveModal}
            prioritize={prioritizeTask}
            deleteTask={deleteTask} // Przekazanie deleteTask jako prop
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerText, { color: colors.text }]}>Wszystkie zadania</Text>
            <Button 
              onPress={() => setShowCompleted(!showCompleted)} 
              mode="text" 
              color={colors.primary}
            >
              {showCompleted ? 'Ukryj ukończone' : 'Pokaż ukończone'}
            </Button>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.text }]}>Brak aktywnych zadań</Text>
          </View>
        }
        ListFooterComponent={
          showCompleted && completedTasks.length > 0 ? (
            <View style={styles.completedContainer}>
              <Divider style={{ marginVertical: 10 }} />
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
                    deleteTask={deleteTask} // Przekazanie deleteTask jako prop
                  />
                )}
                keyExtractor={(item) => item.id}
              />
            </View>
          ) : null
        }
      />
      <FAB
        style={[styles.fab, { backgroundColor: colors.primary }]}
        small
        icon="plus"
        onPress={() => navigation.navigate('AddTaskScreen', { boardId: null })}
        label="Dodaj zadanie"
        color={colors.background}
      />

      <Portal>
        <Dialog 
          visible={moveModalVisible} 
          onDismiss={() => setMoveModalVisible(false)} 
          style={{ backgroundColor: colors.surface }}
        >
          <Dialog.Title>Przenieś do innej tablicy</Dialog.Title>
          <Dialog.Content>
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
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                if (selectedBoard) {
                  moveTask(selectedTaskId, selectedBoard);
                } else {
                  Alert.alert('Błąd', 'Proszę wybrać tablicę.');
                }
              }}
              mode="contained"
              color={colors.primary}
            >
              Przenieś
            </Button>
            <Button 
              onPress={() => {
                setMoveModalVisible(false);
                setSelectedBoard('');
              }} 
              mode="outlined" 
              color={colors.primary}
            >
              Anuluj
            </Button>
          </Dialog.Actions>
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  taskCard: {
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  taskContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskText: {
    fontSize: 16,
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
    height: 50,
  },
  completedContainer: {
    marginTop: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
