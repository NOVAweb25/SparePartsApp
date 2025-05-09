import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TextInput } from 'react-native';

const AdminCustomers = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [offerDescription, setOfferDescription] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await fetch('https://your-backend-subdomain.loca.lt/customers', {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };
    fetchCustomers();
  }, []);

  const handleSendOffer = async (customerId) => {
    try {
      const response = await fetch(`https://your-backend-subdomain.loca.lt/customers/${customerId}/send-offer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
        },
        body: JSON.stringify({ offer_description: offerDescription }),
      });
      if (response.ok) {
        alert('Offer sent successfully!');
        setOfferDescription('');
      }
    } catch (error) {
      console.error('Error sending offer:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Customers</Text>
      <TextInput
        style={styles.input}
        placeholder="Offer Description"
        value={offerDescription}
        onChangeText={setOfferDescription}
      />
      <FlatList
        data={customers}
        renderItem={({ item }) => (
          <View style={styles.customerItem}>
            <Text>Username: {item.username}</Text>
            <Text>Email: {item.email}</Text>
            <Text>Orders: {item.orders_count}</Text>
            <Text>Type: {item.customer_type}</Text>
            <Button
              title="Send Offer"
              onPress={() => handleSendOffer(item.id)}
            />
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
  customerItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default AdminCustomers;