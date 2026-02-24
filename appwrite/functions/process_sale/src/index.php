<?php

use Appwrite\Client;
use Appwrite\Services\Databases;
use Appwrite\ID;

return function ($context) {
    $req = $context->req;
    $res = $context->res;

    // Input body (Appwrite 1.4+ body is already parsed if JSON)
    $payload = $req->body;
    if (is_string($payload)) {
        $payload = json_decode($payload, true);
    }

    $context->log('Processing sale payload: ' . json_encode($payload));

    // Payload validation
    if (!$payload || !isset($payload['items']) || !isset($payload['total'])) {
        return $res->json(['success' => false, 'error' => 'Missing payload data (items/total)'], 400);
    }

    // Initializing SDK using Environment Variables from $req->variables (Legacy) or $_ENV (Modern)
    // Most reliable is using $context->variables for Appwrite 1.4+
    $variables = $context->variables;

    $client = new Client();
    $client
        ->setEndpoint($variables['APPWRITE_FUNCTION_ENDPOINT'] ?? '')
        ->setProject($variables['APPWRITE_FUNCTION_PROJECT_ID'] ?? '')
        ->setKey($variables['APPWRITE_FUNCTION_API_KEY'] ?? '');

    $databases = new Databases($client);

    $databaseId = $variables['VITE_APPWRITE_DATABASE_ID'] ?? '';
    $salesCollectionId = $variables['VITE_APPWRITE_COLLECTION_SALES_ID'] ?? '';
    $inventoryCollectionId = $variables['VITE_APPWRITE_COLLECTION_INVENTORY_ID'] ?? '';

    if (empty($databaseId) || empty($salesCollectionId)) {
        return $res->json(['success' => false, 'error' => 'Environment variables missing in Function settings'], 500);
    }

    $context->log('Connecting to Appwrite at: ' . $variables['APPWRITE_FUNCTION_ENDPOINT']);

    try {
        // 1. Create Sale Document
        $context->log('Attempting to create sale document...');
        $sale = $databases->createDocument(
            $databaseId,
            $salesCollectionId,
            ID::unique(),
            [
                'customerId' => $payload['customerId'] ?? null,
                'items' => json_encode($payload['items']),
                'total' => (float) $payload['total'],
                'paymentMethod' => $payload['paymentMethod'] ?? 'Cash',
                'date' => date('c') // ISO 8601
            ]
        );

        $context->log('Sale document created: ' . $sale['$id']);

        // 2. Decrement Inventory Stock
        foreach ($payload['items'] as $item) {
            $productId = $item['id'];
            $quantitySold = (int) $item['quantity'];

            // Fetch current product to get latest stock
            try {
                $product = $databases->getDocument($databaseId, $inventoryCollectionId, $productId);
                $newStock = max(0, (int) $product['stock'] - $quantitySold);

                $databases->updateDocument(
                    $databaseId,
                    $inventoryCollectionId,
                    $productId,
                    ['stock' => $newStock]
                );
                $context->log("Updated stock for $productId: $newStock");
            } catch (\Exception $innerEx) {
                $context->error("Error updating stock for $productId: " . $innerEx->getMessage());
                // Non-fatal error for the whole sale, but should be logged
            }
        }

        return $res->json([
            'success' => true,
            'message' => 'Sale processed and stock updated',
            'sale' => $sale
        ]);
    } catch (\Exception $e) {
        $context->error('Processing Error: ' . $e->getMessage());
        return $res->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
};
