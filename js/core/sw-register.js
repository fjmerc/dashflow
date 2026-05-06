if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => {
            if (window.Logger) Logger.info('ServiceWorker registration successful');
            else console.log('ServiceWorker registration successful');
        })
        .catch(err => {
            if (window.Logger) Logger.error('ServiceWorker registration failed:', err);
            else console.error('ServiceWorker registration failed:', err);
        });
}
