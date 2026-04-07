<?php
/* ============================================================
   CHAT API — Send, Fetch, Delete Messages
   NoSQL JSON-based storage
   ============================================================ */

session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');

$DATA_FILE = __DIR__ . '/../data/messages.json';
$MD_LOG = __DIR__ . '/../memories/khushi.ani.md';

// Ensure data file exists
if (!file_exists($DATA_FILE)) {
    $dir = dirname($DATA_FILE);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents($DATA_FILE, json_encode(['messages' => []], JSON_PRETTY_PRINT));
}

// Ensure markdown log exists
if (!file_exists($MD_LOG)) {
    $dir = dirname($MD_LOG);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    file_put_contents($MD_LOG, "# 💬 Khushi & Anirudh — Chat Memories\n\n---\n\n");
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'send':
        sendMessage();
        break;
    case 'fetch':
        fetchMessages();
        break;
    case 'delete':
        deleteMessage();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

function loadMessages() {
    global $DATA_FILE;
    $content = file_get_contents($DATA_FILE);
    $data = json_decode($content, true);
    return $data['messages'] ?? [];
}

function saveMessages($messages) {
    global $DATA_FILE;
    $data = ['messages' => $messages];
    file_put_contents($DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

function generateId() {
    return bin2hex(random_bytes(8)) . '_' . time();
}

function sendMessage() {
    global $MD_LOG;

    $sender = $_POST['sender'] ?? '';
    $type = $_POST['type'] ?? 'text';
    $content = $_POST['content'] ?? '';

    if (!in_array($sender, ['khushi', 'anirudh'])) {
        echo json_encode(['success' => false, 'error' => 'Invalid sender']);
        return;
    }

    $id = generateId();
    $timestamp = date('c'); // ISO 8601
    $mediaPath = null;

    // Handle file upload
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $mediaPath = handleUpload($_FILES['file'], $type);
    }

    $message = [
        'id' => $id,
        'sender' => $sender,
        'type' => $type,
        'content' => $content,
        'media' => $mediaPath,
        'timestamp' => $timestamp,
        'deleted' => false
    ];

    // Save to JSON
    $messages = loadMessages();
    $messages[] = $message;
    saveMessages($messages);

    // Append to markdown log
    $senderName = $sender === 'khushi' ? 'Khushi' : 'Anirudh';
    $datetime = date('Y-m-d H:i:s');
    $logEntry = "**{$senderName}** — _{$datetime}_\n";

    if ($content) {
        $logEntry .= "> {$content}\n";
    }
    if ($mediaPath) {
        $logEntry .= "> 📎 [{$type}]({$mediaPath})\n";
    }
    $logEntry .= "\n";

    file_put_contents($MD_LOG, $logEntry, FILE_APPEND);

    echo json_encode(['success' => true, 'message' => $message]);
}

function fetchMessages() {
    $afterId = $_GET['after'] ?? null;
    $messages = loadMessages();

    // Filter out deleted messages
    $messages = array_filter($messages, function ($msg) {
        return !$msg['deleted'];
    });
    $messages = array_values($messages);

    // If 'after' is specified, return only newer messages
    if ($afterId) {
        $found = false;
        $newMessages = [];
        foreach ($messages as $msg) {
            if ($found) {
                $newMessages[] = $msg;
            }
            if ($msg['id'] === $afterId) {
                $found = true;
            }
        }
        $messages = $newMessages;
    }

    echo json_encode(['success' => true, 'messages' => $messages]);
}

function deleteMessage() {
    $id = $_POST['id'] ?? '';
    $user = $_POST['user'] ?? '';

    // Only Anirudh can delete
    if ($user !== 'anirudh') {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        return;
    }

    $messages = loadMessages();
    $found = false;

    foreach ($messages as &$msg) {
        if ($msg['id'] === $id) {
            $msg['deleted'] = true;
            $found = true;
            break;
        }
    }

    if ($found) {
        saveMessages($messages);
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Message not found']);
    }
}

function handleUpload($file, $type) {
    $baseDir = __DIR__ . '/../memories';
    $subDir = '';

    switch ($type) {
        case 'image':
            $subDir = 'pics';
            $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            break;
        case 'video':
            $subDir = 'vids';
            $allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
            break;
        case 'audio':
            $subDir = 'audios';
            $allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm'];
            break;
        default:
            return null;
    }

    // Validate file type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowed)) {
        return null;
    }

    // Max 50MB
    if ($file['size'] > 50 * 1024 * 1024) {
        return null;
    }

    $targetDir = $baseDir . '/' . $subDir;
    if (!is_dir($targetDir)) mkdir($targetDir, 0755, true);

    // Generate unique filename
    $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'bin';
    $filename = date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $targetPath = $targetDir . '/' . $filename;

    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        return 'memories/' . $subDir . '/' . $filename;
    }

    return null;
}
