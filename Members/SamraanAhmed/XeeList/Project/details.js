// API Configuration
const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

// State management
let currentAnimeId = null;
let isLoading = false;

// DOM Elements
const detailsLoading = document.getElementById('details-loading');
const detailsError = document.getElementById('details-error');
const animeDetails = document.getElementById('anime-details');

// Anime detail elements
const animePosterImg = document.getElementById('anime-poster-img');
const animeTitle = document.getElementById('anime-title');
const animeTitleEnglish = document.getElementById('anime-title-english');
const animeTitleJapanese = document.getElementById('anime-title-japanese');
const animeRating = document.getElementById('anime-rating');
const animeType = document.getElementById('anime-type');
const animeEpisodes = document.getElementById('anime-episodes');
const animeStatus = document.getElementById('anime-status');
const animeDuration = document.getElementById('anime-duration');
const animeYear = document.getElementById('anime-year');
const animeGenresDetail = document.getElementById('anime-genres-detail');
const animeSynopsis = document.getElementById('anime-synopsis');
const animeStudios = document.getElementById('anime-studios');
const animeProducers = document.getElementById('anime-producers');
const animeSource = document.getElementById('anime-source');
const animeScoreDetail = document.getElementById('anime-score-detail');
const animeRank = document.getElementById('anime-rank');
const animePopularity = document.getElementById('anime-popularity');
const animeMembers = document.getElementById('anime-members');
const animeFavorites = document.getElementById('anime-favorites');
const animeAired = document.getElementById('anime-aired');
const animeSeason = document.getElementById('anime-season');
const animeBroadcast = document.getElementById('anime-broadcast');
const malLink = document.getElementById('mal-link');

