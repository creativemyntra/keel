<?php
/**
 * BASELINE-002 E2E Test Fixture App
 * Serves the profile upload mockup and mocks the backend API
 */

// Minimal router — no framework required.
$path = $_SERVER['PATH_INFO'] ?? parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];

// ========== HEALTH CHECK ==========
if ($method === 'GET' && $path === '/api/health') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'timestamp' => time()]);
    exit;
}

// ========== PROFILE PAGE (MOCKUP) ==========
if ($method === 'GET' && ($path === '/' || $path === '/profile')) {
    // Serve the HTML mockup from the actual docs location
    $mockupPath = realpath(__DIR__ . '/../../../../docs/design/BASELINE-002-profile-upload-mockup.html');
    if (file_exists($mockupPath)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($mockupPath);
        exit;
    }
}

// ========== PROFILE IMAGE API ENDPOINTS ==========

// Extract user ID from path: /api/users/{userId}/profile-image
$apiPattern = '#^/api/users/(\d+)/profile-image$#';
if (preg_match($apiPattern, $path, $matches)) {
    $userId = (int)$matches[1];

    // ===== POST: Upload image =====
    if ($method === 'POST') {
        // Mock authentication check
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (empty($authHeader)) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Unauthorized', 'code' => 'NO_AUTH']);
            exit;
        }

        // Simulate potential errors based on request
        if (isset($_GET['simulate_error'])) {
            $error = $_GET['simulate_error'];
            if ($error === '500') {
                http_response_code(500);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Internal server error']);
                exit;
            }
            if ($error === '502') {
                http_response_code(502);
                header('Content-Type: application/json');
                echo json_encode(['error' => 'Bad gateway']);
                exit;
            }
        }

        // Check if file was uploaded
        if (!isset($_FILES['file'])) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'No file provided', 'code' => 'MISSING_FILE']);
            exit;
        }

        $file = $_FILES['file'];

        // Check for upload errors
        if ($file['error'] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Upload failed', 'code' => 'UPLOAD_ERROR']);
            exit;
        }

        // Validate file type based on magic bytes (simplified)
        $fh = fopen($file['tmp_name'], 'rb');
        $magicBytes = fread($fh, 4);
        fclose($fh);

        $isJPEG = substr($magicBytes, 0, 3) === "\xFF\xD8\xFF";
        $isPNG = substr($magicBytes, 0, 4) === "\x89PNG";

        if (!$isJPEG && !$isPNG) {
            http_response_code(422);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'Unsupported file format',
                'code' => 'INVALID_FORMAT'
            ]);
            exit;
        }

        // Validate file size (5 MB = 5242880 bytes)
        if ($file['size'] > 5242880) {
            http_response_code(422);
            header('Content-Type: application/json');
            echo json_encode([
                'error' => 'File is too large',
                'code' => 'FILE_TOO_LARGE',
                'limit' => 5242880
            ]);
            exit;
        }

        // Simulate successful upload
        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'profile_image_url' => 'https://s3.amazonaws.com/bucket/users/' . $userId . '/profile.' . ($isJPEG ? 'jpg' : 'png'),
            'profile_image_updated_at' => date('c'),
            'presigned_url' => 'https://s3.amazonaws.com/bucket/users/' . $userId . '/profile.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600'
        ]);
        exit;
    }

    // ===== GET: Get presigned URL =====
    if ($method === 'GET') {
        // Mock authentication check
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (empty($authHeader)) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        // Check if image exists (mock: always exists for testing)
        $hasImage = isset($_GET['no_image']) ? false : true;

        if (!$hasImage) {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'No image found']);
            exit;
        }

        http_response_code(200);
        header('Content-Type: application/json');
        echo json_encode([
            'profile_image_url' => 'https://s3.amazonaws.com/bucket/users/' . $userId . '/profile.jpg',
            'presigned_url' => 'https://s3.amazonaws.com/bucket/users/' . $userId . '/profile.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=3600',
            'profile_image_updated_at' => date('c', time() - 3600)
        ]);
        exit;
    }

    // ===== DELETE: Delete image =====
    if ($method === 'DELETE') {
        // Mock authentication check
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (empty($authHeader)) {
            http_response_code(401);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }

        // Simulate successful delete
        http_response_code(204);
        exit;
    }

    // ===== Unsupported method =====
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ========== 404 DEFAULT ==========
http_response_code(404);
header('Content-Type: application/json');
echo json_encode(['error' => 'Not found', 'path' => $path]);
