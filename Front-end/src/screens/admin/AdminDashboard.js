import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

const AdminDashboard = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Dashboard</Text>
      <Button
        title="Manage Products"
        onPress={() => navigation.navigate('AdminProducts')}
      />
      <Button
        title="Manage Orders"
        onPress={() => navigation.navigate('AdminOrders')}
      />
      <Button
        title="Manage Offers"
        onPress={() => navigation.navigate('AdminOffers')}
      />
      <Button
        title="Manage Customers"
        onPress={() => navigation.navigate('AdminCustomers')}
      />
      <Button
        title="Logout"
        onPress={() => navigation.replace('Login')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
});

export default AdminDashboard;