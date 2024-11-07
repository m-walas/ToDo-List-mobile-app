// screens/ToDoListScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, Button, StyleSheet } from 'react-native';
import { signOut } from 'firebase/auth';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';

export default function ToDoListScreen() {
  const [tasks, setTasks] = useState([]);
  const [task, setTask] = useState('');

  const tasksRef = collection(db, 'tasks');

  useEffect(() => {
    const q = query(
      tasksRef,
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasks = [];
      querySnapshot.forEach((doc) => {
        tasks.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      setTasks(tasks);
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
        });
        setTask('');
      } catch (error) {
        alert(error);
      }
    }
  };

  const logout = () => {
    signOut(auth).catch((error) => alert(error));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista zadań</Text>
      <TextInput
        style={styles.input}
        placeholder="Dodaj nowe zadanie"
        value={task}
        onChangeText={setTask}
      />
      <Button title="Dodaj zadanie" onPress={addTask} />
      <FlatList
        data={tasks}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <Text>{item.text}</Text>
            {/* Możesz dodać przyciski edycji i usuwania */}
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      <Button title="Wyloguj się" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  taskItem: {
    padding: 10,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
});
