export type OfflineSource = {
    id: string;
    title: string;
    savedAt: string;
    chunks: { id: string; sequence: number; title: string; text: string; chapterPage: string | null }[];
};

const DATABASE = "niyakan-nameh-offline";
const STORE = "sources";

function openDatabase() {
    return new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(DATABASE, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error("ذخیره‌سازی آفلاین در این مرورگر در دسترس نیست."));
    });
}

export async function saveOfflineSource(source: OfflineSource) {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite");
        transaction.objectStore(STORE).put(source);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error("ذخیره‌ی آفلاین منبع ناموفق بود."));
    });
    database.close();
}

export async function getOfflineSource(id: string) {
    const database = await openDatabase();
    const source = await new Promise<OfflineSource | undefined>((resolve, reject) => {
        const request = database.transaction(STORE, "readonly").objectStore(STORE).get(id);
        request.onsuccess = () => resolve(request.result as OfflineSource | undefined);
        request.onerror = () => reject(new Error("خواندن منبع آفلاین ناموفق بود."));
    });
    database.close();
    return source;
}

export async function listOfflineSources() {
    const database = await openDatabase();
    const sources = await new Promise<OfflineSource[]>((resolve, reject) => {
        const request = database.transaction(STORE, "readonly").objectStore(STORE).getAll();
        request.onsuccess = () => resolve(request.result as OfflineSource[]);
        request.onerror = () => reject(new Error("فهرست منابع آفلاین در دسترس نیست."));
    });
    database.close();
    return sources;
}

export async function deleteOfflineSource(id: string) {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE, "readwrite");
        transaction.objectStore(STORE).delete(id);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(new Error("حذف نسخه‌ی آفلاین ناموفق بود."));
    });
    database.close();
}
