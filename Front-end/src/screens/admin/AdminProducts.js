import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, TextInput } from 'react-native';

const AdminProducts = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    category: '',
    brand: '',
    specifications: '{}',
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('https://your-backend-subdomain.loca.lt/products', {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  const handleAddProduct = async () => {
    try {
      const response = await fetch('https://your-backend-subdomain.loca.lt/products/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
        },
        body: JSON.stringify(newProduct),
      });
      if (response.ok) {
        const addedProduct = await response.json();
        setProducts([...products, addedProduct.product]);
        setNewProduct({
          name: '',
          description: '',
          price: '',
          stock: '',
          category: '',
          brand: '',
          specifications: '{}',
        });
      }
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      const response = await fetch(`https://your-backend-subdomain.loca.lt/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        setProducts(products.filter(product => product.id !== productId));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Products</Text>
      <TextInput
        style={styles.input}
        placeholder="Name"
        value={newProduct.name}
        onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Description"
        value={newProduct.description}
        onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Price"
        value={newProduct.price}
        onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Stock"
        value={newProduct.stock}
        onChangeText={(text) => setNewProduct({ ...newProduct, stock: text })}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Category"
        value={newProduct.category}
        onChangeText={(text) => setNewProduct({ ...newProduct, category: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Brand"
        value={newProduct.brand}
        onChangeText={(text) => setNewProduct({ ...newProduct, brand: text })}
      />
      <TextInput
        style={styles.input}
        placeholder="Specifications (JSON)"
        value={newProduct.specifications}
        onChangeText={(text) => setNewProduct({ ...newProduct, specifications: text })}
      />
      <Button title="Add Product" onPress={handleAddProduct} />
      <FlatList
        data={products}
        renderItem={({ item }) => (
          <View style={styles.productItem}>
            <Text>{item.name}</Text>
            <Button title="Delete" onPress={() => handleDeleteProduct(item.id)} />
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
  productItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
});

export default AdminProducts;