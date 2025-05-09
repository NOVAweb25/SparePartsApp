import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getMaintenanceArticles } from '../api/api';

const MaintenanceScreen = () => {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await getMaintenanceArticles('دائم');
        setArticles(response.data);
      } catch (error) {
        console.error('Error fetching maintenance articles:', error);
      }
    };
    fetchArticles();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maintenance Articles</Text>
      <FlatList
        data={articles}
        renderItem={({ item }) => (
          <View style={styles.article}>
            <Text style={styles.articleTitle}>{item.title}</Text>
            <Text>{item.content}</Text>
          </View>
        )}
        keyExtractor={(item) => item.created_at}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  article: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MaintenanceScreen;