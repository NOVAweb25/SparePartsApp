import React from 'react';
import { View, Text, Image, Button, StyleSheet } from 'react-native';

const CartItem = ({ item, onUpdateQuantity, onRemove }) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.details}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>${item.price}</Text>
        <Text style={styles.quantity}>Quantity: {item.quantity}</Text>
        <Button title="+" onPress={() => onUpdateQuantity(item.id, item.quantity + 1)} />
        <Button title="-" onPress={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))} />
        <Button title="Remove" onPress={() => onRemove(item.id)} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  image: {
    width: 50,
    height: 50,
    resizeMode: 'contain',
  },
  details: {
    flex: 1,
    marginLeft: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  price: {
    fontSize: 14,
    color: 'green',
  },
  quantity: {
    fontSize: 14,
  },
});

export default CartItem;