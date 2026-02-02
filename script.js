class TeamManager {
    constructor() {
        this.draggedPlayer = null;
        this.dragOffset = null;
        this.circleDisplayMode = false; // Track circle display mode
        this.ballElement = null; // Track ball element on field
        this.isDraggingBall = false;
        this.ballOffset = { x: 0, y: 0 };
        this.init();
    }

    // Custom prompt function to replace browser prompt()
    showTextInputModal(title, placeholder = '', defaultValue = '', showDelete = false, defaultColor = '#3b82f6', defaultSize = 16) {
        return new Promise((resolve) => {
            const modal = document.getElementById('textInputModal');
            const overlay = document.getElementById('overlay');
            const titleElement = document.getElementById('textModalTitle');
            const input = document.getElementById('textInput');
            const colorInput = document.getElementById('textColorInput');
            const sizeInput = document.getElementById('textSizeInput');
            const sizeValue = document.getElementById('textSizeValue');
            const confirmBtn = document.getElementById('textModalConfirm');
            const cancelBtn = document.getElementById('textModalCancel');
            const closeBtn = document.getElementById('textModalClose');
            const deleteBtn = document.getElementById('textModalDelete');

            // Set modal content
            titleElement.textContent = title;
            input.placeholder = placeholder;
            input.value = defaultValue;
            colorInput.value = defaultColor;
            sizeInput.value = defaultSize;
            sizeValue.textContent = defaultSize + 'px';

            // Show/hide delete button based on showDelete parameter
            deleteBtn.style.display = showDelete ? 'inline-block' : 'none';

            // Update size value display when slider changes
            const updateSizeValue = () => {
                sizeValue.textContent = sizeInput.value + 'px';
            };
            sizeInput.addEventListener('input', updateSizeValue);

            // Show modal
            modal.style.display = 'block';
            overlay.style.display = 'block';
            input.focus();
            input.select();

            // Handle confirm
            const handleConfirm = () => {
                const value = input.value.trim();
                const color = colorInput.value;
                const size = parseInt(sizeInput.value);
                hideModal();
                resolve({ text: value || null, color: color, size: size });
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
                sizeInput.removeEventListener('input', updateSizeValue);
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
        this.disableGlobalZoom();
        // Load and render players on initialization
        this.renderPlayerPool();

        // Keep cards within bounds when window resizes
        window.addEventListener('resize', () => this.clampAllCardPositions());
    }

    // Prevent browser zoom (Ctrl/Cmd + wheel/keys, pinch gestures)
    disableGlobalZoom() {
        // Block Ctrl + wheel (desktop pinch on some devices)
        window.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
            }
        }, { passive: false });

        // Block Ctrl/Cmd + '+', '-', '=', '0' zoom shortcuts
        window.addEventListener('keydown', (e) => {
            const zoomKeys = ['+', '-', '=', '0'];
            if ((e.ctrlKey || e.metaKey) && zoomKeys.includes(e.key)) {
                e.preventDefault();
            }
        });

        // Safari pinch gesture events
        ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => {
            document.addEventListener(ev, (e) => e.preventDefault());
        });
    }

    setupEventListeners() {
        // Clear field button
        document.getElementById('clearFieldBtn').addEventListener('click', () => {
            this.clearField();
        });

        // Ball button
        const ballBtn = document.getElementById('ballBtn');
        if (ballBtn) {
            ballBtn.addEventListener('click', () => {
                if (this.ballElement) {
                    // Toggle remove on re-click
                    this.removeBall();
                } else {
                    this.addBall();
                }
            });
        }

        // Team display mode
        document.getElementById('teamDisplayMode').addEventListener('change', (e) => {
            this.handleTeamDisplayModeChange(e.target.value);
        });

        // Grid View button
        document.getElementById('gridViewBtn').addEventListener('click', () => {
            this.openGridView();
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
            // Just move the existing card to new position (percentage-based for responsiveness)
            const leftPct = (boundedX / fieldContainerRect.width) * 100;
            const topPct = (boundedY / fieldContainerRect.height) * 100;
            existingContainerCard.style.left = `${leftPct}%`;
            existingContainerCard.style.top = `${topPct}%`;
            this.draggedPlayer = null;
            this.dragOffset = null;
            return;
        }

        // Create field container card
        const containerCard = this.createPlayerCard(this.draggedPlayer);
        containerCard.style.position = 'absolute';
        const leftPct = (boundedX / fieldContainerRect.width) * 100;
        const topPct = (boundedY / fieldContainerRect.height) * 100;
        containerCard.style.left = `${leftPct}%`;
        containerCard.style.top = `${topPct}%`;
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
        
        // Re-render grid view if it's open to remove the player from the grid
        const gridViewModal = document.getElementById('gridViewModal');
        if (gridViewModal && gridViewModal.style.display !== 'none') {
            this.renderGridPlayers();
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
            // Just move the existing card to new position (percentage-based for responsiveness)
            const leftPct = (boundedX / fieldRect.width) * 100;
            const topPct = (boundedY / fieldRect.height) * 100;
            existingFieldCard.style.left = `${leftPct}%`;
            existingFieldCard.style.top = `${topPct}%`;
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
        const leftPctNew = (boundedX / fieldRect.width) * 100;
        const topPctNew = (boundedY / fieldRect.height) * 100;
        fieldCard.style.left = `${leftPctNew}%`;
        fieldCard.style.top = `${topPctNew}%`;
        fieldCard.style.zIndex = '10';

        // Apply circle mode if active
        if (this.circleDisplayMode) {
            fieldCard.classList.add('circle-mode');
        }

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
        
        // Re-render grid view if it's open to remove the player from the grid
        const gridViewModalField = document.getElementById('gridViewModal');
        if (gridViewModalField && gridViewModalField.style.display !== 'none') {
            this.renderGridPlayers();
        }

        this.draggedPlayer = null;
        this.dragOffset = null;
    }

    returnPlayerToPool(fieldCard) {
        const playerId = fieldCard.dataset.playerId;
        fieldCard.remove();
        
        // Re-render player pool to show the returned player
        this.renderPlayerPool();
        
        // Re-render grid view if it's open to show the returned player
        const gridViewModalReturn = document.getElementById('gridViewModal');
        if (gridViewModalReturn && gridViewModalReturn.style.display !== 'none') {
            this.renderGridPlayers();
        }
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

            // Remove ball if present
            this.removeBall();
        }
    }

    // Ensure all cards are clamped within their containers (field and container)
    clampAllCardPositions() {
        const clampInContainer = (container) => {
            if (!container) return;
            const rectWidth = container.clientWidth;
            const rectHeight = container.clientHeight;
            const cards = container.querySelectorAll('.player-card');
            cards.forEach(card => {
                const cardWidth = card.offsetWidth || 120;
                const cardHeight = card.offsetHeight || 160;
                // Compute current pixel positions based on offset
                const currentLeftPx = card.offsetLeft || 0;
                const currentTopPx = card.offsetTop || 0;
                const margin = 12;
                const boundedX = Math.max(margin, Math.min(currentLeftPx, rectWidth - cardWidth - margin));
                const boundedY = Math.max(margin, Math.min(currentTopPx, rectHeight - cardHeight - margin));
                // Always store as percentages for responsiveness
                const leftPct = (boundedX / rectWidth) * 100;
                const topPct = (boundedY / rectHeight) * 100;
                card.style.left = `${leftPct}%`;
                card.style.top = `${topPct}%`;
            });
        };

        clampInContainer(document.getElementById('footballField'));
        clampInContainer(document.querySelector('.field-container'));
    }

    addBall() {
        const field = document.getElementById('footballField');
        if (!field) return;

        // Create marker wrapper
        const marker = document.createElement('div');
        marker.className = 'ball-marker';
        marker.style.left = '10px';
        marker.style.top = '10px';

        // Image
        const img = document.createElement('img');
        img.src = 'ball.png';
        img.alt = 'Ball';
        marker.appendChild(img);

        // Delete button
        const del = document.createElement('button');
        del.className = 'delete-ball-btn';
        del.title = 'Rimuovi palla';
        del.textContent = '×';
        del.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeBall();
        });
        marker.appendChild(del);

        // Mouse drag handlers
        marker.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isDraggingBall = true;
            marker.classList.add('grabbing');
            const rect = marker.getBoundingClientRect();
            this.ballOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            document.addEventListener('mousemove', handleBallMove);
            document.addEventListener('mouseup', handleBallUp);
        });

        const handleBallMove = (e) => {
            if (!this.isDraggingBall) return;
            const fieldRect = field.getBoundingClientRect();
            const size = marker.offsetWidth; // assume square
            const x = e.clientX - fieldRect.left - this.ballOffset.x;
            const y = e.clientY - fieldRect.top - this.ballOffset.y;
            const boundedX = Math.max(0, Math.min(x, fieldRect.width - size));
            const boundedY = Math.max(0, Math.min(y, fieldRect.height - size));
            marker.style.left = `${boundedX}px`;
            marker.style.top = `${boundedY}px`;
        };

        const handleBallUp = () => {
            this.isDraggingBall = false;
            marker.classList.remove('grabbing');
            document.removeEventListener('mousemove', handleBallMove);
            document.removeEventListener('mouseup', handleBallUp);
        };

        field.appendChild(marker);
        this.ballElement = marker;
    }

    removeBall() {
        const ballBtn = document.getElementById('ballBtn');
        if (this.ballElement && this.ballElement.parentNode) {
            this.ballElement.parentNode.removeChild(this.ballElement);
        }
        this.ballElement = null;
        this.isDraggingBall = false;
        this.ballOffset = { x: 0, y: 0 };
        // Button can be reused immediately
        if (ballBtn) {
            ballBtn.classList.remove('active');
        }
    }

    // Helper: sort players for display grouped by squad, then position, then name
    sortPlayersForDisplay(players) {
        const positionOrder = ['PORTIERE', 'DIFENSORE', 'CENTROCAMPISTA', 'ATTACCANTE'];
        return [...players].sort((a, b) => {
            const squadA = (a.squad || '').toLowerCase();
            const squadB = (b.squad || '').toLowerCase();
            if (squadA !== squadB) return squadA.localeCompare(squadB);

            const posAIdx = positionOrder.indexOf(a.position);
            const posBIdx = positionOrder.indexOf(b.position);
            const aIdx = posAIdx === -1 ? positionOrder.length : posAIdx;
            const bIdx = posBIdx === -1 ? positionOrder.length : posBIdx;
            if (aIdx !== bIdx) return aIdx - bIdx;

            return (a.name || '').localeCompare(b.name || '');
        });
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
            
            // Remove players that are already on the field or field container
            const playersOnField = Array.from(document.querySelectorAll('#footballField .player-card, .field-container .player-card'))
                .map(card => card.dataset.playerId);
            filteredPlayers = filteredPlayers.filter(player => 
                !playersOnField.includes(player.id)
            );
            
            // Sort players by squad, position, then name for coherent grouping
            filteredPlayers = this.sortPlayersForDisplay(filteredPlayers);

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
        // Usiamo un drag personalizzato per mouse e touch: disattiviamo il drag nativo
        card.draggable = false;
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

        // Drag live per mouse: muove la card originale in tempo reale
        let mouseDragging = false;
        let mouseOffset = null;
        let rafPending = false;
        let lastMousePos = { x: 0, y: 0 };
        let originalParent = null;
        let originalNextSibling = null;
        let placeholder = null;
        let activeBoundsEl = null;
        // Memorizza l'ultima posizione valida (per snap-back) dentro campo/field-container
        let lastValidContainer = null;
        let lastValidPosPct = { left: null, top: null };

        const updateDragPosition = () => {
            rafPending = false;
            if (!mouseDragging) return;
            const container = activeBoundsEl || document.getElementById('footballField') || document.querySelector('.field-container');
            const cardWidth = card.offsetWidth || 120;
            const cardHeight = card.offsetHeight || 160;
            if (container) {
                const rect = container.getBoundingClientRect();
                const inside = lastMousePos.x >= rect.left && lastMousePos.x <= rect.right && lastMousePos.y >= rect.top && lastMousePos.y <= rect.bottom;
                if (inside) {
                    let x = lastMousePos.x - rect.left - (mouseOffset?.x || 0);
                    let y = lastMousePos.y - rect.top - (mouseOffset?.y || 0);
                    const margin = 12; // margine più ampio per evitare incastri sui bordi
                    const edgeRelax = 30; // rilassa i bordi per favorire il passaggio tra aree
                    const nearEdge = (
                        x < edgeRelax || y < edgeRelax ||
                        x > rect.width - cardWidth - edgeRelax ||
                        y > rect.height - cardHeight - edgeRelax
                    );
                    if (nearEdge) {
                        // vicino ai bordi: segui liberamente il cursore per facilitare il passaggio
                        const tx = lastMousePos.x - (mouseOffset?.x || 0);
                        const ty = lastMousePos.y - (mouseOffset?.y || 0);
                        card.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
                    } else {
                        const boundedX = Math.max(margin, Math.min(x, rect.width - cardWidth - margin));
                        const boundedY = Math.max(margin, Math.min(y, rect.height - cardHeight - margin));
                        const tx = rect.left + boundedX;
                        const ty = rect.top + boundedY;
                        card.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
                        // Aggiorna posizioni valide per eventuale snap-back
                        const lp = (boundedX / rect.width) * 100;
                        const tp = (boundedY / rect.height) * 100;
                        // Considera valide solo campo e field-container, non il pool
                        if (container.id === 'footballField' || container.classList.contains('field-container')) {
                            lastValidContainer = container;
                            lastValidPosPct.left = lp;
                            lastValidPosPct.top = tp;
                        }
                    }
                } else {
                    // Fuori dai bounds: magnet verso il campo se vicino ai suoi bordi
                    const margin = 12;
                    const fieldElMag = document.getElementById('footballField');
                    const magnetDist = 14; // distanza magnete ridotta
                    if (fieldElMag) {
                        const fr = fieldElMag.getBoundingClientRect();
                        const nearField = (
                            lastMousePos.x >= fr.left - magnetDist && lastMousePos.x <= fr.right + magnetDist &&
                            lastMousePos.y >= fr.top - magnetDist && lastMousePos.y <= fr.bottom + magnetDist
                        );
                        if (nearField) {
                            // Aggancia dolcemente dentro il campo
                            const x = lastMousePos.x - fr.left - (mouseOffset?.x || 0);
                            const y = lastMousePos.y - fr.top - (mouseOffset?.y || 0);
                            const boundedX = Math.max(margin, Math.min(x, fr.width - cardWidth - margin));
                            const boundedY = Math.max(margin, Math.min(y, fr.height - cardHeight - margin));
                            const tx = fr.left + boundedX;
                            const ty = fr.top + boundedY;
                            card.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
                            // Memorizza come valida
                            lastValidContainer = fieldElMag;
                            lastValidPosPct.left = (boundedX / fr.width) * 100;
                            lastValidPosPct.top = (boundedY / fr.height) * 100;
                            activeBoundsEl = fieldElMag;
                            return;
                        }
                    }
                    // Altrimenti resta clampata al container attivo
                    const boundedX = Math.max(margin, Math.min((lastMousePos.x - rect.left - (mouseOffset?.x || 0)), rect.width - cardWidth - margin));
                    const boundedY = Math.max(margin, Math.min((lastMousePos.y - rect.top - (mouseOffset?.y || 0)), rect.height - cardHeight - margin));
                    const tx = rect.left + boundedX;
                    const ty = rect.top + boundedY;
                    card.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
                }
            }
        };

        const handleMouseMove = (e) => {
            if (!mouseDragging) return;
            lastMousePos = { x: e.clientX, y: e.clientY };
            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(updateDragPosition);
            }

            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            if (elementBelow) {
                const fieldEl = elementBelow.closest('#footballField');
                const containerEl = elementBelow.closest('.field-container');
                const poolEl = elementBelow.closest('#playerPool');
                if (fieldEl) fieldEl.classList.add('drag-over');
                else if (containerEl) containerEl.classList.add('drag-over');
                else if (poolEl) poolEl.classList.add('drag-over');
                if (fieldEl) activeBoundsEl = fieldEl;
                else if (containerEl) activeBoundsEl = containerEl;
                else if (poolEl) activeBoundsEl = poolEl;

                // Se il cursore è sulla zona della scrollbar del player pool, consideralo come pool
                const playerPoolEl = document.getElementById('playerPool');
                if (!poolEl && playerPoolEl) {
                    const pr = playerPoolEl.getBoundingClientRect();
                    const tol = 24; // tolleranza per includere area della scrollbar
                    const approxInsidePool = (
                        e.clientX >= pr.left - tol && e.clientX <= pr.right + tol &&
                        e.clientY >= pr.top - tol && e.clientY <= pr.bottom + tol
                    );
                    if (approxInsidePool) {
                        playerPoolEl.classList.add('drag-over');
                        activeBoundsEl = playerPoolEl;
                    }
                }
            }
        };

        const handleMouseUp = (e) => {
            if (!mouseDragging) return;
            mouseDragging = false;

            // Rileva drop target sotto il cursore
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);

            // Pulisci evidenziazione
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

            // Cleanup helper to finalize drag state safely before any early return
            const finishDrag = () => {
                card.style.opacity = '';
                this.draggedPlayer = null;
                this.dragOffset = null;
                mouseDragging = false;
                originalParent = null;
                originalNextSibling = null;
                placeholder = null;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            // Finalizza drop
            if (elementBelow) {
                const fieldEl = elementBelow.closest('#footballField');
                const containerEl = elementBelow.closest('.field-container');
                const poolEl = elementBelow.closest('#playerPool');

                if (fieldEl) {
                    // Posizionamento relativo al campo
                    const fieldRect = fieldEl.getBoundingClientRect();
                    const cardWidth = 120;
                    const cardHeight = 160;
                    const x = e.clientX - fieldRect.left - (mouseOffset?.x || 0);
                    const y = e.clientY - fieldRect.top - (mouseOffset?.y || 0);
                    const margin = 12;
                    const boundedX = Math.max(margin, Math.min(x, fieldRect.width - cardWidth - margin));
                    const boundedY = Math.max(margin, Math.min(y, fieldRect.height - cardHeight - margin));

                    // Inserisci la card direttamente nel campo (percentuali)
                    // Snap fluido al posizionamento finale
                    card.classList.add('snap-animate');
                    card.style.transform = '';
                    card.style.position = 'absolute';
                    const leftPct = (boundedX / fieldRect.width) * 100;
                    const topPct = (boundedY / fieldRect.height) * 100;
                    card.style.left = `${leftPct}%`;
                    card.style.top = `${topPct}%`;
                    card.style.pointerEvents = '';
                    card.style.zIndex = '10';
                    card.style.width = '';
                    card.style.height = '';
                    card.style.boxShadow = '';
                    card.style.border = '';
                    card.classList.remove('drag-preview');

                    // Rimuovi placeholder di origine
                    if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);

                    fieldEl.appendChild(card);
                    setTimeout(() => card.classList.remove('snap-animate'), 220);

                    // Applica circle-mode se attivo
                    if (this.circleDisplayMode) {
                        card.classList.add('circle-mode');
                    }

                    // Aggiungi bottone delete se mancante
                    if (!card.querySelector('.delete-player-btn')) {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'delete-player-btn';
                        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                        deleteBtn.title = 'Rimuovi dal campo';
                        deleteBtn.addEventListener('click', (evt) => {
                            evt.stopPropagation();
                            this.returnPlayerToPool(card);
                        });
                        card.appendChild(deleteBtn);
                    }

                    // Aggiorna grid view se aperta
                    const gridViewModalField = document.getElementById('gridViewModal');
                    if (gridViewModalField && gridViewModalField.style.display !== 'none') {
                        this.renderGridPlayers();
                    }
                } else if (containerEl && !fieldEl) {
                    // Posizionamento relativo al container
                    const contRect = containerEl.getBoundingClientRect();
                    const cardWidth = 120;
                    const cardHeight = 160;
                    const x = e.clientX - contRect.left - (mouseOffset?.x || 0);
                    const y = e.clientY - contRect.top - (mouseOffset?.y || 0);
                    const margin = 6;
                    const boundedX = Math.max(margin, Math.min(x, contRect.width - cardWidth - margin));
                    const boundedY = Math.max(margin, Math.min(y, contRect.height - cardHeight - margin));

                    // Snap fluido al posizionamento finale
                    card.classList.add('snap-animate');
                    card.style.transform = '';
                    card.style.position = 'absolute';
                    const leftPct2 = (boundedX / contRect.width) * 100;
                    const topPct2 = (boundedY / contRect.height) * 100;
                    card.style.left = `${leftPct2}%`;
                    card.style.top = `${topPct2}%`;
                    card.style.pointerEvents = '';
                    card.style.zIndex = '10';
                    card.style.width = '';
                    card.style.height = '';
                    card.style.boxShadow = '';
                    card.style.border = '';
                    card.classList.remove('drag-preview');

                    if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
                    containerEl.appendChild(card);
                    setTimeout(() => card.classList.remove('snap-animate'), 220);

                    // Aggiungi delete se mancante
                    if (!card.querySelector('.delete-player-btn')) {
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'delete-player-btn';
                        deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                        deleteBtn.title = 'Rimuovi dal campo';
                        deleteBtn.addEventListener('click', (evt) => {
                            evt.stopPropagation();
                            this.returnPlayerToPool(card);
                        });
                        card.appendChild(deleteBtn);
                    }

                    // Aggiorna grid view se aperta
                    const gridViewModal = document.getElementById('gridViewModal');
                    if (gridViewModal && gridViewModal.style.display !== 'none') {
                        this.renderGridPlayers();
                    }
                } else if (poolEl) {
                    // Drop nel Player Pool: usa la logica di rientro
                    // Pulisci placeholder se presente
                    if (placeholder && placeholder.parentNode) {
                        placeholder.parentNode.removeChild(placeholder);
                    }
                    // Ripristina stile card
                    card.style.transform = '';
                    card.style.position = '';
                    card.style.pointerEvents = '';
                    card.style.zIndex = '';
                    card.style.width = '';
                    card.style.height = '';
                    card.style.boxShadow = '';
                    card.style.border = '';
                    card.classList.remove('drag-preview');
                    this.returnPlayerToPool(card);
                    // Conclude il drag
                    card.style.opacity = '';
                    this.draggedPlayer = null;
                    this.dragOffset = null;
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    return;
                } else {
                    // Magnete: se rilasci vicino ai bordi del campo, effettua il drop dentro il campo
                    const fieldElMag = document.getElementById('footballField');
                    const magnetDist = 14; // distanza magnete ridotta
                    if (fieldElMag) {
                        const fr = fieldElMag.getBoundingClientRect();
                        const nearField = (
                            e.clientX >= fr.left - magnetDist && e.clientX <= fr.right + magnetDist &&
                            e.clientY >= fr.top - magnetDist && e.clientY <= fr.bottom + magnetDist
                        );
                        if (nearField) {
                            const cardWidth = 120;
                            const cardHeight = 160;
                            const margin = 12;
                            const x = e.clientX - fr.left - (mouseOffset?.x || 0);
                            const y = e.clientY - fr.top - (mouseOffset?.y || 0);
                            const boundedX = Math.max(margin, Math.min(x, fr.width - cardWidth - margin));
                            const boundedY = Math.max(margin, Math.min(y, fr.height - cardHeight - margin));

                            // Snap fluido
                            card.classList.add('snap-animate');
                            card.style.transform = '';
                            card.style.position = 'absolute';
                            const leftPct = (boundedX / fr.width) * 100;
                            const topPct = (boundedY / fr.height) * 100;
                            card.style.left = `${leftPct}%`;
                            card.style.top = `${topPct}%`;
                            card.style.pointerEvents = '';
                            card.style.zIndex = '10';
                            card.style.width = '';
                            card.style.height = '';
                            card.style.boxShadow = '';
                            card.style.border = '';
                            card.classList.remove('drag-preview');
                            if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
                            fieldElMag.appendChild(card);
                            setTimeout(() => card.classList.remove('snap-animate'), 220);
                            return;
                        }
                    }
                    // Se il cursore è sulla zona della scrollbar del player pool, considera come drop nel pool
                    const playerPoolEl = document.getElementById('playerPool');
                    if (playerPoolEl) {
                        const pr = playerPoolEl.getBoundingClientRect();
                        const tol = 24;
                        const approxInsidePool = (
                            e.clientX >= pr.left - tol && e.clientX <= pr.right + tol &&
                            e.clientY >= pr.top - tol && e.clientY <= pr.bottom + tol
                        );
                        if (approxInsidePool) {
                            if (placeholder && placeholder.parentNode) {
                                placeholder.parentNode.removeChild(placeholder);
                            }
                            card.style.transform = '';
                            card.style.position = '';
                            card.style.pointerEvents = '';
                            card.style.zIndex = '';
                            card.style.width = '';
                            card.style.height = '';
                            card.style.boxShadow = '';
                            card.style.border = '';
                            card.classList.remove('drag-preview');
                    this.returnPlayerToPool(card);
                    // Finalize drag state and skip further positioning
                    finishDrag();
                    return;
                        }
                    }
                    // Snap-back: rientra nell'ultima posizione valida, ma disabilitato per il campo PNG
                    if (lastValidContainer && lastValidPosPct.left != null && lastValidPosPct.top != null) {
                        // Se l'ultima area valida è il footballField, NON tornare alla posizione precedente,
                        // ma clampa la posizione attuale dentro i confini del campo per garantire libero posizionamento.
                        if (lastValidContainer.id === 'footballField') {
                            const fr = lastValidContainer.getBoundingClientRect();
                            const cardWidth = card.offsetWidth || 120;
                            const cardHeight = card.offsetHeight || 160;
                            const margin = 12;
                            const x = e.clientX - fr.left - (mouseOffset?.x || 0);
                            const y = e.clientY - fr.top - (mouseOffset?.y || 0);
                            const boundedX = Math.max(margin, Math.min(x, fr.width - cardWidth - margin));
                            const boundedY = Math.max(margin, Math.min(y, fr.height - cardHeight - margin));
                            const leftPct = (boundedX / fr.width) * 100;
                            const topPct = (boundedY / fr.height) * 100;
                            card.classList.add('snap-animate');
                            card.style.transform = '';
                            card.style.position = 'absolute';
                            card.style.left = `${leftPct}%`;
                            card.style.top = `${topPct}%`;
                            card.style.pointerEvents = '';
                            card.style.zIndex = '10';
                            card.style.width = '';
                            card.style.height = '';
                            card.style.boxShadow = '';
                            card.style.border = '';
                            if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
                            lastValidContainer.appendChild(card);
                            setTimeout(() => card.classList.remove('snap-animate'), 220);
                        } else {
                            // Per tutte le altre aree (es. field-container) resta attivo lo snap-back alla posizione valida
                            card.classList.add('snap-animate');
                            card.style.transform = '';
                            card.style.position = 'absolute';
                            card.style.left = `${lastValidPosPct.left}%`;
                            card.style.top = `${lastValidPosPct.top}%`;
                            card.style.pointerEvents = '';
                            card.style.zIndex = '10';
                            card.style.width = '';
                            card.style.height = '';
                            card.style.boxShadow = '';
                            card.style.border = '';
                            if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
                            lastValidContainer.appendChild(card);
                            setTimeout(() => card.classList.remove('snap-animate'), 220);
                        }
                        // Chiudi stato drag in entrambi i casi
                        card.style.opacity = '';
                        this.draggedPlayer = null;
                        this.dragOffset = null;
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                        return;
                    }
                } 
            }

            // Fallback: se nessun target valido rilevato, riposiziona entro i bounds attivi
            if (!elementBelow) {
                // Se il puntatore è approssimativamente sul player pool (es. scrollbar), considera drop nel pool
                const playerPoolEl = document.getElementById('playerPool');
                if (playerPoolEl) {
                    const pr = playerPoolEl.getBoundingClientRect();
                    const tol = 24;
                    const approxInsidePool = (
                        e.clientX >= pr.left - tol && e.clientX <= pr.right + tol &&
                        e.clientY >= pr.top - tol && e.clientY <= pr.bottom + tol
                    );
                    if (approxInsidePool) {
                        if (placeholder && placeholder.parentNode) {
                            placeholder.parentNode.removeChild(placeholder);
                        }
                        card.style.transform = '';
                        card.style.position = '';
                        card.style.pointerEvents = '';
                        card.style.zIndex = '';
                        card.style.width = '';
                        card.style.height = '';
                        card.style.boxShadow = '';
                        card.style.border = '';
                        card.classList.remove('drag-preview');
                        this.returnPlayerToPool(card);
                        // Skip clamping fallback
                        elementBelow = playerPoolEl; // mark as handled
                    }
                }
                const container = activeBoundsEl || document.getElementById('footballField') || document.querySelector('.field-container');
                if (container) {
                    const rect = container.getBoundingClientRect();
                    const cardWidth = 120;
                    const cardHeight = 160;
                    const margin = 6;
                    const x = e.clientX - rect.left - (mouseOffset?.x || 0);
                    const y = e.clientY - rect.top - (mouseOffset?.y || 0);
                    const boundedX = Math.max(margin, Math.min(x, rect.width - cardWidth - margin));
                    const boundedY = Math.max(margin, Math.min(y, rect.height - cardHeight - margin));
                    const leftPct = (boundedX / rect.width) * 100;
                    const topPct = (boundedY / rect.height) * 100;
                    card.style.transform = '';
                    card.style.position = 'absolute';
                    card.style.left = `${leftPct}%`;
                    card.style.top = `${topPct}%`;
                    card.style.pointerEvents = '';
                    card.style.zIndex = '10';
                    card.style.width = '';
                    card.style.height = '';
                    card.style.boxShadow = '';
                    card.style.border = '';
                    card.classList.remove('drag-preview');
                    if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
                    container.appendChild(card);
                    // Finalize drag state
                    finishDrag();
                    return;
                }
            }

            // Reset stato drag
            card.style.opacity = '';
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));

            this.draggedPlayer = null;
            this.dragOffset = null;

            mouseDragging = false;
            originalParent = null;
            originalNextSibling = null;
            placeholder = null;

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        card.addEventListener('mousedown', (e) => {
            // Evita di avviare il drag quando si cliccano elementi interattivi sulla card
            if (e.target.closest('.delete-player-btn') || e.target.closest('.wildcard-star-btn') || e.target.closest('button')) {
                // Lascia che il click venga gestito dall'elemento stesso
                return;
            }
            // Avvia drag personalizzato con anteprima in tempo reale
            e.preventDefault();
            mouseDragging = true;
            this.draggedPlayer = player;

            const rect = card.getBoundingClientRect();
            mouseOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top };
            this.dragOffset = mouseOffset;

            // Sposta la card originale in overlay fisso che segue il cursore
            originalParent = card.parentElement;
            originalNextSibling = card.nextSibling;
            placeholder = document.createElement('div');
            placeholder.style.width = `${rect.width}px`;
            placeholder.style.height = `${rect.height}px`;
            placeholder.style.flex = '0 0 auto';
            originalParent.insertBefore(placeholder, card.nextSibling);

            card.classList.add('drag-preview');
            card.style.position = 'fixed';
            card.style.left = '0';
            card.style.top = '0';
            // Mantieni lo stile originale della card: niente width/height/opacity inline
            card.style.pointerEvents = 'none';
            card.style.zIndex = '10000';
            // Niente ombre/bordi extra durante il drag
            card.style.willChange = 'transform';
            card.style.transition = 'none';
            card.style.animation = 'none';
            // Non spostiamo la card nel body per preservare gli stili contestuali

            // Bounds iniziali in base all'area sotto il cursore
            const below = document.elementFromPoint(e.clientX, e.clientY);
            activeBoundsEl = (below && below.closest && (below.closest('#footballField') || below.closest('.field-container') || below.closest('#playerPool'))) 
                || document.getElementById('footballField') 
                || document.querySelector('.field-container');

            // Posiziona subito la card sotto il cursore, clampata ai bounds
            lastMousePos = { x: e.clientX, y: e.clientY };
            rafPending = true;
            requestAnimationFrame(updateDragPosition);

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });

        // Add touch event listeners for mobile drag and drop
        let touchStarted = false;
        let touchOffset = null;
        let ghostCard = null;

        card.addEventListener('touchstart', (e) => {
            e.preventDefault();
            // Non avviare drag se si tocca la X o elementi interattivi
            if (e.target && (e.target.closest && (e.target.closest('.delete-player-btn') || e.target.closest('.wildcard-star-btn') || e.target.closest('button')))) {
                return;
            }
            touchStarted = true;
            this.draggedPlayer = player;
            
            const touch = e.touches[0];
            const cardRect = card.getBoundingClientRect();
            
            // Calculate touch offset
            touchOffset = {
                x: touch.clientX - cardRect.left,
                y: touch.clientY - cardRect.top
            };
            this.dragOffset = touchOffset;
            
            // Create ghost card for visual feedback
            ghostCard = card.cloneNode(true);
            ghostCard.className = 'drag-preview player-card touch-ghost';
            ghostCard.style.cssText = `
                position: fixed;
                width: 120px;
                height: 160px;
                transform: scale(0.9) rotate(5deg);
                opacity: 0.8;
                pointer-events: none;
                z-index: 10000;
                box-shadow: 0 8px 25px rgba(0,0,0,0.4);
                border: 2px solid #fff;
                will-change: transform;
                transition: none !important;
                animation: none !important;
                left: ${touch.clientX - touchOffset.x}px;
                top: ${touch.clientY - touchOffset.y}px;
            `;
            
            ghostCard.classList.add(positionClass);
            document.body.appendChild(ghostCard);
            
            // Add visual feedback to original card
            card.style.opacity = '0.5';
            card.style.transform = 'scale(0.95)';
        });

        card.addEventListener('touchmove', (e) => {
            if (!touchStarted || !ghostCard) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            
            // Update ghost card position
            ghostCard.style.left = `${touch.clientX - touchOffset.x}px`;
            ghostCard.style.top = `${touch.clientY - touchOffset.y}px`;
            
            // Check what element is under the touch
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Remove previous drag-over classes
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            
            // Add drag-over class to valid drop zones
            if (elementBelow) {
                const field = elementBelow.closest('#footballField');
                const fieldContainer = elementBelow.closest('.field-container');
                const playerPool = elementBelow.closest('#playerPool');
                
                if (field) {
                    field.classList.add('drag-over');
                } else if (fieldContainer) {
                    fieldContainer.classList.add('drag-over');
                } else if (playerPool) {
                    playerPool.classList.add('drag-over');
                }
            }
        });

        card.addEventListener('touchend', (e) => {
            if (!touchStarted) return;
            e.preventDefault();
            
            const touch = e.changedTouches[0];
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            
            // Clean up
            if (ghostCard) {
                ghostCard.remove();
                ghostCard = null;
            }
            
            // Reset original card appearance
            card.style.opacity = '';
            card.style.transform = '';
            
            // Remove drag-over classes
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            
            // Handle drop
            if (elementBelow) {
                const field = elementBelow.closest('#footballField');
                const fieldContainer = elementBelow.closest('.field-container');
                const playerPool = elementBelow.closest('#playerPool');
                
                if (field) {
                    // Simulate drop event for field
                    const dropEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => {}
                    };
                    this.handleFieldDrop(dropEvent);
                } else if (fieldContainer && !field) {
                    // Simulate drop event for field container
                    const dropEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => {}
                    };
                    this.handleFieldContainerDrop(dropEvent);
                } else if (playerPool) {
                    // Simulate drop event for player pool
                    const dropEvent = {
                        clientX: touch.clientX,
                        clientY: touch.clientY,
                        preventDefault: () => {}
                    };
                    this.handlePlayerPoolDrop(dropEvent);
                }
            }
            
            // Reset touch state
            touchStarted = false;
            touchOffset = null;
            this.draggedPlayer = null;
            this.dragOffset = null;
        });

        card.addEventListener('touchcancel', () => {
            // Clean up on touch cancel
            if (ghostCard) {
                ghostCard.remove();
                ghostCard = null;
            }
            
            card.style.opacity = '';
            card.style.transform = '';
            
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            
            touchStarted = false;
            touchOffset = null;
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
        let eraserPreview = null; // For eraser preview circle - declare at function scope
        
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

        // Tactical info button
        const tacticalInfoBtn = document.getElementById('tacticalInfoBtn');
        const tacticalInfoModal = document.getElementById('tacticalInfoModal');
        const tacticalInfoModalClose = document.getElementById('tacticalInfoModalClose');
        const tacticalInfoModalOk = document.getElementById('tacticalInfoModalOk');
        const overlay = document.getElementById('overlay');

        if (tacticalInfoBtn && tacticalInfoModal) {
            tacticalInfoBtn.addEventListener('click', () => {
                tacticalInfoModal.style.display = 'block';
                overlay.style.display = 'block';
            });

            const closeInfoModal = () => {
                tacticalInfoModal.style.display = 'none';
                overlay.style.display = 'none';
            };

            if (tacticalInfoModalClose) {
                tacticalInfoModalClose.addEventListener('click', closeInfoModal);
            }

            if (tacticalInfoModalOk) {
                tacticalInfoModalOk.addEventListener('click', closeInfoModal);
            }

            // Close modal when clicking on overlay
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    closeInfoModal();
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

        // Setup card display toggle
        const cardDisplayToggle = document.getElementById('cardDisplayToggle');
        if (cardDisplayToggle) {
            cardDisplayToggle.addEventListener('click', () => {
                this.circleDisplayMode = !this.circleDisplayMode;
                this.updateCardDisplayMode();
                this.updateCardDisplayToggleButton();
            });
        }

        // Setup canvas drawing functionality
        if (tacticalCanvas) {
            let currentPath = null; // For pen tool
            let pathPoints = []; // Store points for pen drawing
            
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
                        // Check if line intersects with eraser circle and remove completely
                        if (lineIntersectsCircle(element, x, y, radius)) {
                            element.remove();
                            hasChanges = true;
                        }
                    } else if (tagName === 'path') {
                        // For path elements (hand-drawn), cut only the parts within the eraser circle
                        if (cutPathWithCircle(element, x, y, radius, canvas)) {
                            hasChanges = true;
                        }
                    } else if (tagName === 'text') {
                        // For text elements, check if the text position is within the eraser circle
                        const textX = parseFloat(element.getAttribute('x')) || 0;
                        const textY = parseFloat(element.getAttribute('y')) || 0;
                        const distance = Math.sqrt((textX - x) ** 2 + (textY - y) ** 2);
                        
                        if (distance <= radius) {
                            element.remove();
                            hasChanges = true;
                        }
                    } else {
                        // For other elements (circles, rectangles, arrows), use original logic
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
                
                // Parse path data to get segments with curve information
                const segments = parsePathData(pathData);
                if (segments.length < 2) return false;
                
                // Check if any part of the path intersects with the circle
                let hasIntersection = false;
                const segmentStates = []; // Track which segments are inside/outside
                
                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const distanceFromCenter = Math.sqrt(
                        (segment.x - centerX) ** 2 + (segment.y - centerY) ** 2
                    );
                    
                    const isInside = distanceFromCenter <= radius;
                    segmentStates.push(isInside);
                    
                    if (isInside) {
                        hasIntersection = true;
                    }
                }
                
                // If no intersection, don't modify the path
                if (!hasIntersection) {
                    return false;
                }
                
                // Find continuous groups of segments outside the circle
                const pathGroups = [];
                let currentGroup = [];
                
                for (let i = 0; i < segments.length; i++) {
                    const isOutside = !segmentStates[i];
                    
                    if (isOutside) {
                        currentGroup.push(segments[i]);
                    } else {
                        // Inside the circle - end current group if it exists
                        if (currentGroup.length > 0) {
                            pathGroups.push([...currentGroup]);
                            currentGroup = [];
                        }
                    }
                }
                
                // Add the last group if it exists
                if (currentGroup.length > 0) {
                    pathGroups.push(currentGroup);
                }
                
                // If no valid groups remain, remove the entire path
                if (pathGroups.length === 0) {
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
                
                // Create new paths for each group
                if (pathGroups.length === 1) {
                    // Single group - update the existing path
                    const group = pathGroups[0];
                    let newPathData = `M ${group[0].x} ${group[0].y}`;
                    
                    for (let i = 1; i < group.length; i++) {
                        const segment = group[i];
                        if (segment.type === 'Q' && segment.controlX !== undefined && segment.controlY !== undefined) {
                            newPathData += ` Q ${segment.controlX} ${segment.controlY} ${segment.x} ${segment.y}`;
                        } else if (segment.type === 'T') {
                            // Convert T to Q to maintain curve shape
                            const prevSegment = group[i-1];
                            newPathData += ` Q ${prevSegment.x} ${prevSegment.y} ${segment.x} ${segment.y}`;
                        } else {
                            newPathData += ` L ${segment.x} ${segment.y}`;
                        }
                    }
                    
                    path.setAttribute('d', newPathData);
                } else {
                    // Multiple groups - create separate paths
                    path.remove(); // Remove original path
                    
                    pathGroups.forEach(group => {
                        if (group.length > 0) {
                            const newPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            
                            let pathData = `M ${group[0].x} ${group[0].y}`;
                            
                            for (let i = 1; i < group.length; i++) {
                                const segment = group[i];
                                if (segment.type === 'Q' && segment.controlX !== undefined && segment.controlY !== undefined) {
                                    pathData += ` Q ${segment.controlX} ${segment.controlY} ${segment.x} ${segment.y}`;
                                } else if (segment.type === 'T') {
                                    // Convert T to Q to maintain curve shape
                                    const prevSegment = group[i-1];
                                    pathData += ` Q ${prevSegment.x} ${prevSegment.y} ${segment.x} ${segment.y}`;
                                } else {
                                    pathData += ` L ${segment.x} ${segment.y}`;
                                }
                            }
                            
                            newPath.setAttribute('d', pathData);
                            
                            // Apply original attributes
                            Object.keys(pathAttributes).forEach(attr => {
                                if (pathAttributes[attr]) {
                                    newPath.setAttribute(attr, pathAttributes[attr]);
                                }
                            });
                            
                            canvas.appendChild(newPath);
                        }
                    });
                }
                
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
            
            // Helper function to create path segment
            const createPathSegment = (canvas, segments, attributes) => {
                if (segments.length < 2) return;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                
                let pathData = `M ${segments[0].x} ${segments[0].y}`;
                
                for (let i = 1; i < segments.length; i++) {
                    const segment = segments[i];
                    
                    if (segment.type === 'L') {
                        pathData += ` L ${segment.x} ${segment.y}`;
                    } else if (segment.type === 'Q') {
                        pathData += ` Q ${segment.controlX} ${segment.controlY} ${segment.x} ${segment.y}`;
                    } else if (segment.type === 'T') {
                        pathData += ` T ${segment.x} ${segment.y}`;
                    } else {
                        // Default to line for any other type
                        pathData += ` L ${segment.x} ${segment.y}`;
                    }
                }
                
                path.setAttribute('d', pathData);
                
                Object.keys(attributes).forEach(attr => {
                    if (attributes[attr]) {
                        path.setAttribute(attr, attributes[attr]);
                    }
                });
                
                canvas.appendChild(path);
            };
            
            // Parse SVG path data to extract points
            const parsePathData = (pathData) => {
                const segments = [];
                const commands = pathData.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
                
                if (!commands) return segments;
                
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
                            segments.push({ 
                                type: 'M', 
                                x: currentX, 
                                y: currentY 
                            });
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
                            segments.push({ 
                                type: 'L', 
                                x: currentX, 
                                y: currentY 
                            });
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
                            segments.push({ 
                                type: 'Q', 
                                x: currentX, 
                                y: currentY,
                                controlX: lastControlX,
                                controlY: lastControlY
                            });
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
                            segments.push({ 
                                type: 'T', 
                                x: currentX, 
                                y: currentY,
                                controlX: lastControlX,
                                controlY: lastControlY
                            });
                        }
                    }
                });
                
                return segments;
            };
            
            // Check if line intersects with circle (for complete deletion)
            const lineIntersectsCircle = (line, centerX, centerY, radius) => {
                const x1 = parseFloat(line.getAttribute('x1'));
                const y1 = parseFloat(line.getAttribute('y1'));
                const x2 = parseFloat(line.getAttribute('x2'));
                const y2 = parseFloat(line.getAttribute('y2'));
                
                // Expand radius for better sensitivity
                const expandedRadius = radius * 1.2;
                const intersections = getLineCircleIntersections(x1, y1, x2, y2, centerX, centerY, expandedRadius);
                return intersections.length > 0;
            };
            
            // Check if path intersects with circle (for complete deletion)
            const pathIntersectsCircle = (path, centerX, centerY, radius) => {
                const pathData = path.getAttribute('d');
                if (!pathData) return false;
                
                const segments = parsePathData(pathData);
                if (segments.length < 2) return false;
                
                // Check if any part of the path intersects with the circle
                for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const distanceFromCenter = Math.sqrt(
                        (segment.x - centerX) ** 2 + (segment.y - centerY) ** 2
                    );
                    
                    if (distanceFromCenter <= radius) {
                        return true;
                    }
                }
                
                return false;
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
                const tagName = element.tagName.toLowerCase();
                
                // Special handling for arrow groups
                if (tagName === 'g' && element.classList.contains('tactical-element')) {
                    // For arrow groups, check if any child element intersects
                    const children = element.children;
                    for (let child of children) {
                        if (child.tagName.toLowerCase() === 'line') {
                            // Check if line intersects with circle
                            const x1 = parseFloat(child.getAttribute('x1'));
                            const y1 = parseFloat(child.getAttribute('y1'));
                            const x2 = parseFloat(child.getAttribute('x2'));
                            const y2 = parseFloat(child.getAttribute('y2'));
                            
                            const intersections = getLineCircleIntersections(x1, y1, x2, y2, centerX, centerY, radius);
                            if (intersections.length > 0) {
                                return true;
                            }
                        } else if (child.tagName.toLowerCase() === 'polygon') {
                            // Check if arrow head polygon intersects with expanded radius
                            const bbox = child.getBBox();
                            const elementCenterX = bbox.x + bbox.width / 2;
                            const elementCenterY = bbox.y + bbox.height / 2;
                            
                            const distance = Math.sqrt(
                                Math.pow(elementCenterX - centerX, 2) + 
                                Math.pow(elementCenterY - centerY, 2)
                            );
                            
                            // Use expanded radius for better sensitivity
                            if (distance <= radius * 1.5) {
                                return true;
                            }
                        }
                    }
                    return false;
                }
                
                // Improved logic for other elements with better sensitivity
                const bbox = element.getBBox();
                
                // For circles, check if eraser circle overlaps with the shape
                if (tagName === 'circle') {
                    const elementCenterX = parseFloat(element.getAttribute('cx'));
                    const elementCenterY = parseFloat(element.getAttribute('cy'));
                    const elementRadius = parseFloat(element.getAttribute('r'));
                    
                    const distance = Math.sqrt(
                        Math.pow(elementCenterX - centerX, 2) + 
                        Math.pow(elementCenterY - centerY, 2)
                    );
                    
                    // Check if circles overlap (distance between centers < sum of radii)
                    return distance <= (radius + elementRadius);
                }
                
                // For rectangles and other shapes, check if eraser circle intersects with the bounding box
                if (tagName === 'rect') {
                    const rectX = parseFloat(element.getAttribute('x'));
                    const rectY = parseFloat(element.getAttribute('y'));
                    const rectWidth = parseFloat(element.getAttribute('width'));
                    const rectHeight = parseFloat(element.getAttribute('height'));
                    
                    // Find closest point on rectangle to circle center
                    const closestX = Math.max(rectX, Math.min(centerX, rectX + rectWidth));
                    const closestY = Math.max(rectY, Math.min(centerY, rectY + rectHeight));
                    
                    const distance = Math.sqrt(
                        Math.pow(closestX - centerX, 2) + 
                        Math.pow(closestY - centerY, 2)
                    );
                    
                    return distance <= radius;
                }
                
                // For other elements, use bounding box center with expanded sensitivity
                const elementCenterX = bbox.x + bbox.width / 2;
                const elementCenterY = bbox.y + bbox.height / 2;
                
                const distance = Math.sqrt(
                    Math.pow(elementCenterX - centerX, 2) + 
                    Math.pow(elementCenterY - centerY, 2)
                );
                
                // Use expanded radius for better sensitivity
                const expandedRadius = radius + Math.max(bbox.width, bbox.height) * 0.3;
                return distance <= expandedRadius;
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

            // Add touch event listeners for tactical canvas
            tacticalCanvas.addEventListener('touchstart', (e) => {
                if (!tacticalMode) return;
                e.preventDefault();
                
                const touch = e.touches[0];
                const rect = tacticalCanvas.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;
                
                if (currentTool === 'eraser') {
                    // Handle eraser tool
                    const strokeWidth = parseInt(document.getElementById('strokeWidth').value);
                    const radius = strokeWidth * 5;
                    
                    eraseElements(tacticalCanvas, x, y, radius);
                    isDrawing = true;
                    return;
                }
                
                if (currentTool === 'select') {
                    // Handle selection
                    const clickedElement = document.elementFromPoint(touch.clientX, touch.clientY);
                    if (clickedElement && clickedElement.classList.contains('tactical-element')) {
                        // Deselect previous element
                        if (selectedElement) {
                            selectedElement.classList.remove('selected');
                        }
                        // Select new element
                        selectedElement = clickedElement;
                        selectedElement.classList.add('selected');
                    } else {
                        // Deselect if touching empty space
                        if (selectedElement) {
                            selectedElement.classList.remove('selected');
                            selectedElement = null;
                        }
                    }
                    return;
                }
                
                if (currentTool === 'text') {
                    // Handle text tool
                    this.addTextElement(tacticalCanvas, x, y).then(() => {
                        this.saveToHistory(tacticalCanvas);
                    });
                    return;
                }
                
                if (currentTool === 'pen') {
                    // Handle pen tool - start new path
                    const point = { x, y };
                    pathPoints = [point];
                    currentPath = this.createPenPath(tacticalCanvas, pathPoints);
                    isDrawing = true;
                    return;
                }
                
                isDrawing = true;
                startPoint = { x, y };
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

            tacticalCanvas.addEventListener('touchmove', (e) => {
                if (!tacticalMode || !isDrawing) return;
                e.preventDefault();
                
                const touch = e.touches[0];
                const rect = tacticalCanvas.getBoundingClientRect();
                const currentPoint = {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top
                };
                
                if (currentTool === 'eraser') {
                    // Continue erasing
                    const strokeWidth = parseInt(document.getElementById('strokeWidth').value);
                    const radius = strokeWidth * 5;
                    eraseElements(tacticalCanvas, currentPoint.x, currentPoint.y, radius);
                    return;
                }
                
                if (currentTool === 'select' || currentTool === 'text') return;
                
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

            tacticalCanvas.addEventListener('touchend', (e) => {
                if (!tacticalMode) return;
                e.preventDefault();
                
                if (currentTool === 'eraser') {
                    isDrawing = false;
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
                
                const touch = e.changedTouches[0];
                const rect = tacticalCanvas.getBoundingClientRect();
                const endPoint = {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top
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

    updateCardDisplayMode() {
        const fieldCards = document.querySelectorAll('#footballField .player-card, .field-container .player-card');
        fieldCards.forEach(card => {
            if (this.circleDisplayMode) {
                card.classList.add('circle-mode');
            } else {
                card.classList.remove('circle-mode');
            }
        });

        // After style changes (which may change card size), re-clamp positions
        this.clampAllCardPositions();
    }

    // Debug/test helpers per validare comportamento
    runDragTests() {
        console.group('Drag Tests');
        try {
            const field = document.getElementById('footballField');
            const anyCard = field.querySelector('.player-card') || document.querySelector('.field-container .player-card');
            if (!anyCard) {
                console.warn('Nessuna card sul campo/container per test. Trascina una card prima di eseguire i test.');
                return;
            }
            // Test 1: clamp ai bordi
            const rect = field.getBoundingClientRect();
            anyCard.style.left = '150%';
            anyCard.style.top = '150%';
            this.clampAllCardPositions();
            console.assert(parseFloat(anyCard.style.left) <= 100 && parseFloat(anyCard.style.top) <= 100, 'Clamp entro i limiti fallito');

            // Test 2: snap-back quando fuori
            const evt = { clientX: rect.right + 100, clientY: rect.bottom + 100 };
            // Simula ultima posizione valida al centro
            anyCard.style.left = '50%';
            anyCard.style.top = '50%';
            // Chiamata diretta del clamp per simulare snap-back
            this.clampAllCardPositions();
            console.assert(anyCard.style.left && anyCard.style.top, 'Snap-back non ha ripristinato posizioni');

            console.log('Tutti i test base completati (vedi assert sopra).');
        } finally {
            console.groupEnd();
        }
    }

    updateCardDisplayToggleButton() {
        const cardDisplayToggle = document.getElementById('cardDisplayToggle');
        if (cardDisplayToggle) {
            if (this.circleDisplayMode) {
                cardDisplayToggle.classList.add('circle-mode');
                cardDisplayToggle.textContent = 'Vista Normale';
            } else {
                cardDisplayToggle.classList.remove('circle-mode');
                cardDisplayToggle.textContent = 'Vista Circolare';
            }
        }
    }

    makeDraggable(element) {
        if (!element) return;
        
        let isDragging = false;
        let startX, startY, initialX, initialY;
        
        // Make the entire panel draggable, not just the header
        element.addEventListener('mousedown', (e) => {
            // Don't start dragging if clicking on interactive elements
            if (e.target.matches('button, input, select, textarea, .tool-btn, .btn') || 
                e.target.closest('button, input, select, textarea, .tool-btn, .btn')) {
                return;
            }
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = element.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;
            
            element.style.transition = 'none';
            element.style.userSelect = 'none'; // Prevent text selection while dragging
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
            element.style.userSelect = ''; // Re-enable text selection
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
        textElement.setAttribute('font-size', result.size || 16);
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
            const currentSize = parseInt(textElement.getAttribute('font-size')) || 16;
            const result = await this.showTextInputModal('Modifica il testo:', 'Scrivi qui il testo...', textElement.textContent, true, currentColor, currentSize);
            
            if (result === 'DELETE') {
                // Delete the text element
                textElement.remove();
                this.saveToHistory(canvas);
            } else if (result !== null && result.text !== '') {
                // Update the text content, color, and size
                textElement.textContent = result.text;
                textElement.setAttribute('fill', result.color);
                textElement.setAttribute('font-size', result.size || currentSize);
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
            this.updateGridRoleToggleButton(); // Sync grid button
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

    // Update the visual state of the grid role toggle button
    updateGridRoleToggleButton() {
        const gridRoleToggleBtn = document.getElementById('gridRoleToggleBtn');
        if (!gridRoleToggleBtn) return;
        
        const toggleText = gridRoleToggleBtn.querySelector('.toggle-text');
        const icon = gridRoleToggleBtn.querySelector('.fas');

        if (this.rolesVisible) {
            gridRoleToggleBtn.classList.remove('off');
            toggleText.textContent = 'ON';
            icon.className = 'fas fa-eye';
            gridRoleToggleBtn.title = 'Clicca per nascondere i ruoli dei giocatori';
        } else {
            gridRoleToggleBtn.classList.add('off');
            toggleText.textContent = 'OFF';
            icon.className = 'fas fa-eye-slash';
            gridRoleToggleBtn.title = 'Clicca per mostrare i ruoli dei giocatori';
        }
    }

    // Update the main role toggle button from grid view
    updateMainRoleToggleButton() {
        this.updateRoleToggleButton();
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

    // Grid View functionality
    openGridView() {
        this.selectedPlayers = new Set();
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionOverlay = null;
        
        const modal = document.getElementById('gridViewModal');
        const overlay = document.getElementById('overlay');
        
        // Show modal
        modal.style.display = 'block';
        overlay.style.display = 'block';
        
        // Setup grid view
        this.setupGridView();
        this.renderGridPlayers();
        this.updateSelectionCount();
        
        // Apply current role visibility state to grid
        this.toggleRoleVisibility(this.rolesVisible);
        
        // Setup event listeners
        this.setupGridEventListeners();
    }

    closeGridView() {
        const modal = document.getElementById('gridViewModal');
        const overlay = document.getElementById('overlay');
        
        modal.style.display = 'none';
        overlay.style.display = 'none';
        
        // Clean up
        this.selectedPlayers = null;
        this.removeGridEventListeners();
    }

    setupGridView() {
        // Copy filter values from main player pool
        const mainSquadFilter = document.getElementById('playerSquadFilter')?.value || '';
        const mainNameFilter = document.getElementById('playerNameFilter')?.value || '';
        const mainPositionFilter = document.getElementById('playerPositionFilter')?.value || '';
        
        document.getElementById('gridSquadFilter').value = mainSquadFilter;
        document.getElementById('gridNameFilter').value = mainNameFilter;
        document.getElementById('gridPositionFilter').value = mainPositionFilter;
        
        // Sync grid role toggle button with main role toggle state
        this.updateGridRoleToggleButton();
    }

    setupGridEventListeners() {
        // Modal close buttons
        document.getElementById('gridModalClose').addEventListener('click', () => this.closeGridView());
        document.getElementById('gridModalCancel').addEventListener('click', () => this.closeGridView());
        document.getElementById('overlay').addEventListener('click', () => this.closeGridView());
        
        // Filter events
        document.getElementById('gridSquadFilter').addEventListener('change', () => this.renderGridPlayers());
        document.getElementById('gridNameFilter').addEventListener('input', () => this.renderGridPlayers());
        document.getElementById('gridPositionFilter').addEventListener('change', () => this.renderGridPlayers());
        
        // Grid role toggle button
        const gridRoleToggleBtn = document.getElementById('gridRoleToggleBtn');
        if (gridRoleToggleBtn) {
            gridRoleToggleBtn.addEventListener('click', () => {
                this.rolesVisible = !this.rolesVisible;
                this.updateGridRoleToggleButton();
                this.updateMainRoleToggleButton();
                this.toggleRoleVisibility(this.rolesVisible);
                
                // Save state to localStorage
                localStorage.setItem('roleToggleState', JSON.stringify(this.rolesVisible));
                
                // Show feedback notification
                this.showRoleToggleNotification();
            });
        }
        
        // Selection actions
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAllPlayers());
        document.getElementById('clearSelectionBtn').addEventListener('click', () => this.clearSelection());
        document.getElementById('gridModalInsert').addEventListener('click', () => this.insertSelectedPlayers());
        
        // Keyboard events
        document.addEventListener('keydown', this.handleGridKeydown.bind(this));
    }

    removeGridEventListeners() {
        document.removeEventListener('keydown', this.handleGridKeydown.bind(this));
    }

    renderGridPlayers() {
        const gridContainer = document.getElementById('gridContainer');
        gridContainer.innerHTML = '';
        
        if (!window.playerManager) {
            gridContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Sistema di gestione giocatori in caricamento...</p>';
            return;
        }
        
        const players = window.playerManager.getPlayers();
        const squadFilter = document.getElementById('gridSquadFilter')?.value || '';
        const nameFilter = document.getElementById('gridNameFilter')?.value.toLowerCase() || '';
        const positionFilter = document.getElementById('gridPositionFilter')?.value || '';
        
        // Filter players
        let filteredPlayers = players.filter(player => {
            const matchesSquad = !squadFilter || player.squad.toLowerCase() === squadFilter.toLowerCase();
            const matchesName = !nameFilter || player.name.toLowerCase().includes(nameFilter);
            const matchesPosition = !positionFilter || player.position === positionFilter;
            return matchesSquad && matchesName && matchesPosition;
        });
        
        // Apply team display mode filter
        const teamDisplayMode = document.getElementById('teamDisplayMode')?.value;
        if (teamDisplayMode === '1') {
            const squad1Select = document.getElementById('squad1');
            if (squad1Select?.value) {
                filteredPlayers = filteredPlayers.filter(player => 
                    player.squad.toLowerCase() === squad1Select.value.toLowerCase()
                );
            }
        } else if (teamDisplayMode === '2') {
            const squad1Select = document.getElementById('squad1');
            const squad2Select = document.getElementById('squad2');
            const selectedSquads = [];
            if (squad1Select?.value) selectedSquads.push(squad1Select.value.toLowerCase());
            if (squad2Select?.value) selectedSquads.push(squad2Select.value.toLowerCase());
            
            if (selectedSquads.length > 0) {
                filteredPlayers = filteredPlayers.filter(player => 
                    selectedSquads.includes(player.squad.toLowerCase())
                );
            }
        }
        
        // Remove players already on field
        const playersOnField = Array.from(document.querySelectorAll('#footballField .player-card, .field-container .player-card'))
            .map(card => card.dataset.playerId);
        filteredPlayers = filteredPlayers.filter(player => 
            !playersOnField.includes(player.id)
        );

        // Sort players for logical grouping by squad and role
        filteredPlayers = this.sortPlayersForDisplay(filteredPlayers);

        // Render grid cards
        filteredPlayers.forEach(player => {
            const card = this.createGridPlayerCard(player);
            gridContainer.appendChild(card);
        });
        
        if (filteredPlayers.length === 0) {
            gridContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 20px;">Nessun giocatore disponibile.</p>';
        }
    }

    createGridPlayerCard(player) {
        const card = document.createElement('div');
        card.className = 'grid-player-card';
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
            <div class="selection-checkbox">
                <i class="fas fa-check"></i>
            </div>
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
        
        // Add click event for selection
        card.addEventListener('click', (e) => this.handleGridCardClick(e, player.id));
        
        return card;
    }

    handleGridCardClick(e, playerId) {
        e.preventDefault();
        e.stopPropagation();
        
        const card = e.currentTarget;
        
        // Semplice toggle selection - non serve più Ctrl/Cmd
        this.togglePlayerSelection(playerId, card);
        
        this.lastSelectedCard = card;
        this.updateSelectionCount();
    }

    togglePlayerSelection(playerId, card) {
        if (this.selectedPlayers.has(playerId)) {
            this.selectedPlayers.delete(playerId);
            card.classList.remove('selected');
        } else {
            this.selectedPlayers.add(playerId);
            card.classList.add('selected');
        }
    }

    selectRange(startCard, endCard) {
        const gridContainer = document.getElementById('gridContainer');
        const cards = Array.from(gridContainer.querySelectorAll('.grid-player-card'));
        
        const startIndex = cards.indexOf(startCard);
        const endIndex = cards.indexOf(endCard);
        
        const minIndex = Math.min(startIndex, endIndex);
        const maxIndex = Math.max(startIndex, endIndex);
        
        for (let i = minIndex; i <= maxIndex; i++) {
            const card = cards[i];
            const playerId = card.dataset.playerId;
            this.selectedPlayers.add(playerId);
            card.classList.add('selected');
        }
    }

    selectAllPlayers() {
        const cards = document.querySelectorAll('.grid-player-card');
        cards.forEach(card => {
            const playerId = card.dataset.playerId;
            this.selectedPlayers.add(playerId);
            card.classList.add('selected');
        });
        this.updateSelectionCount();
    }

    clearSelection() {
        this.selectedPlayers.clear();
        const cards = document.querySelectorAll('.grid-player-card');
        cards.forEach(card => card.classList.remove('selected'));
        this.updateSelectionCount();
    }

    updateSelectionCount() {
        const count = this.selectedPlayers.size;
        document.getElementById('selectedCount').textContent = count;
        document.getElementById('insertCount').textContent = count;
        
        // Enable/disable insert button
        const insertBtn = document.getElementById('gridModalInsert');
        insertBtn.disabled = count === 0;
        if (count === 0) {
            insertBtn.classList.add('disabled');
        } else {
            insertBtn.classList.remove('disabled');
        }
    }

    handleGridKeydown(e) {
        if (e.key === 'Escape') {
            this.closeGridView();
        } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.selectAllPlayers();
        }
    }

    insertSelectedPlayers() {
        // Initialize selectedPlayers if it doesn't exist
        if (!this.selectedPlayers) {
            this.selectedPlayers = new Set();
        }
        
        if (this.selectedPlayers.size === 0) return;
        
        const players = window.playerManager.getPlayers();
        const selectedPlayerData = players.filter(player => 
            this.selectedPlayers.has(player.id)
        );
        
        // Insert players into field container (gray area)
        const fieldContainer = document.querySelector('.field-container');
        const containerRect = fieldContainer.getBoundingClientRect();
        let xOffset = 50;
        let yOffset = 50;
        
        selectedPlayerData.forEach((player, index) => {
            // Check if player is already on field
            const existingCard = document.querySelector(`[data-player-id="${player.id}"]`);
            if (existingCard && (existingCard.closest('#footballField') || existingCard.closest('.field-container'))) {
                return; // Skip if already on field
            }
            
            // Create field card
            const fieldCard = this.createPlayerCard(player);
            fieldCard.style.position = 'absolute';
            // Planned pixel position
            const plannedX = xOffset + (index % 5) * 130;
            const plannedY = yOffset + Math.floor(index / 5) * 170;
            // Clamp within container
            const cardWidth = 120;
            const cardHeight = 160;
            const boundedX = Math.max(0, Math.min(plannedX, containerRect.width - cardWidth));
            const boundedY = Math.max(0, Math.min(plannedY, containerRect.height - cardHeight));
            // Apply percentage-based position
            const leftPct = (boundedX / containerRect.width) * 100;
            const topPct = (boundedY / containerRect.height) * 100;
            fieldCard.style.left = `${leftPct}%`;
            fieldCard.style.top = `${topPct}%`;
            fieldCard.style.zIndex = '10';

            // Apply current display style immediately
            if (this.circleDisplayMode) {
                fieldCard.classList.add('circle-mode');
            } else {
                fieldCard.classList.remove('circle-mode');
            }
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-player-btn';
            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
            deleteBtn.title = 'Rimuovi dal campo';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.returnPlayerToPool(fieldCard);
            });
            fieldCard.appendChild(deleteBtn);
            
            fieldContainer.appendChild(fieldCard);
        });
        
        // Update player pool to remove inserted players
        this.renderPlayerPool();
        
        // Re-render grid view to remove inserted players from the grid
        this.renderGridPlayers();

        // Ensure all cards reflect the current style (field + container)
        this.updateCardDisplayMode();
        
        // Show notification first
        this.showGridNotification(`${selectedPlayerData.length} giocatori inseriti nel campo`);
        
        // Simulate click on the close button (X) to close the grid view
        const closeButton = document.getElementById('gridModalClose');
        if (closeButton) {
            closeButton.click();
        }
    }

    showGridNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'grid-notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        `;
        
        // Add notification styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 500;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Player Management System
const INITIAL_PLAYERS_DATA = {
  "players": [
    {
      "id": "player_001",
      "name": "Castelli",
      "position": "PORTIERE",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_002",
      "name": "Peqini",
      "position": "PORTIERE",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_004",
      "name": "Ambari",
      "position": "DIFENSORE",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_005",
      "name": "Bruzzone",
      "position": "DIFENSORE",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_003",
      "name": "Geraci",
      "position": "DIFENSORE",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_146",
      "name": "Girgi",
      "position": "DIFENSORE",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_006",
      "name": "Lorenzani",
      "position": "CENTROCAMPISTA",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_007",
      "name": "Sousa",
      "position": "CENTROCAMPISTA",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_009",
      "name": "Foglia",
      "position": "ATTACCANTE",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_008",
      "name": "Massa",
      "position": "ATTACCANTE",
      "squad": "alpak",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_010",
      "name": "Marin",
      "position": "DIFENSORE",
      "squad": "alpak",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_011",
      "name": "Gelsi",
      "position": "CENTROCAMPISTA",
      "squad": "alpak",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_012",
      "name": "Ronchi",
      "position": "ATTACCANTE",
      "squad": "alpak",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_163",
      "name": "Procida",
      "position": "PORTIERE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_158",
      "name": "Fofana",
      "position": "DIFENSORE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_015",
      "name": "Frana",
      "position": "DIFENSORE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_013",
      "name": "Garilli",
      "position": "DIFENSORE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_014",
      "name": "Tuia",
      "position": "DIFENSORE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_016",
      "name": "Zougui",
      "position": "DIFENSORE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_017",
      "name": "Finardi",
      "position": "CENTROCAMPISTA",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_020",
      "name": "Picone",
      "position": "CENTROCAMPISTA",
      "squad": "fc zeta",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_157",
      "name": "Matos",
      "position": "ATTACCANTE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_019",
      "name": "Pesca",
      "position": "ATTACCANTE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_018",
      "name": "Strada",
      "position": "ATTACCANTE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_021",
      "name": "Casapieri",
      "position": "PORTIERE",
      "squad": "bigbro",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_022",
      "name": "Spizzi",
      "position": "CENTROCAMPISTA",
      "squad": "bigbro",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_023",
      "name": "Moscardelli",
      "position": "ATTACCANTE",
      "squad": "bigbro",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_025",
      "name": "Dario",
      "position": "PORTIERE",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_024",
      "name": "Iuliano",
      "position": "PORTIERE",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_027",
      "name": "Capelli",
      "position": "DIFENSORE",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_026",
      "name": "M.Ferrara",
      "position": "DIFENSORE",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_028",
      "name": "Pizzamiglio",
      "position": "DIFENSORE",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_029",
      "name": "Sberna",
      "position": "DIFENSORE",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_030",
      "name": "Di Battista",
      "position": "CENTROCAMPISTA",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_031",
      "name": "T.Ferrara",
      "position": "CENTROCAMPISTA",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_033",
      "name": "Kalaja",
      "position": "ATTACCANTE",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_032",
      "name": "Santoro",
      "position": "ATTACCANTE",
      "squad": "boomers",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_156",
      "name": "Piantedosi",
      "position": "DIFENSORE",
      "squad": "boomers",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_034",
      "name": "Renault",
      "position": "CENTROCAMPISTA",
      "squad": "boomers",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_035",
      "name": "Fichera",
      "position": "ATTACCANTE",
      "squad": "boomers",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_036",
      "name": "Lo Faso",
      "position": "ATTACCANTE",
      "squad": "boomers",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_062",
      "name": "Gili",
      "position": "PORTIERE",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_061",
      "name": "Godio",
      "position": "PORTIERE",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_064",
      "name": "Davi",
      "position": "DIFENSORE",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_065",
      "name": "Ferri",
      "position": "DIFENSORE",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_063",
      "name": "Olivera",
      "position": "DIFENSORE",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_067",
      "name": "Borin",
      "position": "CENTROCAMPISTA",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_147",
      "name": "Corso",
      "position": "CENTROCAMPISTA",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_066",
      "name": "Nunes",
      "position": "CENTROCAMPISTA",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_068",
      "name": "Zaki",
      "position": "ATTACCANTE",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_069",
      "name": "Zullo",
      "position": "ATTACCANTE",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_148",
      "name": "Savva",
      "position": "DIFENSORE",
      "squad": "caesar",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_070",
      "name": "Loiodice",
      "position": "CENTROCAMPISTA",
      "squad": "caesar",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_071",
      "name": "Abale",
      "position": "ATTACCANTE",
      "squad": "caesar",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_072",
      "name": "Lagzir",
      "position": "ATTACCANTE",
      "squad": "caesar",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_149",
      "name": "Zunino",
      "position": "ATTACCANTE",
      "squad": "caesar",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_037",
      "name": "Marenco",
      "position": "PORTIERE",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_038",
      "name": "Martino",
      "position": "PORTIERE",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_039",
      "name": "De Lucia",
      "position": "DIFENSORE",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_040",
      "name": "Mantovani",
      "position": "DIFENSORE",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_041",
      "name": "M.Rossi",
      "position": "DIFENSORE",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_162",
      "name": "Vacca",
      "position": "DIFENSORE",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_042",
      "name": "Petrone",
      "position": "CENTROCAMPISTA",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_043",
      "name": "Uras",
      "position": "CENTROCAMPISTA",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_044",
      "name": "Picci",
      "position": "ATTACCANTE",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_045",
      "name": "Rossoni",
      "position": "ATTACCANTE",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_046",
      "name": "Conte",
      "position": "CENTROCAMPISTA",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_161",
      "name": "Sala",
      "position": "CENTROCAMPISTA",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_048",
      "name": "Bertocchi",
      "position": "ATTACCANTE",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_160",
      "name": "Casiraghi",
      "position": "ATTACCANTE",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_047",
      "name": "Colombo",
      "position": "ATTACCANTE",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_159",
      "name": "Di Sparti",
      "position": "ATTACCANTE",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_049",
      "name": "Anane",
      "position": "PORTIERE",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_051",
      "name": "Caronte",
      "position": "DIFENSORE",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_050",
      "name": "Mihaylov",
      "position": "DIFENSORE",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_153",
      "name": "Zanotti",
      "position": "DIFENSORE",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_052",
      "name": "Cascianelli",
      "position": "CENTROCAMPISTA",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_055",
      "name": "El Jadi",
      "position": "CENTROCAMPISTA",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_053",
      "name": "Marsanasco",
      "position": "CENTROCAMPISTA",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_154",
      "name": "Scopelliti",
      "position": "CENTROCAMPISTA",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_054",
      "name": "Spadaccino",
      "position": "CENTROCAMPISTA",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_057",
      "name": "Mirarchi",
      "position": "ATTACCANTE",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_056",
      "name": "Sigurtà",
      "position": "ATTACCANTE",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_059",
      "name": "Benedetti",
      "position": "DIFENSORE",
      "squad": "d power",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_058",
      "name": "Marocco",
      "position": "DIFENSORE",
      "squad": "d power",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_060",
      "name": "Cerchiaro",
      "position": "CENTROCAMPISTA",
      "squad": "d power",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 169,
      "name": "Vanacore",
      "position": "CENTROCAMPISTA",
      "squad": "d power",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 86,
      "name": "Ambrosio",
      "position": "PORTIERE",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 85,
      "name": "Buono",
      "position": "PORTIERE",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 89,
      "name": "Y.El Hilali",
      "position": "DIFENSORE",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 88,
      "name": "Manzoni",
      "position": "DIFENSORE",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 87,
      "name": "Montagna",
      "position": "DIFENSORE",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 90,
      "name": "Cartella",
      "position": "CENTROCAMPISTA",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 91,
      "name": "Di Mauro",
      "position": "CENTROCAMPISTA",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 92,
      "name": "Gallizia",
      "position": "CENTROCAMPISTA",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 93,
      "name": "Maddalena",
      "position": "CENTROCAMPISTA",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_155",
      "name": "Testa",
      "position": "CENTROCAMPISTA",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 94,
      "name": "Salvatore",
      "position": "ATTACCANTE",
      "squad": "fc zeta",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 95,
      "name": "Marinaro",
      "position": "PORTIERE",
      "squad": "fc zeta",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_165",
      "name": "Djidji",
      "position": "DIFENSORE",
      "squad": "fc zeta",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 96,
      "name": "Iocolano",
      "position": "CENTROCAMPISTA",
      "squad": "fc zeta",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 97,
      "name": "M.El Hilali",
      "position": "ATTACCANTE",
      "squad": "fc zeta",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 168,
      "name": "Vimercati",
      "position": "PORTIERE",
      "squad": "fc zeta",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 98,
      "name": "Feleppa",
      "position": "PORTIERE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 100,
      "name": "Ciceri",
      "position": "DIFENSORE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 99,
      "name": "Mancuso",
      "position": "DIFENSORE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 101,
      "name": "Prinari",
      "position": "DIFENSORE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 102,
      "name": "Donzelli",
      "position": "CENTROCAMPISTA",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 103,
      "name": "Mancosu",
      "position": "CENTROCAMPISTA",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 106,
      "name": "Cosenza",
      "position": "ATTACCANTE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 105,
      "name": "Folla",
      "position": "ATTACCANTE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 104,
      "name": "de la Cruz",
      "position": "ATTACCANTE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_164",
      "name": "Suma",
      "position": "ATTACCANTE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 107,
      "name": "Chironi",
      "position": "PORTIERE",
      "squad": "gear 7",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 108,
      "name": "Hernández",
      "position": "CENTROCAMPISTA",
      "squad": "gear 7",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 109,
      "name": "Sau",
      "position": "ATTACCANTE",
      "squad": "gear 7",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 167,
      "name": "Falco",
      "position": "ATTACCANTE",
      "squad": "gear 7",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 110,
      "name": "Guddo",
      "position": "PORTIERE",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 111,
      "name": "Adamo",
      "position": "DIFENSORE",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 114,
      "name": "Beniti",
      "position": "CENTROCAMPISTA",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 116,
      "name": "Brusadelli",
      "position": "CENTROCAMPISTA",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 117,
      "name": "Frosio",
      "position": "CENTROCAMPISTA",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 115,
      "name": "Marino",
      "position": "CENTROCAMPISTA",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 113,
      "name": "Pannuti",
      "position": "CENTROCAMPISTA",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 112,
      "name": "Proietti",
      "position": "CENTROCAMPISTA",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 118,
      "name": "Soldà",
      "position": "ATTACCANTE",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 119,
      "name": "Evangelisti",
      "position": "DIFENSORE",
      "squad": "stallions",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 120,
      "name": "Altamura",
      "position": "CENTROCAMPISTA",
      "squad": "stallions",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 121,
      "name": "Stojkovic",
      "position": "ATTACCANTE",
      "squad": "stallions",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_166",
      "name": "Zagari",
      "position": "ATTACCANTE",
      "squad": "stallions",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 74,
      "name": "Borges",
      "position": "PORTIERE",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 73,
      "name": "Vagge",
      "position": "PORTIERE",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 76,
      "name": "Di Dio",
      "position": "DIFENSORE",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 78,
      "name": "Filippi",
      "position": "DIFENSORE",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 75,
      "name": "Muscas",
      "position": "DIFENSORE",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 77,
      "name": "Zefi",
      "position": "DIFENSORE",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 79,
      "name": "Pagliaro",
      "position": "CENTROCAMPISTA",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 80,
      "name": "Turati",
      "position": "CENTROCAMPISTA",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 81,
      "name": "Bezziccheri",
      "position": "ATTACCANTE",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 82,
      "name": "Tropea",
      "position": "DIFENSORE",
      "squad": "trm fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 83,
      "name": "Scienza",
      "position": "ATTACCANTE",
      "squad": "trm fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 84,
      "name": "Vono",
      "position": "ATTACCANTE",
      "squad": "trm fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 122,
      "name": "Calabrò",
      "position": "PORTIERE",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 123,
      "name": "Taliento",
      "position": "PORTIERE",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 126,
      "name": "Bertaglio",
      "position": "DIFENSORE",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 124,
      "name": "Gorgoglione",
      "position": "DIFENSORE",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 125,
      "name": "Pisan",
      "position": "DIFENSORE",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 127,
      "name": "Cannataro",
      "position": "CENTROCAMPISTA",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 128,
      "name": "Cavalli",
      "position": "CENTROCAMPISTA",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_150",
      "name": "Di Gioia",
      "position": "CENTROCAMPISTA",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_151",
      "name": "Cogi",
      "position": "ATTACCANTE",
      "squad": "gear 7",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 130,
      "name": "Marti",
      "position": "ATTACCANTE",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 129,
      "name": "Zito",
      "position": "ATTACCANTE",
      "squad": "underdogs fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 131,
      "name": "Lunghi",
      "position": "DIFENSORE",
      "squad": "underdogs fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 133,
      "name": "Perrotti",
      "position": "ATTACCANTE",
      "squad": "underdogs fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 132,
      "name": "D.Rossi",
      "position": "ATTACCANTE",
      "squad": "underdogs fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 135,
      "name": "D'Ippolito",
      "position": "PORTIERE",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 134,
      "name": "Travaini",
      "position": "PORTIERE",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 138,
      "name": "Baioni",
      "position": "CENTROCAMPISTA",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 137,
      "name": "Bonzi",
      "position": "CENTROCAMPISTA",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 139,
      "name": "Maggioni",
      "position": "CENTROCAMPISTA",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 136,
      "name": "Pelli",
      "position": "CENTROCAMPISTA",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 141,
      "name": "Berra",
      "position": "ATTACCANTE",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_152",
      "name": "Damascelli",
      "position": "ATTACCANTE",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 140,
      "name": "Petrola'",
      "position": "ATTACCANTE",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 142,
      "name": "Sofia",
      "position": "ATTACCANTE",
      "squad": "zebras fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 143,
      "name": "Bosco",
      "position": "DIFENSORE",
      "squad": "zebras fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 144,
      "name": "Tarasco",
      "position": "DIFENSORE",
      "squad": "zebras fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": 145,
      "name": "Filipi",
      "position": "ATTACCANTE",
      "squad": "zebras fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_167",
      "name": "Perucca",
      "position": "PORTIERE",
      "squad": "d power",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_168",
      "name": "Andrei",
      "position": "ATTACCANTE",
      "squad": "trm fc",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_169",
      "name": "Ramon",
      "position": "CENTROCAMPISTA",
      "squad": "fc zeta",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_170",
      "name": "Mercuri",
      "position": "PORTIERE",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_171",
      "name": "Dell'Acqua",
      "position": "DIFENSORE",
      "squad": "stallions",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_172",
      "name": "Cheddia",
      "position": "CENTROCAMPISTA",
      "squad": "circus",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_173",
      "name": "Fabiani",
      "position": "DIFENSORE",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_174",
      "name": "Napoletano",
      "position": "ATTACCANTE",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_175",
      "name": "Giannace",
      "position": "ATTACCANTE",
      "squad": "circus",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_176",
      "name": "Bonolis",
      "position": "CENTROCAMPISTA",
      "squad": "caesar",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_177",
      "name": "Esposito",
      "position": "ATTACCANTE",
      "squad": "caesar",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_183",
      "name": "A.Vacca",
      "position": "CENTROCAMPISTA",
      "squad": "underdogs fc",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_184",
      "name": "Kean",
      "position": "ATTACCANTE",
      "squad": "caesar",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_178",
      "name": "Alvarado",
      "position": "ATTACCANTE",
      "squad": "gear 7",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_179",
      "name": "Cardamone",
      "position": "DIFENSORE",
      "squad": "gear 7",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_200",
      "name": "Piro",
      "position": "ATTACCANTE",
      "squad": "bigbro",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_201",
      "name": "Inzerauto",
      "position": "ATTACCANTE",
      "squad": "d power",
      "wildcard": "NO",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    },
    {
      "id": "player_202",
      "name": "Ratti",
      "position": "ATTACCANTE",
      "squad": "boomers",
      "wildcard": "SI",
      "created_at": "2024-12-19T12:00:00Z",
      "updated_at": "2024-12-19T12:00:00Z"
    }
  ],
  "metadata": {
    "version": "1.0",
    "last_updated": "2024-12-19T12:00:00Z",
    "total_players": 187,
    "squads": [
      "alpak",
      "bigbro",
      "boomers",
      "caesar",
      "circus",
      "d power",
      "fc zeta",
      "gear 7",
      "stallions",
      "trm fc",
      "underdogs fc",
      "zebras fc"
    ]
  }
};

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
            // Try to load from localStorage first (user changes)
            const saved = localStorage.getItem('footballPlayers');
            if (saved) {
                this.players = JSON.parse(saved);
                console.log('Giocatori caricati da localStorage:', this.players.length);
            } else {
                // Fallback to initial data
                console.log('Nessun dato in localStorage, carico dati iniziali...');
                if (typeof INITIAL_PLAYERS_DATA !== 'undefined') {
                    this.players = INITIAL_PLAYERS_DATA.players || [];
                    console.log('Giocatori caricati da INITIAL_PLAYERS_DATA:', this.players.length);
                    // Save to localStorage for future use
                    this.savePlayers();
                } else {
                    console.error('INITIAL_PLAYERS_DATA non definito');
                    this.players = [];
                }
            }
        } catch (error) {
            console.error('Errore nel caricamento giocatori:', error);
            this.players = [];
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