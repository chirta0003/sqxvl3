class TeamManager {
    constructor() {
        this.draggedPlayer = null;
        this.dragOffset = null;
        this.init();
    }

    // Custom prompt function to replace browser prompt()
    showTextInputModal(title, placeholder = '', defaultValue = '', showDelete = false, defaultColor = '#3b82f6') {
        return new Promise((resolve) => {
            const modal = document.getElementById('textInputModal');
            const overlay = document.getElementById('overlay');
            const titleElement = document.getElementById('textModalTitle');
            const input = document.getElementById('textInput');
            const colorInput = document.getElementById('textColorInput');
            const confirmBtn = document.getElementById('textModalConfirm');
            const cancelBtn = document.getElementById('textModalCancel');
            const closeBtn = document.getElementById('textModalClose');
            const deleteBtn = document.getElementById('textModalDelete');

            // Set modal content
            titleElement.textContent = title;
            input.placeholder = placeholder;
            input.value = defaultValue;
            colorInput.value = defaultColor;

            // Show/hide delete button based on showDelete parameter
            deleteBtn.style.display = showDelete ? 'inline-block' : 'none';

            // Show modal
            modal.style.display = 'block';
            overlay.style.display = 'block';
            input.focus();
            input.select();

            // Handle confirm
            const handleConfirm = () => {
                const value = input.value.trim();
                const color = colorInput.value;
                hideModal();
                resolve({ text: value || null, color: color });
            };

            // Handle cancel
            const handleCancel = () => {
                hideModal();
                resolve(null);
            };

            // Handle delete
            const handleDelete = () => {
                hideModal();
                resolve('DELETE');
            };

            // Hide modal function
            const hideModal = () => {
                modal.style.display = 'none';
                overlay.style.display = 'none';
                // Remove event listeners
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtn.removeEventListener('click', handleCancel);
                deleteBtn.removeEventListener('click', handleDelete);
                overlay.removeEventListener('click', handleCancel);
                input.removeEventListener('keydown', handleKeydown);
            };

            // Handle keyboard events
            const handleKeydown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleCancel();
                }
            };

            // Add event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
            deleteBtn.addEventListener('click', handleDelete);
            overlay.addEventListener('click', handleCancel);
            input.addEventListener('keydown', handleKeydown);
        });
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupTacticalMode();
        this.setupSchemeManagement();
        this.setupRoleToggle();
        // Load and render players on initialization
        this.renderPlayerPool();
    }

    setupEventListeners() {
        // Clear field button
        document.getElementById('clearFieldBtn').addEventListener('click', () => {
            this.clearField();
        });

        // Team display mode
        document.getElementById('teamDisplayMode').addEventListener('change', (e) => {
            this.handleTeamDisplayModeChange(e.target.value);
        });
    }

    setupDragAndDrop() {
        const field = document.getElementById('footballField');
        const fieldContainer = document.getElementById('field-container') || document.querySelector('.field-container');
        const playerPool = document.getElementById('playerPool');
        
        // Setup drag and drop for the football field
        field.addEventListener('dragover', (e) => {
            e.preventDefault();
            // Add visual feedback for valid drop zone
            field.classList.add('drag-over');
        });

        field.addEventListener('dragleave', (e) => {
            // Remove visual feedback when leaving drop zone
            if (!field.contains(e.relatedTarget)) {
                field.classList.remove('drag-over');
            }
        });

        field.addEventListener('drop', (e) => {
            e.preventDefault();
            field.classList.remove('drag-over');
            this.handleFieldDrop(e);
        });

        // Setup drag and drop for the field container (outside the field)
        if (fieldContainer) {
            fieldContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                // Add visual feedback for valid drop zone
                fieldContainer.classList.add('drag-over');
            });

            fieldContainer.addEventListener('dragleave', (e) => {
                // Remove visual feedback when leaving drop zone
                if (!fieldContainer.contains(e.relatedTarget)) {
                    fieldContainer.classList.remove('drag-over');
                }
            });

            fieldContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                fieldContainer.classList.remove('drag-over');
                this.handleFieldContainerDrop(e);
            });
        }

        // Setup drag and drop for the player pool (to return cards from field)
        if (playerPool) {
            playerPool.addEventListener('dragover', (e) => {
                e.preventDefault();
                // Add visual feedback for valid drop zone
                playerPool.classList.add('drag-over');
            });

            playerPool.addEventListener('dragleave', (e) => {
                // Remove visual feedback when leaving drop zone
                if (!playerPool.contains(e.relatedTarget)) {
                    playerPool.classList.remove('drag-over');
                }
            });

            playerPool.addEventListener('drop', (e) => {
                e.preventDefault();
                playerPool.classList.remove('drag-over');
                this.handlePlayerPoolDrop(e);
            });
        }
    }

    // Pen tool functions for free-hand drawing
    createPenPath(canvas, points) {
        const svgNS = "http://www.w3.org/2000/svg";
        const path = document.createElementNS(svgNS, 'path');
        
        // Get current style settings
        const strokeColor = document.getElementById('strokeColor')?.value || '#3b82f6';
        const strokeWidth = document.getElementById('strokeWidth')?.value || '2';
        
        path.setAttribute('stroke', strokeColor);
        path.setAttribute('stroke-width', strokeWidth);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.classList.add('temp-element');
        
        this.updatePenPath(path, points);
        canvas.appendChild(path);
        
        return path;
    }

    updatePenPath(path, points) {
        if (points.length < 2) return;
        
        let pathData = `M ${points[0].x} ${points[0].y}`;
        
        if (points.length === 2) {
            pathData += ` L ${points[1].x} ${points[1].y}`;
        } else {
            // Use quadratic curves for smoother lines
            for (let i = 1; i < points.length - 1; i++) {
                const currentPoint = points[i];
                const nextPoint = points[i + 1];
                const controlX = (currentPoint.x + nextPoint.x) / 2;
                const controlY = (currentPoint.y + nextPoint.y) / 2;
                
                if (i === 1) {
                    pathData += ` Q ${currentPoint.x} ${currentPoint.y} ${controlX} ${controlY}`;
                } else {
                    pathData += ` T ${controlX} ${controlY}`;
                }
            }
            
            // Add the last point
            const lastPoint = points[points.length - 1];
            pathData += ` T ${lastPoint.x} ${lastPoint.y}`;
        }
        
        path.setAttribute('d', pathData);
    }

    handleFieldContainerDrop(e) {
        if (!this.draggedPlayer || !this.dragOffset) return;

        const fieldContainer = document.querySelector('.field-container');
        const fieldContainerRect = fieldContainer.getBoundingClientRect();
        
        // Get the actual field element to check if we're dropping inside it
        const field = document.getElementById('footballField');
        const fieldRect = field.getBoundingClientRect();
        
        // Check if the drop is actually inside the field area
        const isInsideField = (
            e.clientX >= fieldRect.left && 
            e.clientX <= fieldRect.right && 
            e.clientY >= fieldRect.top && 
            e.clientY <= fieldRect.bottom
        );
        
        // If dropping inside the field, delegate to field drop handler
        if (isInsideField) {
            this.handleFieldDrop(e);
            return;
        }

        // Calculate position based on mouse coordinates, centering the card under the cursor
        const cardWidth = 120;
        const cardHeight = 160;
        
        // Center the card under the mouse cursor
        const x = e.clientX - fieldContainerRect.left - (cardWidth / 2);
        const y = e.clientY - fieldContainerRect.top - (cardHeight / 2);

        // Ensure the card stays within field container boundaries
        const boundedX = Math.max(0, Math.min(x, fieldContainerRect.width - cardWidth));
        const boundedY = Math.max(0, Math.min(y, fieldContainerRect.height - cardHeight));

        // Check if player is already in the field container to prevent duplicates
        const existingContainerCard = document.querySelector(`.field-container [data-player-id="${this.draggedPlayer.id}"]`);
        if (existingContainerCard) {
            // Just move the existing card to new position
            existingContainerCard.style.left = `${boundedX}px`;
            existingContainerCard.style.top = `${boundedY}px`;
            this.draggedPlayer = null;
            this.dragOffset = null;
            return;
        }

        // Create field container card
        const containerCard = this.createPlayerCard(this.draggedPlayer);
        containerCard.style.position = 'absolute';
        containerCard.style.left = `${boundedX}px`;
        containerCard.style.top = `${boundedY}px`;
        containerCard.style.zIndex = '10';

        // Add click handler to return to pool with delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-player-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.title = 'Rimuovi dal campo';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.returnPlayerToPool(containerCard);
        });
        containerCard.appendChild(deleteBtn);

        fieldContainer.appendChild(containerCard);

        // Remove from player pool only if it exists there
        const poolCard = document.querySelector(`#playerPool [data-player-id="${this.draggedPlayer.id}"]`);
        if (poolCard) {
            poolCard.remove();
        }

        this.draggedPlayer = null;
        this.dragOffset = null;
    }

    handleFieldDrop(e) {
        if (!this.draggedPlayer || !this.dragOffset) return;

        const fieldRect = document.getElementById('footballField').getBoundingClientRect();
        
        // Use the stored drag offset for precise positioning
        const x = e.clientX - fieldRect.left - this.dragOffset.x;
        const y = e.clientY - fieldRect.top - this.dragOffset.y;

        // Ensure the card stays within field boundaries
        const cardWidth = 120; // Updated to match actual card width
        const cardHeight = 160; // Updated to match actual card height
        const boundedX = Math.max(0, Math.min(x, fieldRect.width - cardWidth));
        const boundedY = Math.max(0, Math.min(y, fieldRect.height - cardHeight));

        // Check if player is already on the field to prevent duplicates
        const existingFieldCard = document.querySelector(`#footballField [data-player-id="${this.draggedPlayer.id}"]`);
        if (existingFieldCard) {
            // Just move the existing card to new position
            existingFieldCard.style.left = `${boundedX}px`;
            existingFieldCard.style.top = `${boundedY}px`;
            this.draggedPlayer = null;
            this.dragOffset = null;
            return;
        }

        // Remove from field container if it exists there
        const existingContainerCard = document.querySelector(`.field-container [data-player-id="${this.draggedPlayer.id}"]`);
        if (existingContainerCard) {
            existingContainerCard.remove();
        }

        // Create field card
        const fieldCard = this.createPlayerCard(this.draggedPlayer);
        fieldCard.style.position = 'absolute';
        fieldCard.style.left = `${boundedX}px`;
        fieldCard.style.top = `${boundedY}px`;
        fieldCard.style.zIndex = '10';

        // Add click handler to return to pool with delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-player-btn';
        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
        deleteBtn.title = 'Rimuovi dal campo';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.returnPlayerToPool(fieldCard);
        });
        fieldCard.appendChild(deleteBtn);

        document.getElementById('footballField').appendChild(fieldCard);

        // Remove from player pool only if it exists there
        const poolCard = document.querySelector(`#playerPool [data-player-id="${this.draggedPlayer.id}"]`);
        if (poolCard) {
            poolCard.remove();
        }

        this.draggedPlayer = null;
        this.dragOffset = null;
    }

    returnPlayerToPool(fieldCard) {
        const playerId = fieldCard.dataset.playerId;
        fieldCard.remove();
        
        // Re-render player pool to show the returned player
        this.renderPlayerPool();
    }

    handlePlayerPoolDrop(e) {
        if (!this.draggedPlayer || !this.dragOffset) return;

        // Check if the dragged player is from the field or field container
        const fieldCard = document.querySelector(`#footballField [data-player-id="${this.draggedPlayer.id}"]`);
        const containerCard = document.querySelector(`.field-container [data-player-id="${this.draggedPlayer.id}"]`);
        
        if (fieldCard) {
            // Return player from field to pool
            this.returnPlayerToPool(fieldCard);
        } else if (containerCard) {
            // Return player from field container to pool
            this.returnPlayerToPool(containerCard);
        }

        this.draggedPlayer = null;
        this.dragOffset = null;
    }

    clearField() {
        if (confirm('Sei sicuro di voler rimuovere tutti i giocatori dal campo? Verranno spostati nel Player Pool.')) {
            const field = document.getElementById('footballField');
            const fieldContainer = document.querySelector('.field-container');
            
            // Remove players from the football field
            const playersOnField = field.querySelectorAll('.player-card');
            playersOnField.forEach(card => {
                card.remove();
            });

            // Remove players from the field container (gray area)
            const playersInContainer = fieldContainer.querySelectorAll('.player-card');
            playersInContainer.forEach(card => {
                card.remove();
            });

            // Re-render player pool to show all players
            this.renderPlayerPool();
        }
    }

    renderPlayerPool() {
        const pool = document.getElementById('playerPool');
        pool.innerHTML = '';
        
        // Get players from PlayerManager if available
        if (window.playerManager) {
            const players = window.playerManager.getPlayers();
            const squadFilter = document.getElementById('playerSquadFilter')?.value || '';
            const nameFilter = document.getElementById('playerNameFilter')?.value.toLowerCase() || '';
            const positionFilter = document.getElementById('playerPositionFilter')?.value || '';
            
            // Filter players based on sidebar filters
            let filteredPlayers = players.filter(player => {
                const matchesSquad = !squadFilter || player.squad.toLowerCase() === squadFilter.toLowerCase();
                const matchesName = !nameFilter || player.name.toLowerCase().includes(nameFilter);
                const matchesPosition = !positionFilter || player.position === positionFilter;
                return matchesSquad && matchesName && matchesPosition;
            });
            
            // Check if we need to filter by team display mode
            const teamDisplayMode = document.getElementById('teamDisplayMode')?.value;
            if (teamDisplayMode === '1') {
                // Single team mode - show only selected team
                const squad1Select = document.getElementById('squad1');
                if (squad1Select && squad1Select.value) {
                    filteredPlayers = filteredPlayers.filter(player => 
                        player.squad.toLowerCase() === squad1Select.value.toLowerCase()
                    );
                } else {
                    // If no team is selected, show no players
                    filteredPlayers = [];
                }
            } else if (teamDisplayMode === '2') {
                // Two teams mode - show only selected teams
                const squad1Select = document.getElementById('squad1');
                const squad2Select = document.getElementById('squad2');
                const selectedSquads = [];
                if (squad1Select && squad1Select.value) {
                    selectedSquads.push(squad1Select.value.toLowerCase());
                }
                if (squad2Select && squad2Select.value) {
                    selectedSquads.push(squad2Select.value.toLowerCase());
                }
                
                if (selectedSquads.length > 0) {
                    filteredPlayers = filteredPlayers.filter(player => 
                        selectedSquads.includes(player.squad.toLowerCase())
                    );
                } else {
                    // If no teams are selected, show no players
                    filteredPlayers = [];
                }
            }
            // For 'all' mode, we don't filter by team display mode - show all teams
            
            // Remove players that are already on the field
            const playersOnField = Array.from(document.querySelectorAll('#footballField .player-card'))
                .map(card => card.dataset.playerId);
            filteredPlayers = filteredPlayers.filter(player => 
                !playersOnField.includes(player.id)
            );
            
            // Render player cards
            filteredPlayers.forEach(player => {
                const card = this.createPlayerCard(player);
                pool.appendChild(card);
            });
            
            // Show message if no players
            if (filteredPlayers.length === 0) {
                pool.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Nessun giocatore trovato. Aggiungi giocatori dalla gestione giocatori.</p>';
            }
        } else {
            pool.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Sistema di gestione giocatori in caricamento...</p>';
        }
    }

    updateSquadFilter() {
        const squadFilter = document.getElementById('playerSquadFilter');
        const teamDisplayMode = document.getElementById('teamDisplayMode')?.value;
        
        if (!squadFilter) return;
        
        // Save current selection
        const currentValue = squadFilter.value;
        
        // Clear current options
        squadFilter.innerHTML = '<option value="">All Squads</option>';
        
        if (teamDisplayMode === '1') {
            // Single team mode - show only selected team in filter
            const squad1Select = document.getElementById('squad1');
            if (squad1Select && squad1Select.value) {
                const option = document.createElement('option');
                option.value = squad1Select.value;
                option.textContent = this.capitalizeSquadName(squad1Select.value);
                squadFilter.appendChild(option);
            }
        } else if (teamDisplayMode === '2') {
            // Two teams mode - show only selected teams in filter
            const squad1Select = document.getElementById('squad1');
            const squad2Select = document.getElementById('squad2');
            const selectedSquads = [];
            
            if (squad1Select && squad1Select.value) {
                selectedSquads.push(squad1Select.value);
            }
            if (squad2Select && squad2Select.value) {
                selectedSquads.push(squad2Select.value);
            }
            
            selectedSquads.forEach(squad => {
                const option = document.createElement('option');
                option.value = squad;
                option.textContent = this.capitalizeSquadName(squad);
                squadFilter.appendChild(option);
            });
        } else {
            // All teams mode - show all available teams
            const allSquads = [
                'alpak', 'bigbro', 'boomers', 'caesar', 'circus', 
                'd power', 'fc zeta', 'gear 7', 'stallions', 
                'trm fc', 'underdogs fc', 'zebras fc'
            ];
            
            allSquads.forEach(squad => {
                const option = document.createElement('option');
                option.value = squad;
                option.textContent = this.capitalizeSquadName(squad);
                squadFilter.appendChild(option);
            });
        }
        
        // Restore selection if still valid
        if (currentValue && Array.from(squadFilter.options).some(opt => opt.value === currentValue)) {
            squadFilter.value = currentValue;
        }
    }
    
    capitalizeSquadName(squadName) {
        return squadName.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    // Helper method to get team logo path
    getTeamLogo(squadName) {
        if (!squadName) return null;
        
        const logoMap = {
            'alpak': 'squad/alpak.png',
            'bigbro': 'squad/bigbro.png', 
            'big bro': 'squad/bigbro.png',
            'boomers': 'squad/boomers.png',
            'caesar': 'squad/caesar.png',
            'circus': 'squad/circus.png',
            'd power': 'squad/d power.png',
            'fc zeta': 'squad/fc zeta.png',
            'gear 7': 'squad/gear 7.png',
            'stallions': 'squad/stallions.png',
            'trm fc': 'squad/trm fc.png',
            'underdogs fc': 'squad/underdogs fc.png',
            'zebras fc': 'squad/zebras fc.png'
        };
        
        return logoMap[squadName.toLowerCase()] || null;
    }

    createPlayerCard(player) {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.draggable = true;
        card.dataset.playerId = player.id;
        card.dataset.position = player.position;

        const maxNameLength = 12;
        const displayName = player.name.length > maxNameLength
            ? player.name.substring(0, maxNameLength) + '...'
            : player.name;

        const teamLogo = this.getTeamLogo(player.squad);

        // Determine position class and abbreviated display name
        let positionClass = '';
        let positionDisplay = '';
        switch(player.position) {
            case 'PORTIERE':
                positionClass = 'gk';
                positionDisplay = 'GK';
                break;
            case 'DIFENSORE':
                positionClass = 'def';
                positionDisplay = 'DEF';
                break;
            case 'CENTROCAMPISTA':
                positionClass = 'mid';
                positionDisplay = 'MID';
                break;
            case 'ATTACCANTE':
                positionClass = 'fwd';
                positionDisplay = 'FWD';
                break;
            default:
                positionClass = player.position.toLowerCase();
                positionDisplay = player.position.substring(0, 3).toUpperCase();
        }

        // Add position class to the card for role-based styling
        card.classList.add(positionClass);

        // Check if roles should be hidden
        const hiddenRoleClass = this.rolesVisible ? '' : ' hidden-role';

        card.innerHTML = `
            <div class="player-card-header">
                <div class="player-name-large" title="${player.name}">${displayName}</div>
            </div>
            ${teamLogo ? `<div class="team-logo">
                <img src="${teamLogo}" alt="${player.squad} Logo">
            </div>` : `<div class="team-logo">
                <i class="fas fa-shield-alt"></i>
            </div>`}
            <div class="position-badge ${positionClass}${hiddenRoleClass}">
                ${positionDisplay}
            </div>
        `;

        // Add wildcard star icon if player has wildcard set to "SI" or true
        if (player.wildcard === 'SI' || player.wildcard === true) {
            const wildcardStar = document.createElement('div');
            wildcardStar.className = 'wildcard-star-btn';
            wildcardStar.innerHTML = '<i class="fas fa-star"></i>';
            wildcardStar.title = 'Wildcard Player';
            card.appendChild(wildcardStar);
        }

        // Add drag event listeners with improved precision
        card.addEventListener('dragstart', (e) => {
            this.draggedPlayer = player;
            
            // Calculate the offset from the mouse position to the card's top-left corner
            const cardRect = card.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - cardRect.left,
                y: e.clientY - cardRect.top
            };
            
            // Create a custom drag image that shows the complete player card
            const dragImage = card.cloneNode(true);
            dragImage.className = 'drag-preview player-card';
            dragImage.style.cssText = `
                position: absolute;
                top: -1000px;
                left: -1000px;
                width: 120px;
                height: 160px;
                transform: scale(0.9) rotate(5deg);
                opacity: 0.9;
                pointer-events: none;
                z-index: 1000;
                box-shadow: 0 8px 25px rgba(0,0,0,0.4);
                border: 2px solid #fff;
            `;
            
            // Add the position class to maintain styling
            dragImage.classList.add(positionClass);
            document.body.appendChild(dragImage);
            
            // Set the custom drag image
            e.dataTransfer.setDragImage(dragImage, this.dragOffset.x, this.dragOffset.y);
            
            // Clean up the drag image after a short delay
            setTimeout(() => {
                if (document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                }
            }, 100);
            
            // Set drag effect
            e.dataTransfer.effectAllowed = 'move';
        });
    
        card.addEventListener('dragend', () => {
            this.draggedPlayer = null;
            this.dragOffset = null;
        });

        return card;
    }

    handleTeamDisplayModeChange(mode) {
        const container = document.getElementById('squadSelectionsContainer');
        container.innerHTML = '';

        switch (mode) {
            case '1':
                // Create single squad selection and empty player pool
                this.createSquadSelection(container, 'Squadra 1', 'squad1');
                this.renderPlayerPool();
                this.updateSquadFilter();
                break;
            case '2':
                // Create two squad selections and empty player pool
                this.createSquadSelection(container, 'Squadra 1', 'squad1');
                this.createSquadSelection(container, 'Squadra 2', 'squad2');
                this.renderPlayerPool();
                this.updateSquadFilter();
                break;
            default:
                // No squad selections needed - show all players from database
                this.renderPlayerPool();
                this.updateSquadFilter();
                break;
        }
    }

    createSquadSelection(container, label, id) {
        const section = document.createElement('div');
        section.className = 'form-group';
        section.innerHTML = `
            <label for="${id}">${label}</label>
            <select id="${id}">
                <option value="">Seleziona squadra</option>
                <option value="alpak">Alpak</option>
                <option value="bigbro">Big Bro</option>
                <option value="boomers">Boomers</option>
                <option value="caesar">Caesar</option>
                <option value="circus">Circus</option>
                <option value="d power">D Power</option>
                <option value="fc zeta">FC Zeta</option>
                <option value="gear 7">Gear 7</option>
                <option value="stallions">Stallions</option>
                <option value="trm fc">TRM FC</option>
                <option value="underdogs fc">Underdogs FC</option>
                <option value="zebras fc">Zebras FC</option>
            </select>
        `;
        container.appendChild(section);
        
        // Add event listener to the newly created select
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', () => {
                this.renderPlayerPool();
                this.updateSquadFilter();
            });
        }
    }



    setupTacticalMode() {
        const tacticalBtn = document.getElementById('tacticalModeBtn');
        const tacticalToolsPanel = document.getElementById('tacticalToolsPanel');
        const tacticalCanvas = document.getElementById('tacticalCanvas');
        const closeTacticalBtn = document.getElementById('closeTacticalMode');
        let tacticalMode = false;
        let currentTool = 'select';
        let isDrawing = false;
        let startPoint = null;
        let selectedElement = null;
        
        // History for undo/redo functionality
        let drawingHistory = [];
        let historyIndex = -1;
        let eraserSessionActive = false;

        // Make tactical tools panel draggable
        this.makeDraggable(tacticalToolsPanel);

        tacticalBtn.addEventListener('click', () => {
            tacticalMode = !tacticalMode;
            const field = document.getElementById('footballField');
            
            if (tacticalMode) {
                field.classList.add('tactical-mode');
                tacticalBtn.innerHTML = '<i class="fas fa-futbol"></i> Modalità Normale';
                tacticalBtn.classList.add('active');
                
                // Show tactical tools and canvas
                if (tacticalToolsPanel) tacticalToolsPanel.style.display = 'block';
                if (tacticalCanvas) {
                    tacticalCanvas.style.display = 'block';
                    tacticalCanvas.classList.add('drawing-mode');
                }
            } else {
                field.classList.remove('tactical-mode');
                tacticalBtn.innerHTML = '<i class="fas fa-draw-polygon"></i> Modalità Tattica';
                tacticalBtn.classList.remove('active');
                
                // Hide tactical tools and canvas
                if (tacticalToolsPanel) tacticalToolsPanel.style.display = 'none';
                if (tacticalCanvas) {
                    tacticalCanvas.style.display = 'none';
                    tacticalCanvas.classList.remove('drawing-mode');
                }
            }
        });

        // Close tactical mode button
        if (closeTacticalBtn) {
            closeTacticalBtn.addEventListener('click', () => {
                tacticalMode = false;
                const field = document.getElementById('footballField');
                field.classList.remove('tactical-mode');
                tacticalBtn.innerHTML = '<i class="fas fa-draw-polygon"></i> Modalità Tattica';
                tacticalBtn.classList.remove('active');
                
                // Hide tactical tools and canvas
                if (tacticalToolsPanel) tacticalToolsPanel.style.display = 'none';
                if (tacticalCanvas) {
                    tacticalCanvas.style.display = 'none';
                    tacticalCanvas.classList.remove('drawing-mode');
                }
            });
        }

        // Setup tool buttons
        const toolButtons = document.querySelectorAll('.tool-btn');
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remove active class from all tool buttons
                toolButtons.forEach(b => b.classList.remove('active'));
                // Add active class to clicked button
                btn.classList.add('active');
                
                currentTool = btn.dataset.tool;
                console.log('Selected tool:', currentTool);
                
                // Remove eraser preview when switching away from eraser
                if (currentTool !== 'eraser' && eraserPreview) {
                    eraserPreview.remove();
                    eraserPreview = null;
                }
            });
        });

        // Setup canvas drawing functionality
        if (tacticalCanvas) {
            let currentPath = null; // For pen tool
            let pathPoints = []; // Store points for pen drawing
            let eraserPreview = null; // For eraser preview circle
            
            // Create eraser preview circle
            const createEraserPreview = (canvas) => {
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('class', 'eraser-preview');
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', '#ff0000');
                circle.setAttribute('stroke-width', '2');
                circle.setAttribute('stroke-dasharray', '5,5');
                circle.setAttribute('opacity', '0.7');
                circle.style.pointerEvents = 'none';
                canvas.appendChild(circle);
                return circle;
            };
            
            // Update eraser preview position and size
            const updateEraserPreview = (circle, x, y, radius) => {
                circle.setAttribute('cx', x);
                circle.setAttribute('cy', y);
                circle.setAttribute('r', radius);
            };
            
            // Remove or cut elements within eraser circle
            const eraseElements = (canvas, x, y, radius) => {
                const elements = canvas.querySelectorAll('.tactical-element, .temp-element');
                let hasChanges = false;
                
                elements.forEach(element => {
                    const tagName = element.tagName.toLowerCase();
                    
                    if (tagName === 'line') {
                        if (cutLineWithCircle(element, x, y, radius, canvas)) {
                            hasChanges = true;
                        }
                    } else if (tagName === 'path') {
                        if (cutPathWithCircle(element, x, y, radius, canvas)) {
                            hasChanges = true;
                        }
                    } else {
                        // For other elements (circles, rectangles), use original logic
                        if (isElementInCircle(element, x, y, radius)) {
                            element.remove();
                            hasChanges = true;
                        }
                    }
                });
                
                // Only save to history if changes occurred and we're not in an active eraser session
                if (hasChanges && !eraserSessionActive) {
                    eraserSessionActive = true;
                    this.saveToHistory(canvas);
                }
            };
            
            // Cut line element with eraser circle
            const cutLineWithCircle = (line, centerX, centerY, radius, canvas) => {
                const x1 = parseFloat(line.getAttribute('x1'));
                const y1 = parseFloat(line.getAttribute('y1'));
                const x2 = parseFloat(line.getAttribute('x2'));
                const y2 = parseFloat(line.getAttribute('y2'));
                
                const intersections = getLineCircleIntersections(x1, y1, x2, y2, centerX, centerY, radius);
                
                if (intersections.length === 0) {
                    return false; // No intersection, no changes
                }
                
                // Sort intersections by distance from start point
                intersections.sort((a, b) => {
                    const distA = Math.sqrt((a.x - x1) ** 2 + (a.y - y1) ** 2);
                    const distB = Math.sqrt((b.x - x1) ** 2 + (b.y - y1) ** 2);
                    return distA - distB;
                });
                
                // Remove original line
                const lineAttributes = {
                    stroke: line.getAttribute('stroke'),
                    'stroke-width': line.getAttribute('stroke-width'),
                    'stroke-dasharray': line.getAttribute('stroke-dasharray'),
                    class: line.getAttribute('class')
                };
                line.remove();
                
                // Create new line segments
                if (intersections.length >= 1) {
                    const firstIntersection = intersections[0];
                    const lastIntersection = intersections[intersections.length - 1];
                    
                    // Create segment from start to first intersection
                    const dist1 = Math.sqrt((firstIntersection.x - x1) ** 2 + (firstIntersection.y - y1) ** 2);
                    if (dist1 > 2) { // Only create if segment is long enough
                        createLineSegment(canvas, x1, y1, firstIntersection.x, firstIntersection.y, lineAttributes);
                    }
                    
                    // Create segment from last intersection to end
                    const dist2 = Math.sqrt((x2 - lastIntersection.x) ** 2 + (y2 - lastIntersection.y) ** 2);
                    if (dist2 > 2) { // Only create if segment is long enough
                        createLineSegment(canvas, lastIntersection.x, lastIntersection.y, x2, y2, lineAttributes);
                    }
                }
                
                return true;
            };
            
            // Cut path element with eraser circle
            const cutPathWithCircle = (path, centerX, centerY, radius, canvas) => {
                const pathData = path.getAttribute('d');
                if (!pathData) return false;
                
                // Check if the path intersects with the eraser circle by testing the actual path
                const pathElement = path.cloneNode(true);
                const pathLength = pathElement.getTotalLength ? pathElement.getTotalLength() : 0;
                
                if (pathLength === 0) return false;
                
                // Sample points along the path to check for intersection
                const sampleCount = Math.max(50, Math.floor(pathLength / 2));
                let hasIntersection = false;
                const intersectionRanges = [];
                let currentRange = null;
                
                for (let i = 0; i <= sampleCount; i++) {
                    const t = i / sampleCount;
                    const point = pathElement.getPointAtLength ? pathElement.getPointAtLength(t * pathLength) : null;
                    
                    if (point) {
                        const distance = Math.sqrt(
                            (point.x - centerX) ** 2 + (point.y - centerY) ** 2
                        );
                        const isInside = distance <= radius;
                        
                        if (isInside) {
                            hasIntersection = true;
                            if (!currentRange) {
                                currentRange = { start: t, end: t };
                            } else {
                                currentRange.end = t;
                            }
                        } else {
                            if (currentRange) {
                                intersectionRanges.push(currentRange);
                                currentRange = null;
                            }
                        }
                    }
                }
                
                // Add final range if it exists
                if (currentRange) {
                    intersectionRanges.push(currentRange);
                }
                
                // If no intersection, no changes needed
                if (!hasIntersection) {
                    return false;
                }
                
                // If the entire path is inside the circle, remove it
                if (intersectionRanges.length === 1 && 
                    intersectionRanges[0].start <= 0.01 && 
                    intersectionRanges[0].end >= 0.99) {
                    path.remove();
                    return true;
                }
                
                // Store original path attributes
                const pathAttributes = {
                    stroke: path.getAttribute('stroke'),
                    'stroke-width': path.getAttribute('stroke-width'),
                    fill: path.getAttribute('fill'),
                    class: path.getAttribute('class')
                };
                
                // Create segments for the parts that should remain
                const segments = [];
                let lastEnd = 0;
                
                intersectionRanges.forEach(range => {
                    if (range.start > lastEnd + 0.01) {
                        segments.push({ start: lastEnd, end: range.start });
                    }
                    lastEnd = range.end;
                });
                
                // Add final segment if needed
                if (lastEnd < 0.99) {
                    segments.push({ start: lastEnd, end: 1 });
                }
                
                // Remove original path
                path.remove();
                
                // Create new path segments preserving original curves
                segments.forEach(segment => {
                    if (segment.end - segment.start > 0.01) {
                        createPathSegmentFromOriginal(canvas, pathElement, segment.start, segment.end, pathAttributes, pathLength);
                    }
                });
                
                return true;
            };
            
            // Helper function to create line segment
            const createLineSegment = (canvas, x1, y1, x2, y2, attributes) => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', x1);
                line.setAttribute('y1', y1);
                line.setAttribute('x2', x2);
                line.setAttribute('y2', y2);
                
                Object.keys(attributes).forEach(attr => {
                    if (attributes[attr]) {
                        line.setAttribute(attr, attributes[attr]);
                    }
                });
                
                canvas.appendChild(line);
            };
            
            // Helper function to create path segment from original path preserving curves
            const createPathSegmentFromOriginal = (canvas, originalPath, startT, endT, attributes, pathLength) => {
                if (!originalPath.getPointAtLength) return;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                
                // Calculate segment length and determine appropriate sampling
                const segmentLength = (endT - startT) * pathLength;
                
                // Use higher density sampling for better curve preservation
                // Minimum 20 points, with more points for longer segments
                const sampleCount = Math.max(20, Math.floor(segmentLength / 2));
                const points = [];
                
                for (let i = 0; i <= sampleCount; i++) {
                    const t = startT + (endT - startT) * (i / sampleCount);
                    const point = originalPath.getPointAtLength(t * pathLength);
                    if (point) {
                        points.push({ x: point.x, y: point.y });
                    }
                }
                
                if (points.length < 2) return;
                
                // Try to extract and preserve the original path data structure
                const originalPathData = originalPath.getAttribute('d');
                if (originalPathData && segmentLength > pathLength * 0.8) {
                    // If we're preserving most of the path, try to use the original path data
                    path.setAttribute('d', originalPathData);
                } else {
                    // Create high-fidelity path data using cubic Bezier curves for smoother results
                    let pathData = `M ${points[0].x} ${points[0].y}`;
                    
                    if (points.length === 2) {
                        pathData += ` L ${points[1].x} ${points[1].y}`;
                    } else if (points.length === 3) {
                        // Use quadratic curve for 3 points
                        pathData += ` Q ${points[1].x} ${points[1].y} ${points[2].x} ${points[2].y}`;
                    } else {
                        // Use cubic Bezier curves for better curve preservation
                        for (let i = 1; i < points.length; i += 3) {
                            if (i + 2 < points.length) {
                                // Full cubic Bezier curve
                                pathData += ` C ${points[i].x} ${points[i].y} ${points[i + 1].x} ${points[i + 1].y} ${points[i + 2].x} ${points[i + 2].y}`;
                            } else if (i + 1 < points.length) {
                                // Quadratic curve for remaining points
                                pathData += ` Q ${points[i].x} ${points[i].y} ${points[i + 1].x} ${points[i + 1].y}`;
                            } else {
                                // Line to last point
                                pathData += ` L ${points[i].x} ${points[i].y}`;
                            }
                        }
                    }
                    
                    path.setAttribute('d', pathData);
                }
                
                Object.keys(attributes).forEach(attr => {
                    if (attributes[attr]) {
                        path.setAttribute(attr, attributes[attr]);
                    }
                });
                
                canvas.appendChild(path);
            };
            
            // Parse SVG path data to extract points
            const parsePathData = (pathData) => {
                const points = [];
                const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
                
                if (!commands) return points;
                
                let currentX = 0, currentY = 0;
                let lastControlX = 0, lastControlY = 0;
                
                commands.forEach(command => {
                    const type = command[0];
                    const coords = command.slice(1).trim().split(/[\s,]+/).map(parseFloat);
                    
                    if (type === 'M' || type === 'm') {
                        for (let i = 0; i < coords.length; i += 2) {
                            if (type === 'M') {
                                currentX = coords[i];
                                currentY = coords[i + 1];
                            } else {
                                currentX += coords[i];
                                currentY += coords[i + 1];
                            }
                            points.push({ x: currentX, y: currentY });
                        }
                    } else if (type === 'L' || type === 'l') {
                        for (let i = 0; i < coords.length; i += 2) {
                            if (type === 'L') {
                                currentX = coords[i];
                                currentY = coords[i + 1];
                            } else {
                                currentX += coords[i];
                                currentY += coords[i + 1];
                            }
                            points.push({ x: currentX, y: currentY });
                        }
                    } else if (type === 'Q' || type === 'q') {
                        for (let i = 0; i < coords.length; i += 4) {
                            if (type === 'Q') {
                                lastControlX = coords[i];
                                lastControlY = coords[i + 1];
                                currentX = coords[i + 2];
                                currentY = coords[i + 3];
                            } else {
                                lastControlX = currentX + coords[i];
                                lastControlY = currentY + coords[i + 1];
                                currentX += coords[i + 2];
                                currentY += coords[i + 3];
                            }
                            points.push({ x: currentX, y: currentY });
                        }
                    } else if (type === 'T' || type === 't') {
                        for (let i = 0; i < coords.length; i += 2) {
                            // T command uses reflection of previous control point
                            const reflectedControlX = currentX + (currentX - lastControlX);
                            const reflectedControlY = currentY + (currentY - lastControlY);
                            
                            if (type === 'T') {
                                currentX = coords[i];
                                currentY = coords[i + 1];
                            } else {
                                currentX += coords[i];
                                currentY += coords[i + 1];
                            }
                            
                            lastControlX = reflectedControlX;
                            lastControlY = reflectedControlY;
                            points.push({ x: currentX, y: currentY });
                        }
                    }
                });
                
                return points;
            };
            
            // Calculate line-circle intersections
            const getLineCircleIntersections = (x1, y1, x2, y2, cx, cy, r) => {
                const dx = x2 - x1;
                const dy = y2 - y1;
                const fx = x1 - cx;
                const fy = y1 - cy;
                
                const a = dx * dx + dy * dy;
                const b = 2 * (fx * dx + fy * dy);
                const c = (fx * fx + fy * fy) - r * r;
                
                const discriminant = b * b - 4 * a * c;
                
                if (discriminant < 0) {
                    return []; // No intersection
                }
                
                const discriminantSqrt = Math.sqrt(discriminant);
                const t1 = (-b - discriminantSqrt) / (2 * a);
                const t2 = (-b + discriminantSqrt) / (2 * a);
                
                const intersections = [];
                
                if (t1 >= 0 && t1 <= 1) {
                    intersections.push({
                        x: x1 + t1 * dx,
                        y: y1 + t1 * dy
                    });
                }
                
                if (t2 >= 0 && t2 <= 1 && Math.abs(t2 - t1) > 0.001) {
                    intersections.push({
                        x: x1 + t2 * dx,
                        y: y1 + t2 * dy
                    });
                }
                
                return intersections;
            };
            
            // Check if element intersects with eraser circle (for non-line elements)
            const isElementInCircle = (element, centerX, centerY, radius) => {
                const bbox = element.getBBox();
                const elementCenterX = bbox.x + bbox.width / 2;
                const elementCenterY = bbox.y + bbox.height / 2;
                
                // Check if element center is within circle
                const distance = Math.sqrt(
                    Math.pow(elementCenterX - centerX, 2) + 
                    Math.pow(elementCenterY - centerY, 2)
                );
                
                return distance <= radius;
            };
            
            tacticalCanvas.addEventListener('mousedown', (e) => {
                if (!tacticalMode) return;
                
                if (currentTool === 'eraser') {
                    // Handle eraser tool
                    const rect = tacticalCanvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const strokeWidth = parseInt(document.getElementById('strokeWidth').value);
                    const radius = strokeWidth * 5; // Scale radius based on thickness
                    
                    eraseElements(tacticalCanvas, x, y, radius);
                    isDrawing = true;
                    return;
                }
                
                if (currentTool === 'select') {
                    // Handle selection
                    const clickedElement = e.target;
                    if (clickedElement.classList.contains('tactical-element')) {
                        // Deselect previous element
                        if (selectedElement) {
                            selectedElement.classList.remove('selected');
                        }
                        // Select new element
                        selectedElement = clickedElement;
                        selectedElement.classList.add('selected');
                    } else {
                        // Deselect if clicking on empty space
                        if (selectedElement) {
                            selectedElement.classList.remove('selected');
                            selectedElement = null;
                        }
                    }
                    return;
                }
                
                if (currentTool === 'text') {
                    // Handle text tool
                    const rect = tacticalCanvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    this.addTextElement(tacticalCanvas, x, y).then(() => {
                        this.saveToHistory(tacticalCanvas);
                    });
                    return;
                }
                
                if (currentTool === 'pen') {
                    // Handle pen tool - start new path
                    const rect = tacticalCanvas.getBoundingClientRect();
                    const point = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    };
                    
                    pathPoints = [point];
                    currentPath = this.createPenPath(tacticalCanvas, pathPoints);
                    isDrawing = true;
                    return;
                }
                
                isDrawing = true;
                const rect = tacticalCanvas.getBoundingClientRect();
                startPoint = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
            });

            tacticalCanvas.addEventListener('mousemove', (e) => {
                const rect = tacticalCanvas.getBoundingClientRect();
                const currentPoint = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                if (currentTool === 'eraser') {
                    // Show eraser preview
                    if (!eraserPreview) {
                        eraserPreview = createEraserPreview(tacticalCanvas);
                    }
                    
                    const strokeWidth = parseInt(document.getElementById('strokeWidth').value);
                    const radius = strokeWidth * 5; // Scale radius based on thickness
                    updateEraserPreview(eraserPreview, currentPoint.x, currentPoint.y, radius);
                    
                    // Continue erasing if mouse is down (freehand erasing)
                    if (isDrawing) {
                        eraseElements(tacticalCanvas, currentPoint.x, currentPoint.y, radius);
                    }
                    return;
                } else {
                    // Remove eraser preview when not using eraser
                    if (eraserPreview) {
                        eraserPreview.remove();
                        eraserPreview = null;
                    }
                }
                
                if (!isDrawing || currentTool === 'select' || currentTool === 'text') return;
                
                if (currentTool === 'pen') {
                    // Handle pen tool - add point to path
                    pathPoints.push(currentPoint);
                    this.updatePenPath(currentPath, pathPoints);
                    return;
                }
                
                if (!startPoint) return;
                
                // Remove temporary elements
                const tempElements = tacticalCanvas.querySelectorAll('.temp-element');
                tempElements.forEach(el => el.remove());
                
                // Draw temporary element based on current tool
                this.drawTacticalElement(tacticalCanvas, currentTool, startPoint, currentPoint, true);
            });

            tacticalCanvas.addEventListener('mouseup', (e) => {
                if (currentTool === 'eraser') {
                    isDrawing = false;
                    // Reset eraser session flag when mouse is released
                    eraserSessionActive = false;
                    return;
                }
                
                if (!isDrawing || currentTool === 'select' || currentTool === 'text') return;
                
                if (currentTool === 'pen') {
                    // Handle pen tool - finalize path
                    if (currentPath) {
                        currentPath.classList.remove('temp-element');
                        currentPath.classList.add('tactical-element');
                        this.saveToHistory(tacticalCanvas);
                    }
                    currentPath = null;
                    pathPoints = [];
                    isDrawing = false;
                    return;
                }
                
                if (!startPoint) return;
                
                const rect = tacticalCanvas.getBoundingClientRect();
                const endPoint = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top
                };
                
                // Remove temporary elements
                const tempElements = tacticalCanvas.querySelectorAll('.temp-element');
                tempElements.forEach(el => el.remove());
                
                // Draw final element
                this.drawTacticalElement(tacticalCanvas, currentTool, startPoint, endPoint, false);
                
                // Save to history
                this.saveToHistory(tacticalCanvas);
                
                isDrawing = false;
                startPoint = null;
            });
            
            // Handle mouse leave to hide eraser preview
            tacticalCanvas.addEventListener('mouseleave', () => {
                if (eraserPreview) {
                    eraserPreview.remove();
                    eraserPreview = null;
                }
            });
        }

        // Setup action buttons
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        const clearDrawingBtn = document.getElementById('clearDrawingBtn');

        if (undoBtn) {
            undoBtn.addEventListener('click', () => {
                this.undo(tacticalCanvas);
            });
        }

        if (redoBtn) {
            redoBtn.addEventListener('click', () => {
                this.redo(tacticalCanvas);
            });
        }

        if (clearDrawingBtn) {
            clearDrawingBtn.addEventListener('click', () => {
                if (tacticalCanvas) {
                    tacticalCanvas.innerHTML = '';
                    this.saveToHistory(tacticalCanvas);
                }
            });
        }

        // Delete key functionality (Delete and Backspace)
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedElement && tacticalMode) {
                selectedElement.remove();
                selectedElement = null;
                this.saveToHistory(tacticalCanvas);
            }
        });

        // History management functions
        this.saveToHistory = (canvas) => {
            const currentState = canvas.innerHTML;
            // Remove future history if we're not at the end
            if (historyIndex < drawingHistory.length - 1) {
                drawingHistory = drawingHistory.slice(0, historyIndex + 1);
            }
            drawingHistory.push(currentState);
            historyIndex = drawingHistory.length - 1;
            
            // Limit history size
            if (drawingHistory.length > 50) {
                drawingHistory.shift();
                historyIndex--;
            }
        };

        this.undo = (canvas) => {
            if (historyIndex > 0) {
                historyIndex--;
                canvas.innerHTML = drawingHistory[historyIndex];
                selectedElement = null;
                
                // Remove eraser preview if it exists by searching for it in the canvas
                const existingEraserPreview = canvas.querySelector('.eraser-preview');
                if (existingEraserPreview) {
                    existingEraserPreview.remove();
                }
                // Also reset the variable if it exists in scope
                if (typeof eraserPreview !== 'undefined' && eraserPreview) {
                    eraserPreview = null;
                }
            }
        };

        this.redo = (canvas) => {
            if (historyIndex < drawingHistory.length - 1) {
                historyIndex++;
                canvas.innerHTML = drawingHistory[historyIndex];
                selectedElement = null;
                
                // Remove eraser preview if it exists by searching for it in the canvas
                const existingEraserPreview = canvas.querySelector('.eraser-preview');
                if (existingEraserPreview) {
                    existingEraserPreview.remove();
                }
                // Also reset the variable if it exists in scope
                if (typeof eraserPreview !== 'undefined' && eraserPreview) {
                    eraserPreview = null;
                }
            }
        };

        // Setup stroke width display update
        const strokeWidthSlider = document.getElementById('strokeWidth');
        const strokeWidthValue = document.getElementById('strokeWidthValue');
        if (strokeWidthSlider && strokeWidthValue) {
            strokeWidthSlider.addEventListener('input', () => {
                strokeWidthValue.textContent = strokeWidthSlider.value + 'px';
            });
        }

        // Initialize history with empty state
        this.saveToHistory(tacticalCanvas);
    }

    makeDraggable(element) {
        if (!element) return;
        
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        const header = element.querySelector('.tools-header');
        if (!header) return;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            element.style.transition = 'none';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });
        
        function handleMouseMove(e) {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newX = initialX + deltaX;
            const newY = initialY + deltaY;
            
            // Keep panel within viewport bounds
            const maxX = window.innerWidth - element.offsetWidth;
            const maxY = window.innerHeight - element.offsetHeight;
            
            const boundedX = Math.max(0, Math.min(newX, maxX));
            const boundedY = Math.max(0, Math.min(newY, maxY));
            
            element.style.left = boundedX + 'px';
            element.style.top = boundedY + 'px';
            element.style.right = 'auto';
        }
        
        function handleMouseUp() {
            isDragging = false;
            element.style.transition = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }
    }

    drawTacticalElement(canvas, tool, startPoint, endPoint, isTemporary = false) {
        const svgNS = "http://www.w3.org/2000/svg";
        let element;
        
        // Get current style settings
        const strokeColor = document.getElementById('strokeColor')?.value || '#3b82f6';
        const strokeWidth = document.getElementById('strokeWidth')?.value || '2';
        const fillColor = document.getElementById('fillColor')?.value || '#ffffff';
        const fillEnabled = document.getElementById('fillEnabled')?.checked || false;
        
        switch (tool) {
            case 'line':
                element = document.createElementNS(svgNS, 'line');
                element.setAttribute('x1', startPoint.x);
                element.setAttribute('y1', startPoint.y);
                element.setAttribute('x2', endPoint.x);
                element.setAttribute('y2', endPoint.y);
                element.setAttribute('stroke', strokeColor);
                element.setAttribute('stroke-width', strokeWidth);
                break;
                
            case 'arrow':
                element = document.createElementNS(svgNS, 'g');
                
                // Line
                const line = document.createElementNS(svgNS, 'line');
                line.setAttribute('x1', startPoint.x);
                line.setAttribute('y1', startPoint.y);
                line.setAttribute('x2', endPoint.x);
                line.setAttribute('y2', endPoint.y);
                line.setAttribute('stroke', strokeColor);
                line.setAttribute('stroke-width', strokeWidth);
                element.appendChild(line);
                
                // Arrow head - scale with stroke width
                const angle = Math.atan2(endPoint.y - startPoint.y, endPoint.x - startPoint.x);
                const strokeWidthNum = parseFloat(strokeWidth);
                const arrowLength = Math.max(10, strokeWidthNum * 3); // Scale arrow length with stroke width
                const arrowAngle = Math.PI / 6;
                
                const arrowHead = document.createElementNS(svgNS, 'polygon');
                const x1 = endPoint.x - arrowLength * Math.cos(angle - arrowAngle);
                const y1 = endPoint.y - arrowLength * Math.sin(angle - arrowAngle);
                const x2 = endPoint.x - arrowLength * Math.cos(angle + arrowAngle);
                const y2 = endPoint.y - arrowLength * Math.sin(angle + arrowAngle);
                
                arrowHead.setAttribute('points', `${endPoint.x},${endPoint.y} ${x1},${y1} ${x2},${y2}`);
                arrowHead.setAttribute('fill', strokeColor);
                arrowHead.setAttribute('stroke', strokeColor);
                arrowHead.setAttribute('stroke-width', Math.max(1, strokeWidthNum * 0.5)); // Add stroke to arrow head
                arrowHead.setAttribute('stroke-linejoin', 'round'); // Smooth joins
                element.appendChild(arrowHead);
                break;
                
            case 'circle':
                element = document.createElementNS(svgNS, 'circle');
                const radius = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
                element.setAttribute('cx', startPoint.x);
                element.setAttribute('cy', startPoint.y);
                element.setAttribute('r', radius);
                element.setAttribute('stroke', strokeColor);
                element.setAttribute('stroke-width', strokeWidth);
                element.setAttribute('fill', fillEnabled ? fillColor : 'none');
                break;
                
            case 'rectangle':
                element = document.createElementNS(svgNS, 'rect');
                const width = Math.abs(endPoint.x - startPoint.x);
                const height = Math.abs(endPoint.y - startPoint.y);
                const x = Math.min(startPoint.x, endPoint.x);
                const y = Math.min(startPoint.y, endPoint.y);
                
                element.setAttribute('x', x);
                element.setAttribute('y', y);
                element.setAttribute('width', width);
                element.setAttribute('height', height);
                element.setAttribute('stroke', strokeColor);
                element.setAttribute('stroke-width', strokeWidth);
                element.setAttribute('fill', fillEnabled ? fillColor : 'none');
                break;
        }
        
        if (element) {
            if (isTemporary) {
                element.classList.add('temp-element');
            } else {
                element.classList.add('tactical-element');
            }
            canvas.appendChild(element);
        }
    }

    async addTextElement(canvas, x, y) {
        const result = await this.showTextInputModal('Inserisci il testo:', 'Scrivi qui il testo...');
        if (!result || !result.text) return;
        
        const svgNS = "http://www.w3.org/2000/svg";
        const textElement = document.createElementNS(svgNS, 'text');
        
        textElement.setAttribute('x', x);
        textElement.setAttribute('y', y);
        textElement.setAttribute('fill', result.color);
        textElement.setAttribute('font-size', '14');
        textElement.setAttribute('font-family', 'Arial, sans-serif');
        textElement.setAttribute('font-weight', 'bold');
        textElement.textContent = result.text;
        textElement.classList.add('tactical-element');
        textElement.style.cursor = 'pointer';
        
        // Add interactive functionality
        this.makeTextInteractive(textElement, canvas);
        
        canvas.appendChild(textElement);
    }

    makeTextInteractive(textElement, canvas) {
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        // Double click to edit text
        textElement.addEventListener('dblclick', async (e) => {
            e.stopPropagation();
            const currentColor = textElement.getAttribute('fill') || '#3b82f6';
            const result = await this.showTextInputModal('Modifica il testo:', 'Scrivi qui il testo...', textElement.textContent, true, currentColor);
            
            if (result === 'DELETE') {
                // Delete the text element
                textElement.remove();
                this.saveToHistory(canvas);
            } else if (result !== null && result.text !== '') {
                // Update the text content and color
                textElement.textContent = result.text;
                textElement.setAttribute('fill', result.color);
                this.saveToHistory(canvas);
            }
        });
        
        // Mouse down - start dragging
        textElement.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            isDragging = true;
            
            const rect = canvas.getBoundingClientRect();
            const currentX = parseFloat(textElement.getAttribute('x'));
            const currentY = parseFloat(textElement.getAttribute('y'));
            
            dragOffset.x = (e.clientX - rect.left) - currentX;
            dragOffset.y = (e.clientY - rect.top) - currentY;
            
            textElement.style.opacity = '0.7';
            textElement.style.cursor = 'grabbing';
            
            // Add global mouse move and up listeners
            const handleMouseMove = (e) => {
                if (!isDragging) return;
                
                const rect = canvas.getBoundingClientRect();
                const newX = (e.clientX - rect.left) - dragOffset.x;
                const newY = (e.clientY - rect.top) - dragOffset.y;
                
                // Keep text within canvas bounds
                const canvasWidth = canvas.clientWidth;
                const canvasHeight = canvas.clientHeight;
                
                const boundedX = Math.max(0, Math.min(newX, canvasWidth - 50));
                const boundedY = Math.max(14, Math.min(newY, canvasHeight - 5));
                
                textElement.setAttribute('x', boundedX);
                textElement.setAttribute('y', boundedY);
            };
            
            const handleMouseUp = () => {
                if (isDragging) {
                    isDragging = false;
                    textElement.style.opacity = '1';
                    textElement.style.cursor = 'pointer';
                    this.saveToHistory(canvas);
                }
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        // Hover effects
        textElement.addEventListener('mouseenter', () => {
            if (!isDragging) {
                textElement.style.opacity = '0.8';
            }
        });
        
        textElement.addEventListener('mouseleave', () => {
            if (!isDragging) {
                textElement.style.opacity = '1';
            }
        });
    }

    setupSchemeManagement() {
        // Scheme management functionality will be implemented here
        console.log('Scheme management setup completed');
    }

    // Setup Role Toggle functionality
    setupRoleToggle() {
        const roleToggleBtn = document.getElementById('roleToggleBtn');
        if (!roleToggleBtn) {
            console.error('Role toggle button not found');
            return;
        }

        // Initialize state from localStorage or default to true (ON)
        const savedState = localStorage.getItem('roleToggleState');
        this.rolesVisible = savedState !== null ? JSON.parse(savedState) : true;
        
        // Set initial button state
        this.updateRoleToggleButton();
        this.toggleRoleVisibility(this.rolesVisible);

        // Add click event listener
        roleToggleBtn.addEventListener('click', () => {
            this.rolesVisible = !this.rolesVisible;
            this.updateRoleToggleButton();
            this.toggleRoleVisibility(this.rolesVisible);
            
            // Save state to localStorage
            localStorage.setItem('roleToggleState', JSON.stringify(this.rolesVisible));
            
            // Show feedback notification
            this.showRoleToggleNotification();
        });

        console.log('Role toggle setup completed');
    }

    // Update the visual state of the toggle button
    updateRoleToggleButton() {
        const roleToggleBtn = document.getElementById('roleToggleBtn');
        const toggleText = roleToggleBtn.querySelector('.toggle-text');
        const icon = roleToggleBtn.querySelector('.fas');

        if (this.rolesVisible) {
            roleToggleBtn.classList.remove('off');
            toggleText.textContent = 'ON';
            icon.className = 'fas fa-eye';
            roleToggleBtn.title = 'Clicca per nascondere i ruoli dei giocatori';
        } else {
            roleToggleBtn.classList.add('off');
            toggleText.textContent = 'OFF';
            icon.className = 'fas fa-eye-slash';
            roleToggleBtn.title = 'Clicca per mostrare i ruoli dei giocatori';
        }
    }

    // Toggle visibility of all position badges
    toggleRoleVisibility(visible) {
        const positionBadges = document.querySelectorAll('.position-badge');
        
        positionBadges.forEach(badge => {
            if (visible) {
                badge.classList.remove('hidden-role');
            } else {
                badge.classList.add('hidden-role');
            }
        });
    }

    // Show notification when toggle state changes
    showRoleToggleNotification() {
        const message = this.rolesVisible ? 
            'Ruoli dei giocatori mostrati' : 
            'Ruoli dei giocatori nascosti';
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'role-toggle-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.rolesVisible ? '#10b981' : '#ef4444'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 2000);
    }

    // Export field as PNG
    async exportFieldAsPNG() {
        try {
            const fieldElement = document.getElementById('footballField');
            if (!fieldElement) {
                throw new Error('Campo da calcio non trovato');
            }

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                throw new Error('Impossibile creare contesto canvas');
            }

            // Set canvas size
            canvas.width = 800;
            canvas.height = 600;

            // Draw field background
            ctx.fillStyle = '#2d5a2d';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw field lines
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

            // Center circle
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 80, 0, 2 * Math.PI);
            ctx.stroke();

            // Get field element to calculate player positions
            const fieldRect = fieldElement.getBoundingClientRect();

            // Draw players on field
            const playersOnField = fieldElement.querySelectorAll('.player-card');
            
            for (const playerCard of playersOnField) {
                const playerRect = playerCard.getBoundingClientRect();
                const playerName = playerCard.querySelector('.player-name-large').textContent;
                const playerPosition = playerCard.querySelector('.position-badge').textContent;

                // Calculate relative position
                const relativeX = ((playerRect.left - fieldRect.left) / fieldRect.width) * canvas.width;
                const relativeY = ((playerRect.top - fieldRect.top) / fieldRect.height) * canvas.height;

                // Draw player circle
                ctx.fillStyle = this.getPositionColor(playerPosition);
                ctx.beginPath();
                ctx.arc(relativeX + 40, relativeY + 40, 25, 0, 2 * Math.PI);
                ctx.fill();

                // Draw player name
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(playerName, relativeX + 40, relativeY + 45);
            }

            // Convert to blob and download
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tactical-formation-${new Date().toISOString().slice(0, 10)}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });

        } catch (error) {
            console.error('Errore durante la generazione PNG:', error);
            alert('Errore durante l\'esportazione dell\'immagine');
        }
    }

    getPositionColor(position) {
        const colors = {
            'GK': '#ff6b6b',
            'DEF': '#4ecdc4',
            'MID': '#45b7d1',
            'FWD': '#96ceb4'
        };
        return colors[position] || '#95a5a6';
    }
}

