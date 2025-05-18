import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const MaintenanceScreen = () => {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Maintenance Section</Text>

      <Text style={styles.sectionTitle}>Common Issues and Solutions</Text>
      <Text style={styles.content}>
        1. **Engine Failure**: Often caused by lack of oil or overheating. Ensure regular oil checks and monitor temperature gauges.
        2. **Hydraulic Leaks**: Check for worn seals and replace them immediately to prevent system failure.
      </Text>

      <Text style={styles.sectionTitle}>Periodic Maintenance Tips</Text>
      <Text style={styles.content}>
        - Check oil levels every 100 hours of operation.
        - Inspect hydraulic systems monthly for leaks.
        - Replace air filters every 500 hours to ensure optimal performance.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Chat')}
      >
        <Text style={styles.buttonText}>Ask a Question (Smart Inquiry)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  content: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MaintenanceScreen;