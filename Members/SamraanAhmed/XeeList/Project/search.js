// API Configuration
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

// State management
let currentPage = 1;
let currentQuery = '';
let currentFilters = {};
let totalResults = 0;
let isSearching = false;

// DOM Elements
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const filterToggle = document.getElementById('filter-toggle');
const filterContainer = document.getElementById('filter-container');
const applyFiltersBtn = document.getElementById('apply-filters');
const clearFiltersBtn = document.getElementById('clear-filters');
const searchResults = document.getElementById('search-results');
const searchLoading = document.getElementById('search-loading');
const searchError = document.getElementById('search-error');
const resultsTitle = document.getElementById('results-title');
const resultsCount = document.getElementById('results-count');
const paginationContainer = document.getElementById('pagination-container');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const paginationInfo = document.getElementById('pagination-info');

// Filter elements
const genreFilter = document.getElementById('genre-filter');
const typeFilter = document.getElementById('type-filter');
const statusFilter = document.getElementById('status-filter');
const ratingFilter = document.getElementById('rating-filter');
const orderFilter = document.getElementById('order-filter');
const sortFilter = document.getElementById('sort-filter');

// Utility Functions
function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        q: params.get('q') || '',
        genre: params.get('genre') || '',
        type: params.get('type') || '',
        status: params.get('status') || '',
        rating: params.get('rating') || '',
        order: params.get('order') || 'score',
        sort: params.get('sort') || 'desc',
        page: parseInt(params.get('page')) || 1
    };
}

function updateUrlParams(params) {
    const url = new URL(window.location);
    Object.keys(params).forEach(key => {
        if (params[key]) {
            url.searchParams.set(key, params[key]);
        } else {
            url.searchParams.delete(key);
        }
    });
    history.pushState({}, '', url);
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';

    const genres = anime.genres ? anime.genres.slice(0, 3).map(genre => genre.name) : [];
    const rating = anime.score ? anime.score.toFixed(1) : 'N/A';
    const year = anime.aired?.from ? new Date(anime.aired.from).getFullYear() : 'Unknown';

    card.innerHTML = `
        <img class="anime-image"
             src="${anime.images?.jpg?.image_url || 'https://via.placeholder.com/200x280?text=No+Image'}"
             alt="${anime.title || 'Anime'}"
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'">
        <div class="anime-info">
            <h3 class="anime-title">${anime.title || 'Unknown Title'}</h3>
            <div class="anime-rating">
                <span class="rating-star">★</span>
                <span class="rating-value">${rating}</span>
            </div>
            <div class="anime-genres">
                ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
            <div class="anime-meta">
                <div class="anime-status">${anime.status || 'Unknown'}</div>
                <div class="anime-year">${year}</div>
            </div>
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

function showLoading() {
    searchLoading.style.display = 'block';
    searchError.style.display = 'none';
    searchResults.innerHTML = '';
    paginationContainer.style.display = 'none';
}

function hideLoading() {
    searchLoading.style.display = 'none';
}

function showError(message = 'No anime found. Try adjusting your search terms or filters.') {
    hideLoading();
    searchError.style.display = 'block';
    searchError.textContent = message;
    searchResults.innerHTML = '';
    paginationContainer.style.display = 'none';
    updateResultsInfo(0, '');
}

function updateResultsInfo(count, query) {
    if (query) {
        resultsTitle.textContent = `Search Results for "${query}"`;
    } else {
        resultsTitle.textContent = 'Search Results';
    }
    
    if (count > 0) {
        resultsCount.textContent = `${count} anime found`;
    } else {
        resultsCount.textContent = '';
    }
}

function updatePagination(currentPage, hasNextPage) {
    paginationInfo.textContent = `Page ${currentPage}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = !hasNextPage;
    
    if (totalResults > 0) {
        paginationContainer.style.display = 'flex';
    } else {
        paginationContainer.style.display = 'none';
    }
}

