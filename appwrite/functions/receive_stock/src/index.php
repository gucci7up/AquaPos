<?php

use Appwrite\Client;
use Appwrite\Services\Databases;
use Appwrite\ID;

return function ($context) {
    // Initialize Appwrite Client
    $client = new Client();
    $client
        ->setEndpoint(getenv('APPWRITE_FUNCTION_ENDPOINT'))
        ->setProject(getenv('APPWRITE_FUNCTION_PROJECT_ID'))
        ->setKey(getenv('APPWRITE_FUNCTION_API_KEY'));

    $databases = new Databases($client);

    $databaseId = getenv('VITE_APPWRITE_DATABASE_ID');
    $ordersCollectionId = getenv('VITE_APPWRITE_COLLECTION_ORDERS_ID');
    $inventoryCollectionId = getenv('VITE_APPWRITE_COLLECTION_INVENTORY_ID');

    // Parse Payload
    $payload = json_decode($context->req->body, true);
    if (!$payload || !isset($payload['orderId'])) {
        return $context->res->json([
            'success' => false,
            'error' => 'Invalid payload. orderId is required.'
        ], 400);
    }

    $orderId = $payload['orderId'];

    try {
        // 1. Fetch Order
        $order = $databases->getDocument($databaseId, $ordersCollectionId, $orderId);

        if ($order['status'] === 'Received') {
            return $context->res->json([
                'success' => false,
                'error' => 'Order already received.'
            ]);
        }

        $items = json_decode($order['items'], true);

        // 2. Increment Inventory Stock
        foreach ($items as $item) {
            $productId = $item['productId'];
            $quantityAdded = (int) $item['qty'];

            // Fetch current product to get latest stock
            $product = $databases->getDocument($databaseId, $inventoryCollectionId, $productId);
            $newStock = (int) $product['stock'] + $quantityAdded;

            $databases->updateDocument(
                $databaseId,
                $inventoryCollectionId,
                $productId,
                ['stock' => $newStock]
            );
        }

        // 3. Mark Order as Received
        $databases->updateDocument(
            $databaseId,
            $ordersCollectionId,
            $orderId,
            ['status' => 'Received']
        );

        return $context->res->json([
            'success' => true,
            'message' => 'Stock received and inventory updated successfully.'
        ]);

    } catch (\Exception $e) {
        return $context->res->json([
            'success' => false,
            'error' => $e->getMessage()
        ], 500);
    }
};
