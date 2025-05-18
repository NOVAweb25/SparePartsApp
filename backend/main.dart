import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(HeavyMachinApp());
}

class HeavyMachinApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'HeavyMachin',
      theme: ThemeData(
        primarySwatch: Colors.orange,
        scaffoldBackgroundColor: Colors.black,
        textTheme: TextTheme(
          bodyText1: TextStyle(color: Colors.white),
          bodyText2: TextStyle(color: Colors.white),
        ),
      ),
      initialRoute: '/login',
      routes: {
        '/login': (context) => LoginScreen(),
        '/home': (context) => Scaffold(
              appBar: AppBar(title: Text('الرئيسية')),
              body: Center(child: Text('مرحبًا بك!')),
            ),
      },
    );
  }
}