<?php

use Appwrite\Client;
use Appwrite\Services\Databases;
use Appwrite\ID;

/**
 * Hybrid Function for Appwrite (Supports 0.13 to 1.5+)
 */
return function ($context, $res_legacy = null) {
    // 1. Determine Signature Type
    $is_modern = ($res_legacy === null);
    $req = $is_modern ? $context->req : $context;
    $res = $is_modern ? $context->res : $res_legacy;

    // 2. Universal Logging helper
    $log = function ($msg) use ($context, $is_modern) {
        if ($is_modern) {
            $context->log($msg);
        } else {
            echo $msg . PHP_EOL;
        }
    };

    $log('--- Function Process Sale Started (Hybrid) ---');

    // 3. Get Payload
    $payload = $is_modern ? ($req->body ?? null) : (isset($req['payload']) ? json_decode($req['payload'], true) : null);
    if (is_string($payload)) {
        $payload = json_decode($payload, true);
    }

    $log('Payload keys: ' . ($payload ? implode(', ', array_keys($payload)) : 'EMPTY'));

    if (!$payload || !isset($payload['items']) || !isset($payload['total'])) {
        return $res->json(['success' => false, 'error' => 'Missing payload data (items/total)'], 400);
    }

    // 4. Get Variables
    $vars = $is_modern ? ($context->variables ?? $_ENV) : ($req['variables'] ?? $_ENV);

    $databaseId = $vars['VITE_APPWRITE_DATABASE_ID'] ?? '';
    $salesCollectionId = $vars['VITE_APPWRITE_COLLECTION_SALES_ID'] ?? '';
    $inventoryCollectionId = $vars['VITE_APPWRITE_COLLECTION_INVENTORY_ID'] ?? '';
    $endpoint = $vars['APPWRITE_FUNCTION_ENDPOINT'] ?? '';
    $project = $vars['APPWRITE_FUNCTION_PROJECT_ID'] ?? '';
    $key = $vars['APPWRITE_FUNCTION_API_KEY'] ?? '';

    if (empty($databaseId) || empty($salesCollectionId)) {
        $log('Error: Missing environment variables');
        return $res->json(['success' => false, 'error' => 'Environment variables missing (DB/Sales ID)'], 500);
    }

    // 5. Initialize Client
    $client = new Client();
    $client
        ->setEndpoint($endpoint)
        ->setProject($project)
        ->setKey($key);

    $databases = new Databases($client);
    $log('Connecting to: ' . $endpoint);

    try {
        // 6. Create Sale
        $log('Creating sale document...');
        $sale = $databases->createDocument(
            $databaseId,
            $salesCollectionId,
            ID::unique(),
            [
                'customerId' => $payload['customerId'] ?? null,
                'items' => json_encode($payload['items']),
                'total' => (float) $payload['total'],
                'paymentMethod' => $payload['paymentMethod'] ?? 'Cash',
                'date' => date('c')
            ]
        );

        $log('Sale created: ' . $sale['$id']);

        // 7. Update Inventory
        foreach ($payload['items'] as $item) {
            $productId = $item['id'];
            $qty = (int) $item['quantity'];
            try {
                $product = $databases->getDocument($databaseId, $inventoryCollectionId, $productId);
                $newStock = max(0, (int) $product['stock'] - $qty);
                $databases->updateDocument($databaseId, $inventoryCollectionId, $productId, ['stock' => $newStock]);
                $log("Stock updated for $productId: $newStock");
            } catch (\Exception $inner) {
                $log("Error updating stock for $productId: " . $inner->getMessage());
            }
        }

        return $res->json([
            'success' => true,
            'message' => 'Sale processed successfully',
            'sale' => $sale
        ]);

    } catch (\Exception $e) {
        $log('Critical Error: ' . $e->getMessage());
        return $res->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
};
