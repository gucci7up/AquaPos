<?php

use Appwrite\Client;
use Appwrite\InputFile;
use Appwrite\Services\Databases;
use Appwrite\Services\Storage;
use Appwrite\ID;

return function ($context, $res_legacy = null) {
    $is_modern = ($res_legacy === null);
    $req = $is_modern ? $context->req : $context;
    $res = $is_modern ? $context->res : $res_legacy;

    $payload = $is_modern ? ($req->body ?? null) : (isset($req['payload']) ? json_decode($req['payload'], true) : null);
    if (is_string($payload)) {
        $payload = json_decode($payload, true);
    }

    if (!$payload || !isset($payload['action'])) {
        return $res->json(['success' => false, 'error' => 'Missing action'], 400);
    }

    $vars = $is_modern ? ($context->variables ?? $_ENV) : ($req['variables'] ?? $_ENV);

    $databaseId = $vars['VITE_APPWRITE_DATABASE_ID'] ?? '';
    $quotesCollectionId = $vars['VITE_APPWRITE_COLLECTION_QUOTES_ID'] ?? '';
    $bucketId = $vars['VITE_APPWRITE_BUCKET_IMAGES_ID'] ?? '';

    $endpoint = $vars['APPWRITE_FUNCTION_ENDPOINT'] ?? '';
    $project = $vars['APPWRITE_FUNCTION_PROJECT_ID'] ?? '';
    $key = $vars['APPWRITE_FUNCTION_API_KEY'] ?? ($vars['APPWRITE_API_KEY'] ?? '');

    if (empty($databaseId) || empty($quotesCollectionId) || empty($endpoint) || empty($project) || empty($key)) {
        return $res->json(['success' => false, 'error' => 'Environment variables missing'], 500);
    }

    $client = new Client();
    $client
        ->setEndpoint($endpoint)
        ->setProject($project)
        ->setKey($key);

    $databases = new Databases($client);
    $storage = new Storage($client);

    $action = (string) $payload['action'];
    $quoteId = isset($payload['quoteId']) ? (string) $payload['quoteId'] : '';

    if ($action !== 'createLink' && $action !== 'get' && $action !== 'submit') {
        return $res->json(['success' => false, 'error' => 'Invalid action'], 400);
    }

    if (empty($quoteId)) {
        return $res->json(['success' => false, 'error' => 'Missing quoteId'], 400);
    }

    $hashToken = function ($token) {
        return hash('sha256', $token);
    };

    $getTokenHashFromDoc = function ($doc) {
        if (isset($doc['approvalTokenHash']) && is_string($doc['approvalTokenHash']) && strlen($doc['approvalTokenHash']) > 0) {
            return $doc['approvalTokenHash'];
        }
        return '';
    };

    try {
        if ($action === 'createLink') {
            $token = bin2hex(random_bytes(32));
            $tokenHash = $hashToken($token);

            $databases->updateDocument(
                $databaseId,
                $quotesCollectionId,
                $quoteId,
                [
                    'approvalTokenHash' => $tokenHash,
                    'approvalStatus' => 'LinkCreated'
                ]
            );

            return $res->json(['success' => true, 'token' => $token]);
        }

        $token = isset($payload['token']) ? (string) $payload['token'] : '';
        if (empty($token)) {
            return $res->json(['success' => false, 'error' => 'Missing token'], 400);
        }

        $doc = $databases->getDocument($databaseId, $quotesCollectionId, $quoteId);
        $storedHash = $getTokenHashFromDoc($doc);
        if (empty($storedHash) || $hashToken($token) !== $storedHash) {
            return $res->json(['success' => false, 'error' => 'Invalid token'], 403);
        }

        if ($action === 'get') {
            $items = [];
            if (isset($doc['items'])) {
                if (is_string($doc['items'])) {
                    $items = json_decode($doc['items'], true);
                    if (!is_array($items)) $items = [];
                } elseif (is_array($doc['items'])) {
                    $items = $doc['items'];
                }
            }

            return $res->json([
                'success' => true,
                'quote' => [
                    'id' => $doc['$id'] ?? $quoteId,
                    'customerName' => $doc['customerName'] ?? ($doc['customer'] ?? ''),
                    'taxId' => $doc['taxId'] ?? '',
                    'expiry' => $doc['expiry'] ?? '',
                    'items' => $items,
                    'subtotal' => $doc['subtotal'] ?? 0,
                    'total' => $doc['total'] ?? 0,
                    'status' => $doc['status'] ?? '',
                    'approvalStatus' => $doc['approvalStatus'] ?? ''
                ]
            ]);
        }

        if ($action === 'submit') {
            if (empty($bucketId)) {
                return $res->json(['success' => false, 'error' => 'Missing bucket id'], 500);
            }

            $approverName = isset($payload['approverName']) ? trim((string) $payload['approverName']) : '';
            $signatureDataUrl = isset($payload['signatureDataUrl']) ? (string) $payload['signatureDataUrl'] : '';
            $idDocBase64 = isset($payload['idDocBase64']) ? (string) $payload['idDocBase64'] : '';
            $idDocName = isset($payload['idDocName']) ? (string) $payload['idDocName'] : 'id-document';
            $idDocMime = isset($payload['idDocMime']) ? (string) $payload['idDocMime'] : 'application/octet-stream';

            if (empty($approverName) || empty($signatureDataUrl) || empty($idDocBase64)) {
                return $res->json(['success' => false, 'error' => 'Missing approverName/signature/idDoc'], 400);
            }

            if (strpos($signatureDataUrl, 'base64,') === false) {
                return $res->json(['success' => false, 'error' => 'Invalid signatureDataUrl'], 400);
            }

            $sigParts = explode('base64,', $signatureDataUrl, 2);
            $sigBytes = base64_decode($sigParts[1], true);
            if ($sigBytes === false) {
                return $res->json(['success' => false, 'error' => 'Invalid signature base64'], 400);
            }

            $idBytes = base64_decode($idDocBase64, true);
            if ($idBytes === false) {
                return $res->json(['success' => false, 'error' => 'Invalid idDoc base64'], 400);
            }

            $permissions = ['role:users'];

            $sigFile = $storage->createFile(
                $bucketId,
                ID::unique(),
                InputFile::withData($sigBytes, 'quote-' . $quoteId . '-signature.png'),
                $permissions
            );

            $safeIdName = preg_replace('/[^a-zA-Z0-9._-]/', '_', $idDocName);
            $idFile = $storage->createFile(
                $bucketId,
                ID::unique(),
                InputFile::withData($idBytes, 'quote-' . $quoteId . '-' . $safeIdName),
                $permissions
            );

            $databases->updateDocument(
                $databaseId,
                $quotesCollectionId,
                $quoteId,
                [
                    'approvalStatus' => 'PendingVerification',
                    'approvalName' => $approverName,
                    'approvalAt' => date('c'),
                    'signatureFileId' => $sigFile['$id'] ?? null,
                    'idDocFileId' => $idFile['$id'] ?? null,
                    'idDocMime' => $idDocMime,
                    'status' => 'InReview'
                ]
            );

            return $res->json([
                'success' => true,
                'message' => 'Submitted for verification'
            ]);
        }

        return $res->json(['success' => false, 'error' => 'Unhandled action'], 500);
    } catch (\Exception $e) {
        return $res->json(['success' => false, 'error' => $e->getMessage()], 500);
    }
};
