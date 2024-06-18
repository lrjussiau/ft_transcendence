const routes = {
    '/': 'static/partials/home.html',
    '/login': 'static/partials/login.html',
    '/register': 'static/partials/register.html',
    '/game': 'static/partials/game.html',
};

let isFetching = false;

const loadContent = async (path) => {
    if (isFetching) {
        return;
    }
    isFetching = true;
    
    if (!routes[path]) {
        console.error('Path not found:', path);
        isFetching = false;
        return;
    }

    try {
        const response = await fetch(routes[path]);
        if (!response.ok) {
            console.error('Failed to load content:', response.statusText);
            isFetching = false;
            return;
        }
        const content = await response.text();

        const appDiv = document.getElementById('app');
        if (appDiv) {
            appDiv.innerHTML = content;

            const scripts = appDiv.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');
                newScript.text = script.text;
                document.body.appendChild(newScript).parentNode.removeChild(newScript);
            });
        } else {
            console.error('#app element not found');
        }
    } catch (error) {
        console.error('Error loading content:', error);
    }

    isFetching = false;
};

const handleRouteChange = () => {
    let path = window.location.pathname;

    if (path === '') {
        path = '/';
    }
    
    const appDiv = document.getElementById('app');
    const currentPath = appDiv.getAttribute('data-path');

    appDiv.setAttribute('data-path', path);
    loadContent(path);
};

document.addEventListener('DOMContentLoaded', () => {
    handleRouteChange();
    document.body.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.href.startsWith(window.location.origin)) {
            e.preventDefault();
            const href = e.target.getAttribute('href');
            console.log('Navigation link clicked, href:', href);
            window.history.pushState({}, '', href);
            handleRouteChange();
        }
    });

    const closeModalButton = document.getElementById('close-modal-button');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            console.log('Close button clicked, redirecting to /');
            window.history.pushState({}, '', '/');
            handleRouteChange();
        });
    }
});

window.onpopstate = handleRouteChange;