async function fetchWithRetry(url, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);
            
            if (response.status === 429) {
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

function buildSearchUrl(query, filters, page = 1) {
    let url = `${JIKAN_API_BASE}/anime?page=${page}&limit=20`;
    
    if (query.trim()) {
        url += `&q=${encodeURIComponent(query.trim())}`;
    }
    
    if (filters.genre) {
        url += `&genres=${filters.genre}`;
    }
    
    if (filters.type) {
        url += `&type=${filters.type}`;
    }
    
    if (filters.status) {
        url += `&status=${filters.status}`;
    }
    
    if (filters.rating) {
        url += `&min_score=${filters.rating}`;
    }
    
    if (filters.order) {
        url += `&order_by=${filters.order}`;
    }
    
    if (filters.sort) {
        url += `&sort=${filters.sort}`;
    }
    
    return url;
}

async function performSearch(query = currentQuery, filters = currentFilters, page = 1) {
    if (isSearching) return;
    
    isSearching = true;
    currentQuery = query;
    currentFilters = { ...filters };
    currentPage = page;
    
    showLoading();
    
    try {
        const searchUrl = buildSearchUrl(query, filters, page);
        console.log('Searching with URL:', searchUrl);
        
        const data = await fetchWithRetry(searchUrl);
        
        hideLoading();
        searchError.style.display = 'none';
        
        if (!data.data || data.data.length === 0) {
            showError();
            return;
        }
        
        // Display results
        searchResults.innerHTML = '';
        data.data.forEach(anime => {
            const card = createAnimeCard(anime);
            searchResults.appendChild(card);
        });
        
        // Update pagination and results info
        totalResults = data.pagination?.items?.total || 0;
        const hasNextPage = data.pagination?.has_next_page || false;
        
        updateResultsInfo(totalResults, query);
        updatePagination(page, hasNextPage);
        
        // Update URL
        updateUrlParams({
            q: query,
            ...filters,
            page: page > 1 ? page : ''
        });
        
    } catch (error) {
        console.error('Search error:', error);
        showError('Search failed. Please try again later.');
    } finally {
        isSearching = false;
    }
}

function getCurrentFilters() {
    return {
        genre: genreFilter.value,
        type: typeFilter.value,
        status: statusFilter.value,
        rating: ratingFilter.value,
        order: orderFilter.value,
        sort: sortFilter.value
    };
}

function setFiltersFromParams(params) {
    genreFilter.value = params.genre || '';
    typeFilter.value = params.type || '';
    statusFilter.value = params.status || '';
    ratingFilter.value = params.rating || '';
    orderFilter.value = params.order || 'score';
    sortFilter.value = params.sort || 'desc';
}

function clearAllFilters() {
    genreFilter.value = '';
    typeFilter.value = '';
    statusFilter.value = '';
    ratingFilter.value = '';
    orderFilter.value = 'score';
    sortFilter.value = 'desc';
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize from URL parameters
    const urlParams = getUrlParams();
    if (urlParams.q) {
        searchInput.value = urlParams.q;
    }
    setFiltersFromParams(urlParams);
    
    // Perform initial search if there's a query
    if (urlParams.q || Object.values(urlParams).some(val => val && val !== 'score' && val !== 'desc' && val !== 1)) {
        performSearch(urlParams.q, {
            genre: urlParams.genre,
            type: urlParams.type,
            status: urlParams.status,
            rating: urlParams.rating,
            order: urlParams.order,
            sort: urlParams.sort
        }, urlParams.page);
    }
});

// Search form submission
searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    const filters = getCurrentFilters();
    performSearch(query, filters, 1);
});

// Filter toggle
filterToggle.addEventListener('click', () => {
    filterContainer.classList.toggle('active');
    filterToggle.classList.toggle('active');
});

// Apply filters
applyFiltersBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    const filters = getCurrentFilters();
    performSearch(query, filters, 1);
});

// Clear filters
clearFiltersBtn.addEventListener('click', () => {
    clearAllFilters();
    const query = searchInput.value.trim();
    performSearch(query, {}, 1);
});

// Pagination
prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        performSearch(currentQuery, currentFilters, currentPage - 1);
    }
});

nextPageBtn.addEventListener('click', () => {
    performSearch(currentQuery, currentFilters, currentPage + 1);
});

// Real-time search with debouncing
let searchTimeout;
searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        if (searchInput.value.trim().length >= 3) {
            const filters = getCurrentFilters();
            performSearch(searchInput.value.trim(), filters, 1);
        }
    }, 500);
});

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

console.log('Search page initialized successfully!');
