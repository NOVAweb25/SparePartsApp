import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getSubscriptions, getPreferredProducts } from '../api/api';

const SubscriptionScreen = ({ navigation }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [preferredProducts, setPreferredProducts] = useState([]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const response = await getSubscriptions();
        setSubscriptions(response.data);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      }
    };

    const fetchPreferredProducts = async () => {
      try {
        const response = await getPreferredProducts(navigation.getState().routes[0].params?.userId);
        setPreferredProducts(response.data);
      } catch (error) {
        console.error('Error fetching preferred products:', error);
      }
    };

    fetchSubscriptions();
    fetchPreferredProducts();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscriptions</Text>
      <FlatList
        data={subscriptions}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>User ID: {item.userId}</Text>
            <Text>Status: {item.status}</Text>
            <Text>Last Order Date: {item.lastOrderDate || 'N/A'}</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
      />
      <Text style={styles.title}>Preferred Products</Text>
      <FlatList
        data={preferredProducts}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item}</Text>
          </View>
        )}
        keyExtractor={(item) => item}
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
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default SubscriptionScreen;