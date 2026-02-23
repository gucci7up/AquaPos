import { Client, Account, Databases, Storage, Functions } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const project = import.meta.env.VITE_APPWRITE_PROJECT_ID;

if (endpoint && project) {
    client
        .setEndpoint(endpoint)
        .setProject(project);
} else {
    console.warn('Appwrite configuration missing!');
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { ID, Query } from 'appwrite';
export default client;
