export default function(view, params) {
    'use strict';
    
    (function injectCSS() {
        if (document.getElementById('jellymix-styles')) {
            console.log('JellyMix: CSS already injected');
            return;
        }
        console.log('JellyMix: Injecting CSS');
        const link = document.createElement('link');
        link.id = 'jellymix-styles';
        link.rel = 'stylesheet';
        link.href = '/web/configurationpage?name=jellymix.css';
        document.head.appendChild(link);
    })();
    
    const API_BASE = '/JellyMix';
    const blockNames = ['Opener', 'Building', 'Peak', 'Wind Down', 'Closer'];
    const GENRE_PALETTE = ['#cf7edc', '#f06fac', '#f47278', '#df834c', '#b89831', '#84a73a', '#3cb163', '#00b598', '#00b3cc'];
    
    let state = {
        libraries: [],
        selectedLibraryIds: [],
        genres: [],
        selectedGenres: [],
        genreColors: {},
        yearStart: null,
        yearEnd: null,
        duration: 4,
        numBlocks: 3,
        blockConfigs: [],
        preview: null,
        playlists: [],
        draggedItem: null,
        editingPlaylistId: null
    };

    function assignGenreColors() {
        state.genreColors = {};
        const genresToColor = state.selectedGenres.length > 0 ? state.selectedGenres : state.genres.map(g => g.Name);
        const count = genresToColor.length;
        let indices = [];
        if (count === 1) {
            indices = [4];
        } else if (count === 2) {
            indices = [1, 6];
        } else if (count === 3) {
            indices = [1, 4, 7];
        } else if (count === 4) {
            indices = [0, 2, 5, 8];
        } else if (count === 5) {
            indices = [0, 2, 4, 6, 8];
        } else if (count === 6) {
            indices = [0, 1, 3, 5, 7, 8];
        } else if (count === 7) {
            indices = [0, 1, 3, 4, 5, 7, 8];
        } else if (count === 8) {
            indices = [0, 1, 2, 3, 5, 6, 7, 8];
        } else {
            for (let i = 0; i < count; i++) {
                indices.push(i % 9);
            }
        }
        genresToColor.forEach((genre, i) => {
            state.genreColors[genre] = GENRE_PALETTE[indices[i] !== undefined ? indices[i] : i % 9];
        });
    }

    function setupTabs() {
        view.querySelectorAll('.viewTab').forEach(tab => {
            tab.addEventListener('click', () => {
                view.querySelectorAll('.viewTab').forEach(t => t.classList.remove('active'));
                view.querySelectorAll('.jellymix-tab-content').forEach(c => c.classList.add('jellymix-hidden'));
                tab.classList.add('active');
                view.querySelector('#jellymix-' + tab.dataset.tab).classList.remove('jellymix-hidden');
                if (tab.dataset.tab === 'create') {
                    resetCreateForm();
                } else if (tab.dataset.tab === 'manage') {
                    stopTipRotation();
                    loadPlaylists();
                }
            });
        });
    }

    function resetCreateForm() {
        state.editingPlaylistId = null;
        state.selectedLibraryIds = [];
        state.selectedGenres = [];
        state.blockConfigs = [];
        state.preview = null;
        state.yearStart = null;
        state.yearEnd = null;
        state.duration = 4;
        state.numBlocks = 3;
        view.querySelector('#duration-select').value = '4';
        view.querySelector('#num-blocks').value = '3';
        view.querySelector('#year-start').value = '';
        view.querySelector('#year-end').value = '';
        view.querySelectorAll('.jellymix-checkbox-item').forEach(item => item.classList.remove('selected'));
        view.querySelector('#genres-section').style.display = 'none';
        view.querySelector('#genres-placeholder').style.display = 'block';
        showSetup();
        stopTipRotation();
    }

    function setupDurationSelect() {
        const select = view.querySelector('#duration-select');
        if (!select) return;
        select.addEventListener('change', () => {
            state.duration = parseInt(select.value);
        });
    }

    async function loadLibraries() {
        try {
            console.log('JellyMix: Loading libraries...');
            const response = await ApiClient.getJSON(ApiClient.getUrl(API_BASE + '/Libraries'));
            console.log('JellyMix: Libraries loaded:', response);
            state.libraries = response;
            renderLibraries();
        } catch (e) {
            console.error('JellyMix: Failed to load libraries:', e);
            view.querySelector('#library-list').innerHTML = '<div class="jellymix-loading">Failed to load libraries: ' + e.message + '</div>';
        }
    }

    function renderLibraries() {
        const container = view.querySelector('#library-list');
        if (!container) return;
        if (state.libraries.length === 0) {
            container.innerHTML = '<div class="jellymix-loading">No music libraries found</div>';
            return;
        }
        console.log('JellyMix: Libraries data:', state.libraries);
        container.innerHTML = state.libraries.map(lib => {
            const isSelected = state.selectedLibraryIds.includes(lib.Id);
            return '<div class="jellymix-checkbox-item' + (isSelected ? ' selected' : '') + '" data-library-id="' + lib.Id + '"><span class="checkmark"></span>' + lib.Name + '</div>';
        }).join('');
        container.querySelectorAll('.jellymix-checkbox-item').forEach(item => {
            item.addEventListener('click', () => {
                item.classList.toggle('selected');
                updateSelectedLibraries();
            });
        });
        if (state.selectedLibraryIds.length > 0) {
            loadGenres();
        }
    }

    async function updateSelectedLibraries() {
        state.selectedLibraryIds = Array.from(view.querySelectorAll('.jellymix-checkbox-item.selected')).map(item => item.dataset.libraryId);
        if (state.selectedLibraryIds.length === 0) {
            view.querySelector('#genres-section').style.display = 'none';
            view.querySelector('#genres-placeholder').style.display = 'block';
            state.genres = [];
            return;
        }
        await loadGenres();
    }

    async function loadGenres() {
        try {
            const params = state.selectedLibraryIds.map(id => 'libraryIds=' + id).join('&');
            const response = await ApiClient.getJSON(ApiClient.getUrl(API_BASE + '/Genres?' + params));
            state.genres = response;
            renderGenres();
        } catch (e) {
            console.error('JellyMix: Failed to load genres:', e);
        }
    }

    function renderGenres() {
        const container = view.querySelector('#genre-chips');
        if (!container) return;
        container.innerHTML = state.genres.map(g => {
            const isSelected = state.selectedGenres.includes(g.Name);
            return '<span class="jellymix-genre-chip' + (isSelected ? ' selected' : '') + '" data-genre="' + g.Name + '">' + g.Name + ' (' + g.TrackCount + ')</span>';
        }).join('');
        container.querySelectorAll('.jellymix-genre-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
                updateSelectedGenres();
            });
        });
        view.querySelector('#genres-section').style.display = 'block';
        view.querySelector('#genres-placeholder').style.display = 'none';
    }

    function updateSelectedGenres() {
        state.selectedGenres = Array.from(view.querySelectorAll('.jellymix-genre-chip.selected')).map(chip => chip.dataset.genre);
    }

    function showSetup() {
        view.querySelector('#setup-section').classList.remove('jellymix-hidden');
        view.querySelector('#blocks-section').classList.add('jellymix-hidden');
        view.querySelector('#preview-section').classList.add('jellymix-hidden');
    }

    function showBlocks() {
        stopTipRotation();
        state.numBlocks = parseInt(view.querySelector('#num-blocks').value);
        state.yearStart = view.querySelector('#year-start').value || null;
        state.yearEnd = view.querySelector('#year-end').value || null;
        const genresToUse = state.selectedGenres.length > 0 ? state.selectedGenres : state.genres.map(g => g.Name);
        assignGenreColors();
        if (state.blockConfigs.length !== state.numBlocks || !state.blockConfigs.length) {
            state.blockConfigs = [];
            for (let i = 0; i < state.numBlocks; i++) {
                const genreWeights = {};
                genresToUse.forEach(g => { genreWeights[g] = 50; });
                state.blockConfigs.push({ Name: blockNames[i] || 'Block ' + (i + 1), GenreWeights: genreWeights });
            }
        }
        renderBlockConfigs(genresToUse);
        view.querySelector('#setup-section').classList.add('jellymix-hidden');
        view.querySelector('#blocks-section').classList.remove('jellymix-hidden');
        view.querySelector('#preview-section').classList.add('jellymix-hidden');
    }

    function renderBlockConfigs(genres) {
        const container = view.querySelector('#blocks-container');
        if (!container) return;
        container.innerHTML = '';
        for (let b = 0; b < state.numBlocks; b++) {
            const blockDiv = document.createElement('div');
            blockDiv.className = 'jellymix-block-config';
            blockDiv.dataset.blockIndex = b;
            const savedConfig = state.blockConfigs[b] || {};
            const savedWeights = savedConfig.GenreWeights || {};
            let slidersHtml = genres.map(genre => {
                const val = savedWeights[genre] !== undefined ? savedWeights[genre] : 50;
                const color = state.genreColors[genre] || '#00a4dc';
                return '<div class="jellymix-genre-slider"><span class="jellymix-genre-slider-pill" style="background:' + color + '">' + genre + '</span><div class="jellymix-genre-slider-wrapper"><div class="jellymix-genre-slider-track"><div class="jellymix-genre-slider-fill" style="width: ' + val + '%; background:' + color + '"></div></div><div class="jellymix-genre-slider-ticks"><span class="jellymix-genre-slider-tick"></span><span class="jellymix-genre-slider-tick"></span><span class="jellymix-genre-slider-tick center"></span><span class="jellymix-genre-slider-tick"></span><span class="jellymix-genre-slider-tick"></span></div><div class="jellymix-slider-handle" style="left:' + val + '%"></div><input type="range" class="genre-weight-slider" data-genre="' + genre + '" data-color="' + color + '" min="0" max="100" step="25" value="' + val + '" style="width:100%"></div></div>';
            }).join('');
            blockDiv.innerHTML = '<div class="jellymix-block-header"><span class="jellymix-block-number">' + (b + 1) + '</span><span class="jellymix-block-name">' + (blockNames[b] || 'Block ' + (b + 1)) + '</span></div><div class="jellymix-genre-sliders">' + slidersHtml + '</div>';
            container.appendChild(blockDiv);
            blockDiv.querySelectorAll('.genre-weight-slider').forEach(slider => {
                slider.addEventListener('input', () => {
                    const fill = slider.parentElement.querySelector('.jellymix-genre-slider-fill');
                    const handle = slider.parentElement.querySelector('.jellymix-slider-handle');
                    if (fill) fill.style.width = slider.value + '%';
                    if (handle) handle.style.left = slider.value + '%';
                    saveBlockConfigs();
                });
            });
        }
    }

    function saveBlockConfigs() {
        state.blockConfigs = getBlockConfigs();
    }

    function getBlockConfigs() {
        const configs = [];
        view.querySelectorAll('.jellymix-block-config').forEach((blockEl, index) => {
            const genreWeights = {};
            blockEl.querySelectorAll('.genre-weight-slider').forEach(slider => {
                genreWeights[slider.dataset.genre] = parseInt(slider.value);
            });
            configs.push({ Name: blockNames[index] || 'Block ' + (index + 1), GenreWeights: genreWeights });
        });
        return configs;
    }

    async function conjure() {
        if (state.selectedLibraryIds.length === 0) {
            Dashboard.alert('Please select at least one library');
            return;
        }
        const request = {
            Name: 'JellyMix Playlist',
            LibraryIds: state.selectedLibraryIds,
            Genres: state.selectedGenres.length > 0 ? state.selectedGenres : null,
            YearStart: state.yearStart ? parseInt(state.yearStart) : null,
            YearEnd: state.yearEnd ? parseInt(state.yearEnd) : null,
            DurationMinutes: state.duration * 60,
            Blocks: getBlockConfigs(),
            UserId: ApiClient.getCurrentUserId()
        };
        try {
            Dashboard.showLoadingMsg();
            const response = await ApiClient.ajax({
                url: ApiClient.getUrl(API_BASE + '/Generate'),
                type: 'POST',
                data: JSON.stringify(request),
                contentType: 'application/json'
            });
            console.log('JellyMix: Generate response:', response, typeof response);
            if (response && typeof response.json === 'function') {
                state.preview = await response.json();
            } else if (typeof response === 'string') {
                state.preview = JSON.parse(response);
            } else {
                state.preview = response;
            }
            console.log('JellyMix: Preview object:', state.preview);
            Dashboard.hideLoadingMsg();
            renderPreview();
            view.querySelector('#setup-section').classList.add('jellymix-hidden');
            view.querySelector('#blocks-section').classList.add('jellymix-hidden');
            view.querySelector('#preview-section').classList.remove('jellymix-hidden');
        } catch (e) {
            Dashboard.hideLoadingMsg();
            console.error('JellyMix: Failed to generate playlist:', e);
            Dashboard.alert('Failed to generate playlist: ' + e.message);
        }
    }

    function renderPreview() {
        if (!state.preview) return;
        assignGenreColors();
        const container = view.querySelector('#preview-container');
        view.querySelector('#preview-title').textContent = state.preview.Name;
        startTipRotation();
        let html = '';
        state.preview.Blocks.forEach((block, blockIndex) => {
            html += '<div class="jellymix-preview-block" data-block-index="' + blockIndex + '"><div class="jellymix-preview-block-header"><div><span class="jellymix-block-number">' + (blockIndex + 1) + '</span><span class="jellymix-block-name">' + block.Name + '</span></div><div class="jellymix-block-actions"><span class="jellymix-block-duration">' + block.DurationDisplay + '</span><button is="emby-button" type="button" class="raised btnRemix" data-block="' + blockIndex + '">🔀 Remix</button><button is="emby-button" type="button" class="raised btnMustHave" data-block="' + blockIndex + '">⭐ Add Must-Have</button></div></div><div class="jellymix-track-list">';
            block.Tracks.forEach((track, trackIndex) => {
                const genreColor = state.genreColors[track.Genre] || '#00a4dc';
                html += '<div class="jellymix-track-item" draggable="true" data-track-id="' + track.Id + '"><span class="jellymix-track-num">' + (trackIndex + 1) + '</span><span class="jellymix-track-genre-pill" style="background:' + genreColor + '">' + track.Genre + '</span><div class="jellymix-track-info"><div class="jellymix-track-title">' + (track.IsMustHave ? '<span class="must-have">⭐</span>' : '') + track.Name + '</div><div class="jellymix-track-artist">' + track.Artist + '</div></div><span class="jellymix-track-duration">' + track.DurationDisplay + '</span><button class="jellymix-track-delete btnDeleteTrack" data-track="' + track.Id + '">🗑</button></div>';
            });
            html += '</div></div>';
        });
        container.innerHTML = html;
        container.querySelectorAll('.btnRemix').forEach(btn => {
            btn.addEventListener('click', () => remixBlock(parseInt(btn.dataset.block)));
        });
        container.querySelectorAll('.btnMustHave').forEach(btn => {
            btn.addEventListener('click', () => showMustHaveDialog(parseInt(btn.dataset.block)));
        });
        container.querySelectorAll('.btnDeleteTrack').forEach(btn => {
            btn.addEventListener('click', () => deleteTrack(btn.dataset.track));
        });
        updatePreviewTotal();
        initDragAndDrop();
    }

    const TIPS = [
        '💡 Tip: Drag tracks to re-order',
        '💡 Tip: Remix randomizes a block',
        '💡 Tip: Click ⭐ to add must-have tracks',
        '💡 Tip: Click Edit Blocks to adjust sliders'
    ];
    let tipIndex = 0;
    let tipInterval = null;

    function startTipRotation() {
        const tipEl = view.querySelector('#preview-tip');
        if (!tipEl) return;
        tipIndex = 0;
        tipEl.textContent = TIPS[tipIndex];
        if (tipInterval) clearInterval(tipInterval);
        tipInterval = setInterval(() => {
            tipIndex = (tipIndex + 1) % TIPS.length;
            tipEl.style.opacity = '0';
            setTimeout(() => {
                tipEl.textContent = TIPS[tipIndex];
                tipEl.style.opacity = '1';
            }, 300);
        }, 10000);
    }

    function stopTipRotation() {
        if (tipInterval) {
            clearInterval(tipInterval);
            tipInterval = null;
        }
    }

    function updatePreviewTotal() {
        const tracks = view.querySelectorAll('.jellymix-track-item');
        let totalTicks = 0;
        tracks.forEach(t => {
            const dur = t.querySelector('.jellymix-track-duration');
            if (dur) {
                const parts = dur.textContent.split(':');
                totalTicks += (parseInt(parts[0]) * 60 + parseInt(parts[1])) * 10000000;
            }
        });
        const totalMinutes = Math.floor(totalTicks / 600000000);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        view.querySelector('#preview-total').innerHTML = '<strong>' + tracks.length + '</strong> tracks · <strong>' + hours + 'h ' + mins + 'm</strong> total';
    }

    function initDragAndDrop() {
        view.querySelectorAll('.jellymix-track-item').forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        });
    }

    function handleDragStart(e) { state.draggedItem = this; this.classList.add('dragging'); }
    function handleDragOver(e) { e.preventDefault(); }
    function handleDrop(e) {
        e.preventDefault();
        if (state.draggedItem && state.draggedItem !== this) {
            const list = this.parentNode;
            const items = Array.from(list.children);
            const draggedIdx = items.indexOf(state.draggedItem);
            const targetIdx = items.indexOf(this);
            if (draggedIdx < targetIdx) { list.insertBefore(state.draggedItem, this.nextSibling); }
            else { list.insertBefore(state.draggedItem, this); }
            renumberTracks();
        }
    }
    function handleDragEnd() { this.classList.remove('dragging'); state.draggedItem = null; }

    function renumberTracks() {
        view.querySelectorAll('.jellymix-preview-block').forEach(block => {
            block.querySelectorAll('.jellymix-track-num').forEach((num, i) => { num.textContent = i + 1; });
        });
    }

    function deleteTrack(trackId) {
        const el = view.querySelector('[data-track-id="' + trackId + '"]');
        if (el) { el.remove(); renumberTracks(); updatePreviewTotal(); }
    }

    async function remixBlock(blockIndex) {
        const blockEl = view.querySelector('.jellymix-preview-block[data-block-index="' + blockIndex + '"]');
        if (!blockEl) return;
        const genreWeights = {};
        const configBlock = view.querySelectorAll('.jellymix-block-config')[blockIndex];
        if (configBlock) {
            configBlock.querySelectorAll('.genre-weight-slider').forEach(s => {
                genreWeights[s.dataset.genre] = parseInt(s.value);
            });
        }
        if (Object.keys(genreWeights).length === 0) {
            state.genres.forEach(g => { genreWeights[g.Name] = 50; });
        }
        const request = {
            BlockIndex: blockIndex,
            BlockConfig: { Name: blockNames[blockIndex] || 'Block ' + (blockIndex + 1), GenreWeights: genreWeights },
            LibraryIds: state.selectedLibraryIds,
            Genres: state.selectedGenres.length > 0 ? state.selectedGenres : null,
            YearStart: state.yearStart ? parseInt(state.yearStart) : null,
            YearEnd: state.yearEnd ? parseInt(state.yearEnd) : null,
            DurationMinutes: (state.duration * 60) / state.numBlocks
        };
        try {
            Dashboard.showLoadingMsg();
            const response = await ApiClient.ajax({
                url: ApiClient.getUrl(API_BASE + '/RemixBlock'),
                type: 'POST',
                data: JSON.stringify(request),
                contentType: 'application/json'
            });
            let block;
            if (response && typeof response.json === 'function') {
                block = await response.json();
            } else if (typeof response === 'string') {
                block = JSON.parse(response);
            } else {
                block = response;
            }
            Dashboard.hideLoadingMsg();
            const trackList = blockEl.querySelector('.jellymix-track-list');
            let html = '';
            block.Tracks.forEach((track, i) => {
                const genreColor = state.genreColors[track.Genre] || '#00a4dc';
                html += '<div class="jellymix-track-item" draggable="true" data-track-id="' + track.Id + '"><span class="jellymix-track-num">' + (i + 1) + '</span><span class="jellymix-track-genre-pill" style="background:' + genreColor + '">' + track.Genre + '</span><div class="jellymix-track-info"><div class="jellymix-track-title">' + track.Name + '</div><div class="jellymix-track-artist">' + track.Artist + '</div></div><span class="jellymix-track-duration">' + track.DurationDisplay + '</span><button class="jellymix-track-delete btnDeleteTrack" data-track="' + track.Id + '">🗑</button></div>';
            });
            trackList.innerHTML = html;
            trackList.querySelectorAll('.btnDeleteTrack').forEach(btn => {
                btn.addEventListener('click', () => deleteTrack(btn.dataset.track));
            });
            blockEl.querySelector('.jellymix-block-duration').textContent = block.DurationDisplay;
            updatePreviewTotal();
            initDragAndDrop();
        } catch (e) {
            Dashboard.hideLoadingMsg();
            console.error('JellyMix: Remix failed:', e);
        }
    }

    function showMustHaveDialog(blockIndex) {
        Dashboard.alert('Must-Have feature coming soon! For now, tracks are auto-selected based on genre weights.');
    }

    async function searchMustHave(query, blockIndex, dlg, dialogHelper) {
        if (!query || query.length < 2) return;
        try {
            const params = 'query=' + encodeURIComponent(query) + '&' + state.selectedLibraryIds.map(id => 'libraryIds=' + id).join('&');
            const response = await ApiClient.getJSON(ApiClient.getUrl(API_BASE + '/Search?' + params));
            const resultsDiv = dlg.querySelector('#must-have-results');
            resultsDiv.innerHTML = response.map(track => '<div class="jellymix-track-item" style="cursor:pointer" data-add-track="' + track.Id + '" data-name="' + track.Name.replace(/"/g, '&quot;') + '" data-artist="' + track.Artist.replace(/"/g, '&quot;') + '" data-genre="' + track.Genre + '" data-duration="' + track.DurationDisplay + '" data-block="' + blockIndex + '"><div class="jellymix-track-info"><div class="jellymix-track-title">' + track.Name + '</div><div class="jellymix-track-artist">' + track.Artist + (track.Year ? ' (' + track.Year + ')' : '') + '</div></div><span class="jellymix-track-genre">' + track.Genre + '</span><span class="jellymix-track-duration">' + track.DurationDisplay + '</span></div>').join('');
            resultsDiv.querySelectorAll('[data-add-track]').forEach(el => {
                el.addEventListener('click', () => {
                    addMustHave(el.dataset.addTrack, el.dataset.name, el.dataset.artist, el.dataset.genre, el.dataset.duration, parseInt(el.dataset.block), dlg, dialogHelper);
                });
            });
        } catch (e) { console.error('JellyMix: Search failed:', e); }
    }

    function addMustHave(trackId, name, artist, genre, duration, blockIndex, dlg, dialogHelper) {
        const blockEl = view.querySelectorAll('.jellymix-preview-block')[blockIndex];
        const trackList = blockEl ? blockEl.querySelector('.jellymix-track-list') : null;
        if (!trackList) return;
        const trackDiv = document.createElement('div');
        trackDiv.className = 'jellymix-track-item';
        trackDiv.draggable = true;
        trackDiv.dataset.trackId = trackId;
        trackDiv.innerHTML = '<span class="jellymix-track-drag">⋮⋮</span><span class="jellymix-track-num">0</span><div class="jellymix-track-info"><div class="jellymix-track-title"><span class="must-have">⭐</span>' + name + '</div><div class="jellymix-track-artist">' + artist + '</div></div><span class="jellymix-track-genre">' + genre + '</span><span class="jellymix-track-duration">' + duration + '</span><button class="jellymix-track-delete btnDeleteTrack" data-track="' + trackId + '">🗑</button>';
        trackDiv.querySelector('.btnDeleteTrack').addEventListener('click', () => deleteTrack(trackId));
        trackList.appendChild(trackDiv);
        renumberTracks();
        initDragAndDrop();
        updatePreviewTotal();
        dialogHelper.close(dlg);
    }

    function showSaveDialog() {
        const defaultName = state.preview?.Name || 'JellyMix Playlist';
        const name = prompt('Save playlist as:', defaultName);
        if (name) {
            savePlaylist(name);
        }
    }

    async function savePlaylist(name) {
        const trackIds = Array.from(view.querySelectorAll('.jellymix-track-item')).map(el => el.dataset.trackId);
        const config = {
            LibraryIds: state.selectedLibraryIds,
            SelectedGenres: state.selectedGenres,
            DurationHours: state.duration,
            NumBlocks: state.numBlocks,
            YearStart: state.yearStart ? parseInt(state.yearStart) : null,
            YearEnd: state.yearEnd ? parseInt(state.yearEnd) : null,
            BlockConfigs: state.blockConfigs
        };
        const request = {
            Name: name,
            TrackIds: trackIds,
            UserId: ApiClient.getCurrentUserId(),
            ExistingPlaylistId: state.editingPlaylistId || null,
            Config: config
        };
        console.log('JellyMix: Saving playlist with config:', JSON.stringify(request));
        try {
            Dashboard.showLoadingMsg();
            const response = await ApiClient.ajax({ url: ApiClient.getUrl(API_BASE + '/Save'), type: 'POST', data: JSON.stringify(request), contentType: 'application/json' });
            console.log('JellyMix: Save response:', response);
            Dashboard.hideLoadingMsg();
            state.editingPlaylistId = null;
            stopTipRotation();
            await loadPlaylists();
            console.log('JellyMix: Switching to manage tab');
            view.querySelectorAll('.viewTab').forEach(t => t.classList.remove('active'));
            view.querySelectorAll('.jellymix-tab-content').forEach(c => c.classList.add('jellymix-hidden'));
            view.querySelector('.viewTab[data-tab="manage"]').classList.add('active');
            view.querySelector('#jellymix-manage').classList.remove('jellymix-hidden');
            Dashboard.alert('Playlist saved!');
        } catch (e) {
            console.error('JellyMix: Failed to save playlist:', e);
            Dashboard.hideLoadingMsg();
            Dashboard.alert('Failed to save playlist: ' + (e.message || 'Unknown error'));
        }
    }

    async function loadPlaylists() {
        try {
            const userId = ApiClient.getCurrentUserId();
            console.log('JellyMix: Loading playlists for user:', userId);
            const response = await ApiClient.getJSON(ApiClient.getUrl(API_BASE + '/Playlists?userId=' + userId));
            console.log('JellyMix: Playlists response:', response);
            state.playlists = response || [];
            renderPlaylists();
        } catch (e) {
            console.error('JellyMix: Failed to load playlists:', e);
            const container = view.querySelector('#playlist-list');
            if (container) { container.innerHTML = '<div class="jellymix-loading">Failed to load playlists: ' + (e.message || 'Unknown error') + '</div>'; }
        }
    }

    function renderPlaylists() {
        const container = view.querySelector('#playlist-list');
        if (!container) return;
        if (state.playlists.length === 0) {
            container.innerHTML = '<div class="jellymix-loading">No JellyMix playlists yet. Create one!</div>';
            return;
        }
        container.innerHTML = state.playlists.map(p => {
            const hasConfig = p.Config && p.Config.LibraryIds && p.Config.LibraryIds.length > 0;
            const genreList = p.Config && p.Config.SelectedGenres && p.Config.SelectedGenres.length > 0 
                ? p.Config.SelectedGenres.join(', ') 
                : 'All genres';
            const configInfo = hasConfig 
                ? '<div class="jellymix-playlist-config">' + p.Config.NumBlocks + ' blocks · ' + p.Config.DurationHours + 'h · ' + genreList + '</div>'
                : '';
            const configButtons = hasConfig 
                ? '<button is="emby-button" type="button" class="raised btnMusicGenres" data-playlist="' + p.Id + '">🎧 Music</button>' +
                  '<button is="emby-button" type="button" class="raised btnEditBlocks" data-playlist="' + p.Id + '">✨ Blocks</button>' +
                  '<button is="emby-button" type="button" class="raised button-submit btnRegenerate" data-playlist="' + p.Id + '">🧠 Regenerate</button>'
                : '';
            return '<div class="jellymix-playlist-item" data-playlist-id="' + p.Id + '">' +
                '<div class="jellymix-playlist-info">' +
                    '<h3><a href="#!/details?id=' + p.Id + '" class="jellymix-playlist-link">🎵 ' + p.Name + '</a></h3>' +
                    '<div class="jellymix-playlist-meta">' + p.TrackCount + ' tracks · ' + p.DurationDisplay + ' · Updated ' + new Date(p.UpdatedAt || p.DateCreated).toLocaleDateString() + '</div>' +
                    configInfo +
                '</div>' +
                '<div class="jellymix-playlist-actions">' +
                    configButtons +
                    '<a is="emby-linkbutton" class="raised" href="#!/details?id=' + p.Id + '">📋 Playlist</a>' +
                    '<button is="emby-button" type="button" class="raised btnDeletePlaylist" data-playlist="' + p.Id + '">🗑️ Delete</button>' +
                '</div>' +
            '</div>';
        }).join('');
        container.querySelectorAll('.btnMusicGenres').forEach(btn => {
            btn.addEventListener('click', () => goToMusicGenres(btn.dataset.playlist));
        });
        container.querySelectorAll('.btnEditBlocks').forEach(btn => {
            btn.addEventListener('click', () => goToBlocks(btn.dataset.playlist));
        });
        container.querySelectorAll('.btnRegenerate').forEach(btn => {
            btn.addEventListener('click', () => goToRegenerate(btn.dataset.playlist));
        });
        container.querySelectorAll('.btnDeletePlaylist').forEach(btn => {
            btn.addEventListener('click', () => deletePlaylist(btn.dataset.playlist));
        });
    }

    function goToMusicGenres(playlistId) {
        const playlist = state.playlists.find(p => p.Id === playlistId);
        if (!playlist || !playlist.Config) {
            Dashboard.alert('Cannot edit - no saved configuration');
            return;
        }
        state.editingPlaylistId = playlistId;
        state.selectedLibraryIds = playlist.Config.LibraryIds || [];
        state.selectedGenres = playlist.Config.SelectedGenres || [];
        state.duration = playlist.Config.DurationHours || 4;
        state.numBlocks = playlist.Config.NumBlocks || 3;
        state.yearStart = playlist.Config.YearStart || null;
        state.yearEnd = playlist.Config.YearEnd || null;
        state.blockConfigs = playlist.Config.BlockConfigs || [];
        state.preview = { Name: playlist.Name };
        view.querySelector('#duration-select').value = state.duration;
        view.querySelector('#num-blocks').value = state.numBlocks;
        view.querySelector('#year-start').value = state.yearStart || '';
        view.querySelector('#year-end').value = state.yearEnd || '';
        renderLibraries();
        view.querySelectorAll('.viewTab').forEach(t => t.classList.remove('active'));
        view.querySelectorAll('.jellymix-tab-content').forEach(c => c.classList.add('jellymix-hidden'));
        view.querySelector('.viewTab[data-tab="create"]').classList.add('active');
        view.querySelector('#jellymix-create').classList.remove('jellymix-hidden');
        showSetup();
        Dashboard.alert('Editing "' + playlist.Name + '" - adjust Music & Genres, then click Configure Blocks.');
    }

    async function goToBlocks(playlistId) {
        const playlist = state.playlists.find(p => p.Id === playlistId);
        if (!playlist || !playlist.Config) {
            Dashboard.alert('Cannot edit - no saved configuration');
            return;
        }
        state.editingPlaylistId = playlistId;
        state.selectedLibraryIds = playlist.Config.LibraryIds || [];
        state.selectedGenres = playlist.Config.SelectedGenres || [];
        state.duration = playlist.Config.DurationHours || 4;
        state.numBlocks = playlist.Config.NumBlocks || 3;
        state.yearStart = playlist.Config.YearStart || null;
        state.yearEnd = playlist.Config.YearEnd || null;
        state.blockConfigs = playlist.Config.BlockConfigs || [];
        state.preview = { Name: playlist.Name };
        if (state.selectedGenres.length === 0) {
            try {
                const genres = await ApiClient.getJSON(ApiClient.getUrl(API_BASE + '/Genres?libraryIds=' + state.selectedLibraryIds.join(',')));
                state.selectedGenres = genres.map(g => g.Name);
            } catch (e) {
                console.error('JellyMix: Failed to load genres:', e);
            }
        }
        view.querySelectorAll('.viewTab').forEach(t => t.classList.remove('active'));
        view.querySelectorAll('.jellymix-tab-content').forEach(c => c.classList.add('jellymix-hidden'));
        view.querySelector('.viewTab[data-tab="create"]').classList.add('active');
        view.querySelector('#jellymix-create').classList.remove('jellymix-hidden');
        showBlocks();
        Dashboard.alert('Editing "' + playlist.Name + '" blocks - adjust sliders, then click Conjure Playlist.');
    }

    async function goToRegenerate(playlistId) {
        const playlist = state.playlists.find(p => p.Id === playlistId);
        if (!playlist || !playlist.Config) {
            Dashboard.alert('Cannot regenerate - no saved configuration');
            return;
        }
        state.editingPlaylistId = playlistId;
        state.selectedLibraryIds = playlist.Config.LibraryIds || [];
        state.selectedGenres = playlist.Config.SelectedGenres || [];
        state.duration = playlist.Config.DurationHours || 4;
        state.numBlocks = playlist.Config.NumBlocks || 3;
        state.yearStart = playlist.Config.YearStart || null;
        state.yearEnd = playlist.Config.YearEnd || null;
        state.blockConfigs = playlist.Config.BlockConfigs || [];
        const request = {
            Name: playlist.Name,
            LibraryIds: state.selectedLibraryIds,
            Genres: state.selectedGenres.length > 0 ? state.selectedGenres : null,
            YearStart: state.yearStart ? parseInt(state.yearStart) : null,
            YearEnd: state.yearEnd ? parseInt(state.yearEnd) : null,
            DurationMinutes: state.duration * 60,
            Blocks: state.blockConfigs,
            UserId: ApiClient.getCurrentUserId()
        };
        try {
            Dashboard.showLoadingMsg();
            const response = await ApiClient.ajax({
                url: ApiClient.getUrl(API_BASE + '/Generate'),
                type: 'POST',
                data: JSON.stringify(request),
                contentType: 'application/json'
            });
            let preview;
            if (response && typeof response.json === 'function') {
                preview = await response.json();
            } else if (typeof response === 'string') {
                preview = JSON.parse(response);
            } else {
                preview = response;
            }
            state.preview = preview;
            Dashboard.hideLoadingMsg();
            view.querySelectorAll('.viewTab').forEach(t => t.classList.remove('active'));
            view.querySelectorAll('.jellymix-tab-content').forEach(c => c.classList.add('jellymix-hidden'));
            view.querySelector('.viewTab[data-tab="create"]').classList.add('active');
            view.querySelector('#jellymix-create').classList.remove('jellymix-hidden');
            showPreview();
        } catch (e) {
            console.error('JellyMix: Failed to generate preview:', e);
            Dashboard.hideLoadingMsg();
            Dashboard.alert('Failed to generate preview');
        }
    }

    function editPlaylist(playlistId) {
        goToMusicGenres(playlistId);
    }

    async function regeneratePlaylist(playlistId) {
        goToRegenerate(playlistId);
    }

    async function deletePlaylist(playlistId) {
        if (!confirm('Delete this playlist?')) return;
        try {
            await ApiClient.ajax({ url: ApiClient.getUrl(API_BASE + '/Playlists/' + playlistId), type: 'DELETE' });
            await loadPlaylists();
        } catch (e) {
            console.error('JellyMix: Failed to delete playlist:', e);
            Dashboard.alert('Failed to delete playlist');
        }
    }

    view.querySelector('.btnConfigureBlocks').addEventListener('click', showBlocks);
    view.querySelector('.btnBackToSetup').addEventListener('click', showSetup);
    view.querySelector('.btnConjure').addEventListener('click', conjure);
    view.querySelector('.btnEditBlocks').addEventListener('click', showBlocks);
    view.querySelector('.btnSavePlaylist').addEventListener('click', showSaveDialog);

    console.log('JellyMix: Controller loaded, setting up...');
    setupTabs();
    setupDurationSelect();
    loadLibraries();
    loadPlaylists();
}
