import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TextInput } from 'react-native';

const AdminOffers = ({ navigation }) => {
  const [offers, setOffers] = useState([]);
  const [newOffer, setNewOffer] = useState({
    product_id: '',
    discount: '',
    description: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const response = await fetch('https://your-backend-subdomain.loca.lt/offers', {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setOffers(data);
      } catch (error) {
        console.error('Error fetching offers:', error);
      }
    };
    fetchOffers();
  }, []);

  const handleAddOffer = async () => {
    try {
      const response = await fetch('https://your-backend-subdomain.loca.lt/offers/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
        },
        body: JSON.stringify(newOffer),
      });
      if (response.ok) {
        const addedOffer = await response.json();
        setOffers([...offers, addedOffer.offer]);
        setNewOffer({
          product_id: '',
          discount: '',
          description: '',
          start_date: '',
          end_date: '',
        });
      }
    } catch (error) {
      console.error('Error adding offer:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Offers</Text>
      <TextInput
        style={styles.input}
        placeholder="Product ID"
        value={newOffer.product_id}
        onChangeText={(text) => setNewOffer({ ...newOffer, product_id: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Discount"
        value={newOffer.discount}
        onChangeText={(text) => setNewOffer({ ...newOffer, discount: text })}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={newOffer.description}
        onChangeText={(text) => setNewOffer({ ...newOffer, description: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Start Date (YYYY-MM-DD)"
        value={newOffer.start_date}
        onChangeText={(text) => setNewOffer({ ...newOffer, start_date: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="End Date (YYYY-MM-DD)"
        value={newOffer.end_date}
        onChangeText={(text) => setNewOffer({ ...newOffer, end_date: text })}
      />
      <Button title="Add Offer" onPress={handleAddOffer} />
      <FlatList
        data={offers}
        renderItem={({ item }) => (
          <View style={styles.offerItem}>
            <Text>{item.description}</Text>
            <Text>Discount: {item.discount}%</Text>
          </View>
        )}
        keyExtractor={(item) => item.id}
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
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  offerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default AdminOffers;