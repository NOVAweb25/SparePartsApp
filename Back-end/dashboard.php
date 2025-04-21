<?php
session_start();

// تحقق مما إذا كان المستخدم قد سجل الدخول
if (!isset($_SESSION['user'])) {
    header('Location: login.html'); // إذا لم يسجل الدخول، إعادة توجيهه لصفحة تسجيل الدخول
    exit();
}
?>

<!DOCTYPE html>
<html lang="ar">
<head>
    <meta charset="UTF-8">
    <title>لوحة التحكم</title>
</head>
<body>
    <h1>مرحباً، <?php echo $_SESSION['user']; ?>!</h1>
    <p>مرحبًا بك في لوحة التحكم الخاصة بك.</p>
    <a href="logout.php">تسجيل الخروج</a>
</body>
</html>