// Player Management System
class PlayerManager {
    constructor() {
        this.players = [];
        this.currentEditingId = null;
        this.jsonFilePath = './players.json';
        this.initializePlayerManagement();
    }

    async initializePlayerManagement() {
        await this.loadPlayers();
        this.setupEventListeners();
        this.renderPlayersTable();
    }

    setupEventListeners() {
        // Modal controls
        const playerManagementBtn = document.getElementById('playerManagementBtn');
        const playerModal = document.getElementById('playerModal');
        const playerModalClose = document.getElementById('playerModalClose');
        const cancelPlayerBtn = document.getElementById('cancelPlayerBtn');
        const overlay = document.getElementById('overlay');

        // Open modal
        playerManagementBtn?.addEventListener('click', () => {
            this.openModal();
        });

        // Close modal
        [playerModalClose, cancelPlayerBtn, overlay].forEach(element => {
            element?.addEventListener('click', () => {
                this.closeModal();
            });
        });

        // Form submission
        const savePlayerBtn = document.getElementById('savePlayerBtn');
        const playerForm = document.getElementById('playerForm');
        
        // Prevent form submission
        playerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Form submit prevented');
            this.savePlayer();
        });
        
        savePlayerBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🔥 SAVE BUTTON CLICKED - Starting debug');
            console.log('🔥 Event object:', e);
            console.log('🔥 Button element:', savePlayerBtn);
            console.log('🔥 About to call savePlayer method');
            this.savePlayer();
            console.log('🔥 savePlayer method called');
        });

        // Search and filter
        const playerSearch = document.getElementById('playerSearch');
        const squadFilter = document.getElementById('squadFilter');
        
        playerSearch?.addEventListener('input', () => {
            this.renderPlayersTable();
        });
        
        squadFilter?.addEventListener('change', () => {
            this.renderPlayersTable();
        });

        // Player pool filter events
        const poolSquadFilter = document.getElementById('playerSquadFilter');
        const poolNameFilter = document.getElementById('playerNameFilter');
        const poolPositionFilter = document.getElementById('playerPositionFilter');
        
        if (poolSquadFilter) {
            poolSquadFilter.addEventListener('change', () => {
                if (window.teamManager) {
                    window.teamManager.renderPlayerPool();
                }
            });
        }
        
        if (poolNameFilter) {
            poolNameFilter.addEventListener('input', () => {
                if (window.teamManager) {
                    window.teamManager.renderPlayerPool();
                }
            });
        }
        
        if (poolPositionFilter) {
            poolPositionFilter.addEventListener('change', () => {
                if (window.teamManager) {
                    window.teamManager.renderPlayerPool();
                }
            });
        }

        // Team display mode change
        const teamDisplayMode = document.getElementById('teamDisplayMode');
        if (teamDisplayMode) {
            teamDisplayMode.addEventListener('change', () => {
                if (window.teamManager) {
                    window.teamManager.renderPlayerPool();
                }
            });
        }
    }

    openModal() {
        const modal = document.getElementById('playerModal');
        const overlay = document.getElementById('overlay');
        
        modal.style.display = 'block';
        overlay.style.display = 'block';
        
        // No need to switch tabs since we only have the add form now
        this.resetForm();
    }

    closeModal() {
        const modal = document.getElementById('playerModal');
        const overlay = document.getElementById('overlay');
        
        modal.style.display = 'none';
        overlay.style.display = 'none';
        
        this.resetForm();
    }

    renderPlayersTable() {
        // This method is no longer needed since we removed the list tab
        // Keeping it for potential future use but making it empty
        return;
    }

    showCustomAlert(message, type = 'error') {
        // Remove existing custom alerts
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Don't create any notification div - just log the message
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Return early without creating any visual notification
        return;
    }

    savePlayer() {
        console.log('🚀 SAVE PLAYER METHOD STARTED');
        console.log('🚀 Current timestamp:', new Date().toISOString());
        
        // IMMEDIATE RETURN TEST - Let's see if this method is being called multiple times
        if (this._savingInProgress) {
            console.log('⚠️ SAVE ALREADY IN PROGRESS - BLOCKING DUPLICATE CALL');
            return;
        }
        this._savingInProgress = true;
        
        const form = document.getElementById('playerForm');
        console.log('🚀 Form element found:', !!form);
        
        // Get values directly from form elements
        const nameInput = document.getElementById('playerName');
        const positionSelect = document.getElementById('playerPosition');
        const squadSelect = document.getElementById('playerSquad');
        const wildcardSelect = document.getElementById('playerWildcard');

        console.log('🚀 Form elements check:', {
            nameInput: !!nameInput,
            positionSelect: !!positionSelect,
            squadSelect: !!squadSelect,
            wildcardSelect: !!wildcardSelect
        });

        // Check if elements exist
        if (!nameInput || !positionSelect || !squadSelect || !wildcardSelect) {
            console.error('❌ Form elements not found:', {
                nameInput: !!nameInput,
                positionSelect: !!positionSelect,
                squadSelect: !!squadSelect,
                wildcardSelect: !!wildcardSelect
            });
            this.showCustomAlert('Errore nel form: elementi mancanti', 'error');
            return;
        }

        // Get values with proper trimming and validation
        const name = nameInput.value?.trim() || '';
        const position = positionSelect.value?.trim() || '';
        const squad = squadSelect.value?.trim() || '';
        const wildcard = wildcardSelect.value?.trim() || 'NO';

        // Debug: log the actual values with more detail
        console.log('=== FORM DEBUG START ===');
        console.log('Form elements found:', {
            nameInput: !!nameInput,
            positionSelect: !!positionSelect,
            squadSelect: !!squadSelect,
            wildcardSelect: !!wildcardSelect
        });
        console.log('Raw form values:', {
            name: nameInput?.value,
            position: positionSelect?.value,
            squad: squadSelect?.value,
            wildcard: wildcardSelect?.value
        });
        console.log('Processed form values:', {
            name: name,
            position: position,
            squad: squad,
            wildcard: wildcard
        });
        console.log('Value lengths:', {
            nameLength: name.length,
            positionLength: position.length,
            squadLength: squad.length,
            wildcardLength: wildcard.length
        });
        console.log('=== FORM DEBUG END ===');

        // Enhanced validation with specific error messages - SIMPLIFIED
        const errors = [];
        
        console.log('=== VALIDATION CHECK ===');
        console.log('Name check:', name, 'Length:', name.length, 'Empty?', !name);
        console.log('Position check:', position, 'Length:', position.length, 'Empty?', !position);
        console.log('Squad check:', squad, 'Length:', squad.length, 'Empty?', !squad);
        
        if (!name) {
            console.log('❌ Name validation failed');
            errors.push('Il nome del giocatore è obbligatorio');
        } else {
            console.log('✅ Name validation passed');
        }
        
        if (!position) {
            console.log('❌ Position validation failed');
            errors.push('La posizione è obbligatoria');
        } else {
            console.log('✅ Position validation passed');
        }
        
        if (!squad) {
            console.log('❌ Squad validation failed');
            errors.push('La squadra è obbligatoria');
        } else {
            console.log('✅ Squad validation passed');
        }
        
        console.log('Total errors:', errors.length);
        console.log('=== VALIDATION END ===');

        // Show custom alert only if there are actual validation errors
        if (errors.length > 0) {
            console.log('❌ VALIDATION FAILED - Showing error notification');
            console.log('Validation errors found:', errors);
            this.showCustomAlert(errors.join('<br>'), 'error');
            // Reset the saving flag on error
            this._savingInProgress = false;
            return;
        }

        const playerData = {
            name: name,
            position: position,
            squad: squad,
            wildcard: wildcard
        };

        console.log('Validation passed, proceeding to save player:', playerData);

        if (this.currentEditingId) {
            // Update existing player
            const playerIndex = this.players.findIndex(p => p.id === this.currentEditingId);
            if (playerIndex !== -1) {
                this.players[playerIndex] = {
                    ...this.players[playerIndex],
                    ...playerData,
                    updated_at: new Date().toISOString()
                };
            }
        } else {
            // Add new player
            const newPlayer = {
                id: this.generateId(),
                ...playerData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.players.push(newPlayer);
        }

        this.savePlayers();
        this.renderPlayersTable();
        
        // Update player pool to show new/updated player
        if (window.teamManager) {
            window.teamManager.renderPlayerPool();
        }
        
        // Show success notification BEFORE closing modal and resetting form
        this.showCustomAlert(
            this.currentEditingId ? 'Giocatore aggiornato con successo!' : 'Giocatore aggiunto con successo!',
            'success'
        );
        
        // Reset form and close modal after showing notification
        this.resetForm();
        this.closeModal();
        
        // Reset the saving flag
        this._savingInProgress = false;
        console.log('✅ SAVE COMPLETED - Flag reset');
    }

    editPlayer(playerId) {
        // Since we removed the list functionality, we'll just open the modal
        // and populate the form for editing
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        this.currentEditingId = playerId;
        
        // Populate form
        document.getElementById('playerName').value = player.name;
        document.getElementById('playerPosition').value = player.position;
        document.getElementById('playerSquad').value = player.squad;
        document.getElementById('playerWildcard').value = player.wildcard || 'NO';
        document.getElementById('editingPlayerId').value = playerId;

        // Open modal for editing
        this.openModal();
    }

    // Confirmation Modal System
    showConfirmation(title, message, onConfirm, onCancel = null) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmationModal');
            const overlay = document.getElementById('overlay');
            const titleElement = document.getElementById('confirmationTitle');
            const messageElement = document.getElementById('confirmationMessage');
            const confirmBtn = document.getElementById('confirmationConfirm');
            const cancelBtn = document.getElementById('confirmationCancel');
            const closeBtn = document.getElementById('confirmationModalClose');

            // Set content
            titleElement.textContent = title;
            messageElement.textContent = message;

            // Show modal
            modal.classList.add('active');
            overlay.classList.add('active');

            // Handle confirm
            const handleConfirm = () => {
                modal.classList.remove('active');
                overlay.classList.remove('active');
                cleanup();
                if (onConfirm) onConfirm();
                resolve(true);
            };

            // Handle cancel
            const handleCancel = () => {
                modal.classList.remove('active');
                overlay.classList.remove('active');
                cleanup();
                if (onCancel) onCancel();
                resolve(false);
            };

            // Cleanup function
            const cleanup = () => {
                confirmBtn.removeEventListener('click', handleConfirm);
                cancelBtn.removeEventListener('click', handleCancel);
                closeBtn.removeEventListener('click', handleCancel);
                overlay.removeEventListener('click', handleCancel);
            };

            // Add event listeners
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            closeBtn.addEventListener('click', handleCancel);
            overlay.addEventListener('click', handleCancel);
        });
    }

    deletePlayer(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return;

        this.showConfirmation(
            'Elimina Giocatore',
            `Sei sicuro di voler eliminare il giocatore "${player.name}"? Questa azione non può essere annullata.`,
            () => {
                // Confirm action - delete the player
                this.players = this.players.filter(p => p.id !== playerId);
                this.savePlayers();
                this.renderPlayersTable();
                
                // Remove player from field if present
                const fieldCard = document.querySelector(`#footballField [data-player-id="${playerId}"]`);
                if (fieldCard) {
                    fieldCard.remove();
                }
                
                // Update player pool to remove deleted player
                if (window.teamManager) {
                    window.teamManager.renderPlayerPool();
                }
                
                // Show success message
                this.showNotification('Giocatore eliminato con successo!', 'success');
            },
            () => {
                // Cancel action - do nothing
                console.log('Eliminazione annullata dall\'utente');
            }
        );
    }

    // Notification system for better user feedback
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to document
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    resetForm() {
        const form = document.getElementById('playerForm');
        form?.reset();
        this.currentEditingId = null;
        document.getElementById('editingPlayerId').value = '';
    }

    generateId() {
        return 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    async loadPlayers() {
        try {
            const response = await fetch(this.jsonFilePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.players = data.players || [];
            console.log('Giocatori caricati dal file JSON:', this.players.length);
        } catch (error) {
            console.error('Errore nel caricamento giocatori dal JSON:', error);
            // Fallback to localStorage if JSON file is not available
            try {
                const saved = localStorage.getItem('footballPlayers');
                this.players = saved ? JSON.parse(saved) : [];
                console.log('Fallback: giocatori caricati da localStorage:', this.players.length);
            } catch (localError) {
                console.error('Errore anche nel fallback localStorage:', localError);
                this.players = [];
            }
        }
    }

    async savePlayers() {
        try {
            // Since we can't directly write to JSON file from browser,
            // we'll use localStorage as primary storage and provide export functionality
            localStorage.setItem('footballPlayers', JSON.stringify(this.players));
            
            // Update metadata
            const playerData = {
                players: this.players,
                metadata: {
                    version: "1.0",
                    last_updated: new Date().toISOString(),
                    total_players: this.players.length,
                    squads: [...new Set(this.players.map(p => p.squad))].sort()
                }
            };
            
            // Store the complete data structure for export
            localStorage.setItem('footballPlayersJSON', JSON.stringify(playerData, null, 2));
            
            console.log('Giocatori salvati in localStorage');
        } catch (error) {
            console.error('Errore nel salvataggio giocatori:', error);
        }
    }

    // Public method to get players for field integration
    getPlayers() {
        return this.players;
    }

    getPlayersBySquad(squad) {
        return this.players.filter(player => player.squad === squad);
    }
}

// Initialize the team manager and player manager when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize PlayerManager first to ensure it's available
    window.playerManager = new PlayerManager();
    // Wait for players to load before initializing TeamManager
    await window.playerManager.initializePlayerManagement();
    // Then initialize TeamManager which depends on PlayerManager
    window.teamManager = new TeamManager();
});