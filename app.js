$(document).ready(function() {
    // Código inicial si es necesario
});

$('#search-btn').click(function() {
    console.log("Botón de búsqueda clickeado");
    const atomUrl = $('#search-input').val();

    if (!atomUrl || !isValidUrl(atomUrl)) {
        alert('Por favor, introduce una URL válida');
        return;
    }

    $.ajax({
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(atomUrl)}`,
        dataType: 'xml',
        success: function(data) {
            console.log("Datos recibidos:", data);
            if (validateFeed(data)) {
                console.log("Feed válido, procesando...");
                processAtomFeed(data);
            } else {
                console.log("Feed no válido");
                alert('El feed no es válido.');
            }
        },
        error: function(xhr, status, error) {
            console.log("Error status: " + status);
            console.log("Error message: " + error);
            console.log("Response text: " + xhr.responseText);
            alert('Error al cargar el feed: ' + error);
        }
    });
});

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

function validateFeed(xmlDoc) {
    return $(xmlDoc).find('feed, rss, channel').length > 0 && 
           $(xmlDoc).find('entry, item').length > 0;
}

let allEntries = []; // Almacena todas las entradas
let currentPage = 1; // Página actual
const entriesPerPage = 10; // Número de entradas por página
let currentEntries = []; // Almacena las entradas mostradas actualmente

function processAtomFeed(xmlDoc) {
    console.log("Procesando feed...");
    allEntries = $(xmlDoc).find('item, entry').toArray(); // Almacena todas las entradas
    currentEntries = allEntries; // Inicialmente, todas las entradas son las mostradas
    renderPage(currentPage, currentEntries); // Renderiza la página inicial con todas las entradas
    showTitleSearch();
}

function renderPage(page, entries = currentEntries) {
    const start = (page - 1) * entriesPerPage;
    const end = start + entriesPerPage;
    const entriesToShow = entries.slice(start, end);
    
    let newsHtml = '';
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    entriesToShow.forEach(function(entry) {
        const title = $(entry).find('title').text();
        const link = $(entry).find('link').text() || $(entry).find('link').attr('href');
        const description = $(entry).find('description, summary').text();
        
        // Try to extract the author/creator
        let author = $(entry).find('dc\\:creator').text() || $(entry).find('creator').text() || 'Autor desconocido';
        
        const pubDate = new Date($(entry).find('pubDate, published').text()).toLocaleString();
        
        let image =
            $(entry).find('enclosure').attr('url') ||
            $(entry).find('media\\:content').attr('url') ||
            $(entry).find('media\\:thumbnail').attr('url') ||
            $('<div>').html(description).find('img').attr('src') ||
            'https://via.placeholder.com/300x200';

        const id = `news-${allEntries.indexOf(entry)}`;
        const isFavorite = favorites.includes(id);

        const categories = $(entry).find('category').map(function() {
            return $(this).text();
        }).get();

        const categoryHtml = categories.map(category => 
            `<span class="badge bg-secondary me-1">${category}</span>`
        ).join('');

        newsHtml += `
            <div class="col-md-4 mb-4">
                <div class="card h-100">
                    <img 
                        src="${image}" 
                        class="card-img-top" 
                        alt="${title}" 
                        style="max-height: 200px; object-fit: cover;"
                        onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200';"
                    >
                    <div class="card-body">
                        <h5 class="card-title">${title}</h5>
                        <h6 class="card-subtitle mb-2 text-muted">${author} - ${pubDate}</h6>
                        <p class="card-text">${description.substring(0, 100)}...</p>
                        <div class="mb-2">${categoryHtml}</div>
                        <a href="${link}" class="btn btn-primary custom-read-more-btn" target="_blank">Leer más</a>
                        <button class="btn favorite-btn ${isFavorite ? 'active' : ''}" data-id="${id}">
                            <i class="bi ${isFavorite ? 'bi-star-fill' : 'bi-star'}"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    $('#news-container').html(newsHtml);
    updatePagination(entries.length);
}

function updatePagination(totalEntries) {
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    let paginationHtml = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">Anterior</a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    paginationHtml += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">Siguiente</a>
        </li>
    `;

    $('#pagination').html(paginationHtml);
}

function changePage(e) {
    e.preventDefault();
    const newPage = $(this).data('page');
    if (newPage >= 1 && newPage <= Math.ceil(currentEntries.length / entriesPerPage)) { // Usa currentEntries
        currentPage = newPage;
        renderPage(currentPage, currentEntries); // Pasa currentEntries a renderPage
    }
}

$(document).on('click', '.page-link', function(e) {
    e.preventDefault();
    currentPage = $(this).data('page');
    renderPage(currentPage, currentEntries); // Pasa currentEntries a renderPage
});

$(document).on('click', '.favorite-btn', function() {
    let $btn = $(this);
    let id = $btn.data('id');
    let isFavorite = $btn.hasClass('active');
    
    if (isFavorite) {
        // Quitar de favoritos
        $btn.removeClass('active');
        $btn.find('i').removeClass('bi-star-fill').addClass('bi-star');
        // Aquí tu lógica para quitar de favoritos
    } else {
        // Añadir a favoritos
        $btn.addClass('active');
        $btn.find('i').removeClass('bi-star').addClass('bi-star-fill');
        // Aquí tu lógica para añadir a favoritos
    }
});


$('#favorites-btn').click(function() {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');

    const favoriteEntries = allEntries.filter(entry => favorites.includes(`news-${allEntries.indexOf(entry)}`));

    if (favoriteEntries.length > 0) {
        currentPage = 1;
        currentEntries = favoriteEntries; // Actualiza currentEntries con los favoritos
        renderPage(currentPage, currentEntries);
    } else {
        alert('No hay favoritos guardados.');
    }
});

function renderFavoritePage(favoriteEntries) {
    let newsHtml = '';

    favoriteEntries.forEach(function(entry) {
        const title = $(entry).find('title').text();
        const link = $(entry).find('link').text() || $(entry).find('link').attr('href');
        const description = $(entry).find('description, summary').text();
                // Try to extract the author/creator
        let author = $(entry).find('dc\\:creator').text() || $(entry).find('creator').text() || 'Autor desconocido';
        const pubDate = new Date($(entry).find('pubDate, published').text()).toLocaleString();
        
        let image =
            $(entry).find('enclosure').attr('url') ||
            $(entry).find('media\\:content').attr('url') ||
            $(entry).find('media\\:thumbnail').attr('url') ||
            $('<div>').html(description).find('img').attr('src') ||
            'https://via.placeholder.com/300x200';

        const id = `news-${allEntries.indexOf(entry)}`;

        const categories = $(entry).find('category').map(function() {
            return $(this).text();
        }).get();

        const categoryHtml = categories.map(category => 
            `<span class="badge bg-secondary me-1">${category}</span>`
        ).join('');

        newsHtml += `
        <div class="col-md-4 mb-4">
            <div class="card h-100">
                <img 
                    src="${image}" 
                    class="card-img-top" 
                    alt="${title}" 
                    style="max-height: 200px; object-fit: cover;"
                    onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200';"
                >
                <div class="card-body">
                    <h5 class="card-title">${title}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">${author} - ${pubDate}</h6>
                    <p class="card-text">${description.substring(0, 100)}...</p>
                    <div class="mb-2">${categoryHtml}</div>
                    <a href="${link}" class="btn custom-read-more-btn" target="_blank">Leer más</a>
                    <button class="btn favorite-btn ${isFavorite ? 'active' : ''}" data-id="${id}">
                            <i class="bi ${isFavorite ? 'bi-star-fill' : 'bi-star'}"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
    });

    $('#news-container').html(newsHtml);
    updatePagination(favoriteEntries.length);
}

function showTitleSearch() {
    $('#title-search-container').fadeIn();
}

function filterTitles(searchText) {
    const filteredEntries = allEntries.filter(entry => {
        const title = $(entry).find('title').text().toLowerCase();
        return title.includes(searchText);
    });

    currentPage = 1; // Reset to the first page
    currentEntries = filteredEntries; // Update currentEntries with filtered results
    renderPage(currentPage, currentEntries); // Render with filtered results
}

$(document).ready(function() {
    $('#title-search').on('keyup', function() {
        const searchText = $(this).val().toLowerCase();
        filterTitles(searchText);
    });
});
