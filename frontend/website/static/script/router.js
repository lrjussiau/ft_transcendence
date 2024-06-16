const routes = {
    '/': 'static/partials/home.html', // Change to load partial for the home section
    '/login': 'static/partials/login.html',
    '/register': 'static/partials/register.html',
    '/game': 'static/partials/game.html',
    '/pong': 'static/partials/_pong.html'
};

const loadContent = async (path) => {
    console.log('Loading content for path:', path);
    if (!routes[path]) {
        console.error('Path not found:', path);
        return;
    }

    try {
        const response = await fetch(routes[path]);
        if (!response.ok) {
            console.error('Failed to load content:', response.statusText);
            return;
        }
        const content = await response.text();
        const appDiv = document.getElementById('app');
        if (appDiv) {
            appDiv.innerHTML = content;

            // Execute any scripts in the loaded content
            const scripts = appDiv.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');
                newScript.text = script.text;
                document.body.appendChild(newScript);
                document.body.removeChild(newScript);
            });
        } else {
            console.error('#app element not found');
        }
    } catch (error) {
        console.error('Error loading content:', error);
    }
};

const handleRouteChange = () => {
    const path = window.location.pathname;
    const currentPath = document.getElementById('app').getAttribute('data-path');
    console.log('Route change detected, path:', path);

    // Only load content if the path has changed
    if (path !== currentPath) {
        document.getElementById('app').setAttribute('data-path', path);
        loadContent(path);
    }
};

window.onpopstate = handleRouteChange;

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.href.startsWith(window.location.origin)) {
            e.preventDefault();
            const href = e.target.getAttribute('href');
            window.history.pushState({}, '', href);
            handleRouteChange();
        }
    });
    handleRouteChange();
});
