// API Configuration
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function formatGenres(genres) {
    return genres.slice(0, 3).map(genre => genre.name);
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';

    const genres = formatGenres(anime.genres || []);
    const rating = anime.score ? anime.score.toFixed(1) : 'N/A';

    card.innerHTML = `
        <img class="anime-image"
             src="${anime.images?.jpg?.image_url || anime.images?.jpg?.large_image_url || 'https://via.placeholder.com/200x280?text=No+Image'}"
             alt="${anime.title || anime.title_english || 'Anime'}"
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'">
        <div class="anime-info">
            <h3 class="anime-title">${anime.title || anime.title_english || 'Unknown Title'}</h3>
            <div class="anime-rating">
                <span class="rating-star">★</span>
                <span class="rating-value">${rating}</span>
            </div>
            <div class="anime-genres">
                ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
            <div class="anime-status">${anime.status || anime.aired?.string || 'Unknown'}</div>
        </div>
    `;

    // Make card clickable - navigate to details page
    if (anime.mal_id) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
            window.location.href = `details.html?id=${anime.mal_id}`;
        });

        // Add hover effect indication
        card.setAttribute('title', 'Click to view details');
    }

    return card;
}

function showLoading(sectionId) {
    const loadingElement = document.getElementById(`${sectionId}-loading`);
    const errorElement = document.getElementById(`${sectionId}-error`);
    const gridElement = document.getElementById(`${sectionId}-grid`);
    
    if (loadingElement) loadingElement.style.display = 'block';
    if (errorElement) errorElement.style.display = 'none';
    if (gridElement) gridElement.innerHTML = '';
}

function hideLoading(sectionId) {
    const loadingElement = document.getElementById(`${sectionId}-loading`);
    if (loadingElement) loadingElement.style.display = 'none';
}

function showError(sectionId, message = 'Failed to load anime data. Please try again later.') {
    const loadingElement = document.getElementById(`${sectionId}-loading`);
    const errorElement = document.getElementById(`${sectionId}-error`);
    
    if (loadingElement) loadingElement.style.display = 'none';
    if (errorElement) {
        errorElement.style.display = 'block';
        errorElement.textContent = message;
    }
}

function displayAnimeList(animeList, sectionId) {
    const gridElement = document.getElementById(`${sectionId}-grid`);
    if (!gridElement) return;
    
    hideLoading(sectionId);
    gridElement.innerHTML = '';
    
    if (!animeList || animeList.length === 0) {
        showError(sectionId, 'No anime data available.');
        return;
    }
    
    animeList.forEach(anime => {
        const card = createAnimeCard(anime);
        gridElement.appendChild(card);
    });
}

// API Functions with error handling and rate limiting
async function fetchWithRetry(url, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);
            
            if (response.status === 429) {
                // Rate limited, wait longer
                console.warn(`Rate limited. Retrying in ${delay * (i + 1)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                continue;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function fetchTopAnimeAllTime() {
    showLoading('top-anime');
    try {
        const data = await fetchWithRetry(`${JIKAN_API_BASE}/top/anime?type=tv&filter=bypopularity&limit=12`);
        displayAnimeList(data.data, 'top-anime');
    } catch (error) {
        console.error('Error fetching top anime:', error);
        showError('top-anime');
    }
}

async function fetchTopAiringAnime() {
    showLoading('airing-anime');
    try {
        const data = await fetchWithRetry(`${JIKAN_API_BASE}/top/anime?type=tv&filter=airing&limit=12`);
        displayAnimeList(data.data, 'airing-anime');
    } catch (error) {
        console.error('Error fetching airing anime:', error);
        showError('airing-anime');
    }
}

async function fetchBestRatedAnime() {
    showLoading('rated-anime');
    try {
        const data = await fetchWithRetry(`${JIKAN_API_BASE}/top/anime?type=tv&filter=favorite&limit=12`);
        displayAnimeList(data.data, 'rated-anime');
    } catch (error) {
        console.error('Error fetching rated anime:', error);
        showError('rated-anime');
    }
}

// Initialize the application
async function initializeApp() {
    console.log('Initializing XeeList Anime Database...');
    
    // Add some delay between API calls to respect rate limits
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
        // Fetch data with delays between calls
        await fetchTopAnimeAllTime();
        await delay(500);
        
        await fetchTopAiringAnime();
        await delay(500);
        
        await fetchBestRatedAnime();
        
        console.log('XeeList initialization complete!');
    } catch (error) {
        console.error('Error during app initialization:', error);
    }
}

// Error handling for uncaught errors
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Search functionality for home page
function initializeHomeSearch() {
    const homeSearchForm = document.getElementById('home-search-form');
    const homeSearchInput = document.getElementById('home-search-input');

    if (homeSearchForm && homeSearchInput) {
        homeSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = homeSearchInput.value.trim();
            if (query) {
                // Navigate to search page with query parameter
                window.location.href = `search.html?q=${encodeURIComponent(query)}`;
            }
        });

        // Also handle Enter key on input
        homeSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = homeSearchInput.value.trim();
                if (query) {
                    window.location.href = `search.html?q=${encodeURIComponent(query)}`;
                }
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initializeHomeSearch();
});

// Add smooth scrolling for better UX
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// Add intersection observer for lazy loading optimization
const observerOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        }
    });
}, observerOptions);

// Observe images for lazy loading (if implemented in future)
document.addEventListener('DOMContentLoaded', () => {
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => observer.observe(img));
});