// Utility Functions
function getAnimeIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function formatNumber(num) {
    if (!num) return 'N/A';
    return num.toLocaleString();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatAiredDates(aired) {
    if (!aired) return 'N/A';
    
    const fromDate = aired.from ? formatDate(aired.from) : null;
    const toDate = aired.to ? formatDate(aired.to) : null;
    
    if (fromDate && toDate) {
        return `${fromDate} to ${toDate}`;
    } else if (fromDate) {
        return `${fromDate} to Present`;
    } else {
        return aired.string || 'N/A';
    }
}

function createGenreTags(genres) {
    return genres.map(genre => 
        `<span class="genre-tag-detail">${genre.name}</span>`
    ).join('');
}

function createStudioList(studios) {
    if (!studios || studios.length === 0) return 'N/A';
    return studios.map(studio => studio.name).join(', ');
}

function createProducerList(producers) {
    if (!producers || producers.length === 0) return 'N/A';
    return producers.slice(0, 5).map(producer => producer.name).join(', ');
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

function showLoading() {
    detailsLoading.style.display = 'block';
    detailsError.style.display = 'none';
    animeDetails.style.display = 'none';
}

function showError() {
    detailsLoading.style.display = 'none';
    detailsError.style.display = 'block';
    animeDetails.style.display = 'none';
}

function showDetails() {
    detailsLoading.style.display = 'none';
    detailsError.style.display = 'none';
    animeDetails.style.display = 'block';
}

function updatePageTitle(animeTitle) {
    document.title = `${animeTitle} - XeeList`;
}

function populateAnimeDetails(anime) {
    // Basic Information
    const title = anime.title || 'Unknown Title';
    animeTitle.textContent = title;
    updatePageTitle(title);
    
    // Alternative titles
    if (anime.title_english && anime.title_english !== title) {
        animeTitleEnglish.textContent = anime.title_english;
        animeTitleEnglish.style.display = 'block';
    } else {
        animeTitleEnglish.style.display = 'none';
    }
    
    if (anime.title_japanese && anime.title_japanese !== title) {
        animeTitleJapanese.textContent = anime.title_japanese;
        animeTitleJapanese.style.display = 'block';
    } else {
        animeTitleJapanese.style.display = 'none';
    }
    
    // Poster image
    const posterUrl = anime.images?.jpg?.large_image_url || 
                     anime.images?.jpg?.image_url || 
                     'https://via.placeholder.com/300x425?text=No+Image';
    animePosterImg.src = posterUrl;
    animePosterImg.alt = title;
    
    // Meta information
    animeRating.textContent = anime.score ? anime.score.toFixed(1) : 'N/A';
    animeType.textContent = anime.type || 'N/A';
    animeEpisodes.textContent = anime.episodes ? `${anime.episodes} episodes` : (anime.episodes === 0 ? 'Unknown' : 'N/A');
    animeStatus.textContent = anime.status || 'N/A';
    animeDuration.textContent = anime.duration || 'N/A';
    
    // Year
    const year = anime.aired?.from ? new Date(anime.aired.from).getFullYear() : null;
    animeYear.textContent = year || 'N/A';
    
    // Genres
    if (anime.genres && anime.genres.length > 0) {
        animeGenresDetail.innerHTML = createGenreTags(anime.genres);
    } else {
        animeGenresDetail.innerHTML = '<span class="genre-tag-detail">No genres available</span>';
    }
    
    // Synopsis
    animeSynopsis.textContent = anime.synopsis || 'No synopsis available.';
    
    // Production information
    animeStudios.textContent = createStudioList(anime.studios);
    animeProducers.textContent = createProducerList(anime.producers);
    animeSource.textContent = anime.source || 'N/A';
    
    // Statistics
    animeScoreDetail.textContent = anime.score ? anime.score.toFixed(2) : 'N/A';
    animeRank.textContent = anime.rank ? `#${formatNumber(anime.rank)}` : 'N/A';
    animePopularity.textContent = anime.popularity ? `#${formatNumber(anime.popularity)}` : 'N/A';
    animeMembers.textContent = anime.members ? formatNumber(anime.members) : 'N/A';
    animeFavorites.textContent = anime.favorites ? formatNumber(anime.favorites) : 'N/A';
    
    // Broadcast information
    animeAired.textContent = formatAiredDates(anime.aired);
    
    // Season information
    if (anime.season && anime.year) {
        animeSeason.textContent = `${anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} ${anime.year}`;
    } else {
        animeSeason.textContent = 'N/A';
    }
    
    // Broadcast day and time
    if (anime.broadcast && anime.broadcast.string) {
        animeBroadcast.textContent = anime.broadcast.string;
    } else {
        animeBroadcast.textContent = 'N/A';
    }
    
    // External links
    if (anime.mal_id) {
        malLink.href = `https://myanimelist.net/anime/${anime.mal_id}`;
        malLink.style.display = 'inline-flex';
    } else {
        malLink.style.display = 'none';
    }
}

async function fetchAnimeDetails(animeId) {
    if (isLoading || !animeId) return;
    
    isLoading = true;
    showLoading();
    
    try {
        const url = `${JIKAN_API_BASE}/anime/${animeId}`;
        console.log('Fetching anime details:', url);
        
        const response = await fetchWithRetry(url);
        
        if (!response.data) {
            throw new Error('No anime data received');
        }
        
        populateAnimeDetails(response.data);
        showDetails();
        
        console.log('Anime details loaded successfully:', response.data.title);
        
    } catch (error) {
        console.error('Error fetching anime details:', error);
        showError();
    } finally {
        isLoading = false;
    }
}

// Initialize the page
function initializeDetailsPage() {
    const animeId = getAnimeIdFromUrl();
    
    if (!animeId) {
        console.error('No anime ID found in URL');
        showError();
        return;
    }
    
    currentAnimeId = animeId;
    fetchAnimeDetails(animeId);
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Handle image load errors
document.addEventListener('DOMContentLoaded', () => {
    initializeDetailsPage();
    
    // Add fallback for poster image
    animePosterImg.addEventListener('error', function() {
        this.src = 'https://via.placeholder.com/300x425?text=No+Image';
    });
});

console.log('Anime details page initialized!');
