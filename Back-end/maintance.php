/* PHP (support.php) */
<?php
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $user_query = $_POST['query'];

    // منطق الذكاء الاصطناعي البسيط
    $response = "جارٍ معالجة استفسارك حول: $user_query. سنعود إليك قريبًا.";

    echo json_encode(['response' => $response]);
}
?>
