<?php

use Appwrite\Client;
use Appwrite\Services\Databases;
use Appwrite\ID;

return function ($req, $res) {
    // Input body
    $payload = json_decode($req['payload'], true);

    // Payload validation
    if (!$payload || !isset($payload['items']) || !isset($payload['total'])) {
        return $res->json(['success' => false, 'error' => 'Missing payload data'], 400);
    }

    // Initializing SDK
    $client = new Client();
    $client
        ->setEndpoint($req['variables']['APPWRITE_FUNCTION_ENDPOINT'])
        ->setProject($req['variables']['APPWRITE_FUNCTION_PROJECT_ID'])
        ->setKey($req['variables']['APPWRITE_FUNCTION_API_KEY']);

    $databases = new Databases($client);

    $databaseId = $req['variables']['VITE_APPWRITE_DATABASE_ID'];
    $salesCollectionId = $req['variables']['VITE_APPWRITE_COLLECTION_SALES_ID'];
    $inventoryCollectionId = $req['variables']['VITE_APPWRITE_COLLECTION_INVENTORY_ID'];

    try {
        // 1. Create Sale Document
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

        // 2. Decrement Inventory Stock
        foreach ($payload['items'] as $item) {
            $productId = $item['id'];
            $quantitySold = (int) $item['quantity'];

            // Fetch current product to get latest stock
            $product = $databases->getDocument($databaseId, $inventoryCollectionId, $productId);
            $newStock = max(0, (int) $product['stock'] - $quantitySold);

            $databases->updateDocument(
                $databaseId,
                $inventoryCollectionId,
                $productId,
                ['stock' => $newStock]
            );
        }

        $res->json([
            'success' => true,
            'message' => 'Sale processed and stock updated',
            'sale' => $sale
        ]);
    } catch (\Exception $e) {
        $res->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
};
