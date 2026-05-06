<?php
/**
 * GitHub webhook receiver for cPanel auto-deploy.
 *
 * Install: copy this file into ~/public_html/deploy.php on the cPanel host.
 *
 * Two auth modes are supported. The script will accept whichever the request
 * provides:
 *
 *   1. Shared token in query string (simple):
 *        https://yourdomain.com/deploy.php?token=YOUR_TOKEN
 *      Set the WEBHOOK_TOKEN env var in cPanel, OR replace the placeholder
 *      below.
 *
 *   2. GitHub HMAC signature (recommended):
 *        Configure a webhook secret in GitHub. The X-Hub-Signature-256 header
 *        is verified against WEBHOOK_SECRET below.
 */

declare(strict_types=1);

// ---------- CONFIG ----------
$WEBHOOK_TOKEN  = getenv('WEBHOOK_TOKEN')  ?: 'REPLACE_WITH_RANDOM_TOKEN';
$WEBHOOK_SECRET = getenv('WEBHOOK_SECRET') ?: '';
$DEPLOY_SCRIPT  = getenv('DEPLOY_SCRIPT')
    ?: '/home/barodari/lcbrising/scripts/cpanel/deploy.sh';
$ALLOWED_BRANCH = getenv('DEPLOY_BRANCH') ?: 'main';
// ----------------------------

header('Content-Type: text/plain; charset=utf-8');

function deny(int $status, string $msg): void {
    http_response_code($status);
    echo $msg, "\n";
    exit;
}

$body = file_get_contents('php://input') ?: '';
$tokenOk = false;

// Mode 1: shared token.
$givenToken = $_GET['token'] ?? '';
if ($givenToken !== '' && hash_equals($WEBHOOK_TOKEN, $givenToken)) {
    $tokenOk = true;
}

// Mode 2: GitHub HMAC signature.
if (!$tokenOk && $WEBHOOK_SECRET !== '') {
    $sig = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
    if (str_starts_with($sig, 'sha256=')) {
        $expected = 'sha256=' . hash_hmac('sha256', $body, $WEBHOOK_SECRET);
        if (hash_equals($expected, $sig)) {
            $tokenOk = true;
        }
    }
}

if (!$tokenOk) {
    deny(401, 'Unauthorized');
}

// Optional branch filter from GitHub push payload.
if ($body !== '') {
    $payload = json_decode($body, true);
    if (is_array($payload) && isset($payload['ref'])) {
        $expected = 'refs/heads/' . $ALLOWED_BRANCH;
        if ($payload['ref'] !== $expected) {
            echo "Ignored push to {$payload['ref']} (expected {$expected})\n";
            exit;
        }
    }
}

if (!is_executable($DEPLOY_SCRIPT)) {
    deny(500, "Deploy script not executable: {$DEPLOY_SCRIPT}");
}

// Run the deploy detached so GitHub doesn't time out waiting for the build.
$cmd = escapeshellcmd($DEPLOY_SCRIPT) . ' >/dev/null 2>&1 &';
shell_exec($cmd);

echo "Deploy triggered\n";
