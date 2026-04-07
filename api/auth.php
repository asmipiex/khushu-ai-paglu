<?php
/* ============================================================
   AUTH API — Password & Secret Code Verification
   ============================================================ */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'verify_password':
        verifyPassword();
        break;
    case 'verify_secret':
        verifySecretCode();
        break;
    case 'check_session':
        checkSession();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

function verifyPassword() {
    $top = intval($_POST['top'] ?? 0);
    $bottom = intval($_POST['bottom'] ?? 0);

    // Password: 4 top + 3 bottom
    if ($top === 4 && $bottom === 3) {
        $_SESSION['cube_unlocked'] = true;
        $_SESSION['unlock_time'] = time();
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Invalid combination']);
    }
}

function verifySecretCode() {
    $code = strtolower(trim($_POST['code'] ?? ''));

    // The secret code
    if ($code === 'khushani') {
        $_SESSION['vault_unlocked'] = true;
        echo json_encode([
            'success' => true,
            'contacts' => [
                'telegram' => 'https://t.me/Anirudhsq',
                'whatsapp' => '9860730275'
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Wrong code']);
    }
}

function checkSession() {
    echo json_encode([
        'success' => true,
        'cube_unlocked' => !empty($_SESSION['cube_unlocked']),
        'vault_unlocked' => !empty($_SESSION['vault_unlocked'])
    ]);
}
