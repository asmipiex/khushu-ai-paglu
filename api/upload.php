<?php
/* ============================================================
   UPLOAD API — Standalone file upload handler
   ============================================================ */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

if (!isset($_FILES['file'])) {
    echo json_encode(['success' => false, 'error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];
$type = $_POST['type'] ?? 'image';

if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE => 'File too large (server limit)',
        UPLOAD_ERR_FORM_SIZE => 'File too large (form limit)',
        UPLOAD_ERR_PARTIAL => 'File partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Server temp dir missing',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file',
    ];
    $errMsg = $errors[$file['error']] ?? 'Unknown upload error';
    echo json_encode(['success' => false, 'error' => $errMsg]);
    exit;
}

$baseDir = __DIR__ . '/../memories';

// Determine subdirectory and allowed types
$config = [
    'image' => [
        'dir' => 'pics',
        'mime' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        'maxSize' => 20 * 1024 * 1024 // 20MB
    ],
    'video' => [
        'dir' => 'vids',
        'mime' => ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'],
        'maxSize' => 100 * 1024 * 1024 // 100MB
    ],
    'audio' => [
        'dir' => 'audios',
        'mime' => ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac'],
        'maxSize' => 30 * 1024 * 1024 // 30MB
    ]
];

if (!isset($config[$type])) {
    echo json_encode(['success' => false, 'error' => 'Invalid file type']);
    exit;
}

$cfg = $config[$type];

// Validate MIME type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $cfg['mime'])) {
    echo json_encode(['success' => false, 'error' => 'File type not allowed: ' . $mimeType]);
    exit;
}

// Validate size
if ($file['size'] > $cfg['maxSize']) {
    $maxMB = $cfg['maxSize'] / 1024 / 1024;
    echo json_encode(['success' => false, 'error' => "File too large. Max {$maxMB}MB"]);
    exit;
}

// Create directory if needed
$targetDir = $baseDir . '/' . $cfg['dir'];
if (!is_dir($targetDir)) {
    mkdir($targetDir, 0755, true);
}

// Generate safe filename
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION)) ?: 'bin';
$safeName = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$targetPath = $targetDir . '/' . $safeName;

// Move file
if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    $relativePath = 'memories/' . $cfg['dir'] . '/' . $safeName;
    echo json_encode([
        'success' => true,
        'path' => $relativePath,
        'filename' => $safeName,
        'size' => $file['size'],
        'type' => $mimeType
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to save file']);
}
