// src/screens/BoardTasksScreen.js
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, UIManager, LayoutAnimation } from 'react-native';
import { Text, IconButton, useTheme, FAB, Menu, Portal, Button, List, TextInput, Modal } from 'react-native-paper';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function BoardTasksScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { boardId } = route.params;

  // Sprawdź czy user jest zalogowany
  if (!auth.currentUser) {
    return (
      <View style={{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor: colors.background }}>
        <Text style={{color: colors.text}}>Ładowanie...</Text>
      </View>
    );
  }

  const [tasks, setTasks] = useState([]);
  const [board, setBoard] = useState(null);
  const [menuVisible, setMenuVisible] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [boards, setBoards] = useState([]);

  const [menuVisibleHeader, setMenuVisibleHeader] = useState(false);

  const [editNameModalVisible, setEditNameModalVisible] = useState(false);
  const [editColorModalVisible, setEditColorModalVisible] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [newBoardColor, setNewBoardColor] = useState('');

  const [moveModalVisible, setMoveModalVisible] = useState(false);

  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const boardRef = doc(db, 'boards', boardId);
    const unsubscribeBoard = onSnapshot(boardRef, (docSnap) => {
      if (docSnap.exists()) {
        setBoard(docSnap.data());
      }
    });

    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('boardId', '==', boardId), where('userId', '==', auth.currentUser.uid));

    const unsubscribeTasks = onSnapshot(q, (querySnapshot) => {
      const fetchedTasks = [];
      querySnapshot.forEach((d) => {
        fetchedTasks.push({ id: d.id, ...d.data() });
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
      unsubscribeBoard();
      unsubscribeTasks();
      unsubscribeBoards();
    };
  }, [boardId, auth.currentUser]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Menu
          visible={menuVisibleHeader}
          onDismiss={() => setMenuVisibleHeader(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              size={24}
              onPress={() => setMenuVisibleHeader(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisibleHeader(false);
              setEditNameModalVisible(true);
              setNewBoardName(board ? board.name : '');
            }}
            title="Zmień Nazwę"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisibleHeader(false);
              setEditColorModalVisible(true);
              setNewBoardColor(board ? board.color : COLORS[0]);
            }}
            title="Zmień Kolor"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisibleHeader(false);
              Alert.alert(
                'Usuń Tablicę',
                'Czy na pewno chcesz usunąć tę tablicę?',
                [
                  { text: 'Anuluj', style: 'cancel' },
                  {
                    text: 'Usuń',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await deleteDoc(doc(db, 'boards', boardId));

                        const tasksRef = collection(db, 'tasks');
                        const q = query(tasksRef, where('boardId', '==', boardId), where('userId', '==', auth.currentUser.uid));
                        const querySnapshot = await getDocs(q);
                        const batch = writeBatch(db);
                        querySnapshot.forEach((d) => {
                          batch.delete(d.ref);
                        });
                        await batch.commit();

                        navigation.goBack();
                        Alert.alert('Sukces', 'Tablica została usunięta.');
                      } catch (error) {
                        console.error('Error deleting board:', error);
                        Alert.alert('Błąd', 'Nie udało się usunąć tablicy.');
                      }
                    },
                  },
                ],
                { cancelable: true }
              );
            }}
            title="Usuń Tablicę"
          />
        </Menu>
      ),
      headerTitle: board ? board.name : 'Tablica',
    });
  }, [navigation, menuVisibleHeader, board]);

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

  const incompleteTasks = tasks.filter(task => !task.isCompleted);
  const completedTasks = tasks.filter(task => task.isCompleted);

  const renderTask = ({ item }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity onPress={() => toggleTaskCompletion(item.id, item.isCompleted)}>
        <IconButton
          icon={item.isCompleted ? 'check-circle' : 'checkbox-blank-circle-outline'}
          size={24}
          color={colors.primary}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('TaskModal', { taskId: item.id })} style={{ flex: 1 }}>
        <Text style={item.isCompleted ? styles.completedTask : styles.incompleteTask}>
          {item.text}
        </Text>
      </TouchableOpacity>
      <Menu
        visible={menuVisible[item.id] || false}
        onDismiss={() => setMenuVisible((prev) => ({ ...prev, [item.id]: false }))}
        anchor={
          <IconButton
            icon="dots-vertical"
            size={24}
            color={colors.text}
            onPress={() => setMenuVisible((prev) => ({ ...prev, [item.id]: true }))}
          />
        }
      >
        <Menu.Item
          onPress={() => {
            setMenuVisible((prev) => ({ ...prev, [item.id]: false }));
            openMoveModal(item.id);
          }}
          title="Przenieś do Innej Tablicy"
        />
        <Menu.Item
          onPress={() => {
            setMenuVisible((prev) => ({ ...prev, [item.id]: false }));
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
        onPress={() => prioritizeTask(item.id, item.isPrioritized)}
      />
    </View>
  );

  const renderCompletedTask = ({ item }) => (
    <View style={styles.taskItem}>
      <TouchableOpacity onPress={() => toggleTaskCompletion(item.id, item.isCompleted)}>
        <IconButton
          icon={item.isCompleted ? 'check-circle' : 'checkbox-blank-circle-outline'}
          size={24}
          color={colors.primary}
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('TaskModal', { taskId: item.id })} style={{ flex: 1 }}>
        <Text style={styles.completedTask}>
          {item.text}
        </Text>
      </TouchableOpacity>
      <Menu
        visible={menuVisible[item.id] || false}
        onDismiss={() => setMenuVisible((prev) => ({ ...prev, [item.id]: false }))}
        anchor={
          <IconButton
            icon="dots-vertical"
            size={24}
            color={colors.text}
            onPress={() => setMenuVisible((prev) => ({ ...prev, [item.id]: true }))}
          />
        }
      >
        <Menu.Item
          onPress={() => {
            setMenuVisible((prev) => ({ ...prev, [item.id]: false }));
            openMoveModal(item.id);
          }}
          title="Przenieś do Innej Tablicy"
        />
        <Menu.Item
          onPress={() => {
            setMenuVisible((prev) => ({ ...prev, [item.id]: false }));
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
        onPress={() => prioritizeTask(item.id, item.isPrioritized)}
      />
    </View>
  );

  const toggleShowCompleted = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCompleted(!showCompleted);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={incompleteTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerText, { color: colors.text }]}>Wszystkie Zadania</Text>
            <Button onPress={toggleShowCompleted} mode="text" color={colors.primary}>
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
                renderItem={renderCompletedTask}
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
        onPress={() => navigation.navigate('AddTaskScreen', { boardId: boardId })}
        label="Dodaj Zadanie"
      />

      <Portal>
        <Modal visible={moveModalVisible} onDismiss={() => setMoveModalVisible(false)} contentContainerStyle={styles.modalContainer}>
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
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={editNameModalVisible}
          onDismiss={() => setEditNameModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Zmień Nazwę Tablicy</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.primary }]}
            placeholder="Nowa nazwa tablicy"
            placeholderTextColor={colors.placeholder || '#888'}
            value={newBoardName}
            onChangeText={setNewBoardName}
          />
          <Button
            mode="contained"
            onPress={async () => {
              if (newBoardName.trim() === '') {
                Alert.alert('Błąd', 'Proszę podać nową nazwę tablicy.');
                return;
              }
              try {
                const boardRef = doc(db, 'boards', boardId);
                await updateDoc(boardRef, { name: newBoardName });
                setEditNameModalVisible(false);
                Alert.alert('Sukces', 'Nazwa tablicy została zaktualizowana.');
              } catch (error) {
                console.error('Error updating board name:', error);
                Alert.alert('Błąd', 'Nie udało się zaktualizować nazwy tablicy.');
              }
            }}
            style={styles.modalButton}
            color={colors.primary}
          >
            Zmień
          </Button>
          <Button onPress={() => setEditNameModalVisible(false)} style={styles.modalButton}>
            Anuluj
          </Button>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={editColorModalVisible}
          onDismiss={() => setEditColorModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Zmień Kolor Tablicy</Text>
          <FlatList
            data={COLORS}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.colorOption, { backgroundColor: item }]}
                onPress={async () => {
                  try {
                    const boardRef = doc(db, 'boards', boardId);
                    await updateDoc(boardRef, { color: item });
                    setNewBoardColor(item);
                    setEditColorModalVisible(false);
                    Alert.alert('Sukces', 'Kolor tablicy został zaktualizowany.');
                  } catch (error) {
                    console.error('Error updating board color:', error);
                    Alert.alert('Błąd', 'Nie udało się zaktualizować koloru tablicy.');
                  }
                }}
              >
                {newBoardColor === item && <View style={styles.selectedIndicator} />}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
            numColumns={4}
            contentContainerStyle={styles.colorsContainer}
          />
          <Button onPress={() => setEditColorModalVisible(false)} style={styles.modalButton} color={colors.primary}>
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
  input: {
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  completedContainer: {
    marginTop: 20,
  },
  colorOption: {
    width: 50,
    height: 50,
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
});
