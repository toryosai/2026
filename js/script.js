document.addEventListener('DOMContentLoaded', () => {
    try {
    const hasSeenLoading = sessionStorage.getItem('hasSeenLoading');
    const pageType = document.body.dataset.page;
    const favoriteStorageKey = pageType === 'event'
        ? 'inaguraisai_favorites_events'
        : 'inaguraisai_favorites_booths';
    const favoritesList = document.getElementById('js-favorites-list');
    const favoritesTrigger = document.getElementById('js-favorites-trigger');
    const favoritesPanel = document.getElementById('js-favorites-panel');
    const clearFavoritesButton = document.getElementById('js-clear-favorites');

    const escapeHtml = (value = '') => String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const getFavorites = () => {
        try {
            const raw = localStorage.getItem(favoriteStorageKey);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    };

    const saveFavorites = (items) => {
        localStorage.setItem(favoriteStorageKey, JSON.stringify(items));
        if (typeof renderFavorites === 'function') renderFavorites();
        if (typeof updateFavoriteButtons === 'function') updateFavoriteButtons();
    };

    const openFavoritesPanel = () => {
        if (!favoritesPanel || !favoritesTrigger) return;
        favoritesPanel.hidden = false;
        favoritesTrigger.classList.add('is-active');
        favoritesTrigger.setAttribute('aria-expanded', 'true');
    };

    const closeFavoritesPanel = () => {
        if (!favoritesPanel || !favoritesTrigger) return;
        favoritesPanel.hidden = true;
        favoritesTrigger.classList.remove('is-active');
        favoritesTrigger.setAttribute('aria-expanded', 'false');
    };

    const scrollToFavoriteTarget = (item) => {
        if (!item) return;
        const target = item.type === 'booth'
            ? document.querySelector(`.booth-card[data-favorite-id="${CSS.escape(item.id)}"]`)
            : document.querySelector(`.tt-item[data-favorite-id="${CSS.escape(item.id)}"]`);

        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('is-targeted');
            setTimeout(() => target.classList.remove('is-targeted'), 1800);
        }
    };

    const toggleFavorite = (payload) => {
        const favorites = getFavorites();
        const index = favorites.findIndex(item => item.id === payload.id);

        if (index >= 0) {
            favorites.splice(index, 1);
        } else {
            favorites.push(payload);
        }

        saveFavorites(favorites);
        if (favoritesList) {
            renderFavorites();
        }
        updateFavoriteButtons();
    };

    const renderFavorites = () => {
        if (!favoritesList) return;

        const favorites = getFavorites();
        if (!favorites.length) {
            favoritesList.innerHTML = '<p class="favorites-empty">まだお気に入りがありません。星マークを押して追加してください。</p>';
            return;
        }

        favoritesList.innerHTML = favorites.map(item => {
            const meta = item.type === 'booth'
                ? `${escapeHtml(item.className)} / ${escapeHtml(item.room)}`
                : escapeHtml(item.stage);
            const sub = item.type === 'booth'
                ? escapeHtml(item.room)
                : escapeHtml(item.time);

            return `
                <div class="favorites-item">
                    <button type="button" class="favorites-item-link" data-favorite-id="${escapeHtml(item.id)}">
                        <p class="favorites-item-meta">${escapeHtml(item.type === 'booth' ? 'CLASS BOOTH' : 'STAGE EVENT')}</p>
                        <h3>${escapeHtml(item.title)}</h3>
                        <p class="favorites-item-sub">${meta}</p>
                        <p class="favorites-item-sub">${sub}</p>
                    </button>
                    <button type="button" class="favorites-remove" data-favorite-id="${escapeHtml(item.id)}" aria-label="お気に入りから外す">×</button>
                </div>
            `;
        }).join('');
    };

    const updateFavoriteButtons = () => {
        const favorites = getFavorites();
        document.querySelectorAll('.favorite-toggle').forEach(button => {
            const isActive = favorites.some(item => item.id === button.dataset.favoriteId);
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
            button.innerHTML = `<span aria-hidden="true">${isActive ? '★' : '☆'}</span>`;
        });

        document.querySelectorAll('.btn-modal-favorite').forEach(button => {
            const isActive = favorites.some(item => item.id === button.dataset.favoriteId);
            button.classList.toggle('is-active', isActive);
            button.textContent = isActive ? 'お気に入りを解除' : 'お気に入りに追加';
        });
    };

    const attachFavoriteButton = (element, payload) => {
        if (element.querySelector('.favorite-toggle')) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'favorite-toggle';
        button.dataset.favoriteId = payload.id;
        button.setAttribute('aria-label', 'お気に入りに追加');
        button.setAttribute('aria-pressed', 'false');
        button.innerHTML = '<span aria-hidden="true">☆</span>';
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleFavorite(payload);
        });

        element.appendChild(button);
    };

    if (favoritesTrigger && favoritesPanel) {
        favoritesTrigger.addEventListener('click', () => {
            if (favoritesPanel.hidden) {
                openFavoritesPanel();
            } else {
                closeFavoritesPanel();
            }
        });

        document.addEventListener('click', (event) => {
            if (!favoritesPanel.contains(event.target) && !favoritesTrigger.contains(event.target)) {
                closeFavoritesPanel();
            }
        });
    }

    if (favoritesList && clearFavoritesButton) {
        clearFavoritesButton.addEventListener('click', () => {
            saveFavorites([]);
        });

        favoritesList.addEventListener('click', (event) => {
            const favoriteLink = event.target.closest('.favorites-item-link');
            if (favoriteLink) {
                const targetId = favoriteLink.dataset.favoriteId;
                const favorites = getFavorites();
                const targetItem = favorites.find(item => item.id === targetId);
                if (targetItem) {
                    scrollToFavoriteTarget(targetItem);
                    closeFavoritesPanel();
                }
                return;
            }

            const removeButton = event.target.closest('.favorites-remove');
            if (!removeButton) return;

            const targetId = removeButton.dataset.favoriteId;
            const favorites = getFavorites();
            const nextFavorites = favorites.filter(item => item.id !== targetId);
            saveFavorites(nextFavorites);
        });
    }

    const modal = document.getElementById('js-booth-modal');
    const modalClose = document.getElementById('js-modal-close');

    if (pageType === 'booth') {
        const modalFavoriteButton = document.getElementById('js-modal-favorite');

        document.querySelectorAll('.booth-card[data-modal]').forEach(card => {
            const payload = {
                id: `${card.dataset.classname || 'booth'}::${card.dataset.title || card.querySelector('h3')?.textContent || ''}`,
                type: 'booth',
                title: card.dataset.title || card.querySelector('h3')?.textContent || '',
                className: card.dataset.classname || '',
                room: card.dataset.room || '',
                image: card.dataset.image || '',
                desc: card.dataset.desc || ''
            };
            card.dataset.favoriteId = payload.id;
            attachFavoriteButton(card, payload);
        });

        if (modal) {
            const currentModalData = { payload: null };
            const syncModalFavoriteButton = () => {
                if (!modalFavoriteButton) return;
                if (!currentModalData.payload) {
                    modalFavoriteButton.dataset.favoriteId = '';
                    modalFavoriteButton.classList.remove('is-active');
                    modalFavoriteButton.textContent = 'お気に入りに追加';
                    return;
                }
                modalFavoriteButton.dataset.favoriteId = currentModalData.payload.id;
                const favorites = getFavorites();
                const isActive = favorites.some(item => item.id === currentModalData.payload.id);
                modalFavoriteButton.classList.toggle('is-active', isActive);
                modalFavoriteButton.textContent = isActive ? 'お気に入りを解除' : 'お気に入りに追加';
            };

            if (modalFavoriteButton) {
                modalFavoriteButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (!currentModalData.payload || !currentModalData.payload.id) return;
                    toggleFavorite(currentModalData.payload);
                    syncModalFavoriteButton();
                    renderFavorites();
                    updateFavoriteButtons();
                });
            }

            document.querySelectorAll('.booth-card[data-modal]').forEach(card => {
                card.addEventListener('click', () => {
                    const d = card.dataset;
                    currentModalData.payload = {
                        id: card.dataset.favoriteId || `${d.classname || 'booth'}::${d.title || ''}`,
                        type: 'booth',
                        title: d.title || card.querySelector('h3')?.textContent || '',
                        className: d.classname || '',
                        room: d.room || '',
                        image: d.image || '',
                        desc: d.desc || ''
                    };
                    syncModalFavoriteButton();
                });
            });

            const originalCloseModal = () => {
                modal.classList.remove('is-open');
                document.body.style.overflow = '';
            };

            const closeModal = () => {
                originalCloseModal();
                currentModalData.payload = null;
                syncModalFavoriteButton();
            };

            if (modalClose) modalClose.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeModal();
            });
        }
    }

    const evModal = document.getElementById('js-event-modal');
    const evModalClose = document.getElementById('js-event-modal-close');
    const evStageLabel = document.getElementById('js-event-modal-stage');
    const evTimeLabel = document.getElementById('js-event-modal-time');
    const evTitle = document.getElementById('js-event-modal-title');
    const evDesc = document.getElementById('js-event-modal-desc');

    if (pageType === 'event') {
        const eventModalFavoriteButton = document.getElementById('js-event-modal-favorite');

        document.querySelectorAll('.tt-item').forEach(item => {
            const payload = {
                id: `${item.dataset.title || 'event'}::${item.dataset.time || ''}::${item.dataset.stage || ''}`,
                type: 'event',
                title: item.dataset.title || '',
                stage: item.dataset.stage || '',
                time: item.dataset.time || '',
                desc: item.dataset.desc || ''
            };
            item.dataset.favoriteId = payload.id;
            attachFavoriteButton(item, payload);
        });

        if (evModal) {
            const currentEvModalData = { payload: null };
            const syncEvModalFavoriteButton = () => {
                if (!eventModalFavoriteButton) return;
                if (!currentEvModalData.payload) {
                    eventModalFavoriteButton.dataset.favoriteId = '';
                    eventModalFavoriteButton.classList.remove('is-active');
                    eventModalFavoriteButton.textContent = 'お気に入りに追加';
                    return;
                }
                eventModalFavoriteButton.dataset.favoriteId = currentEvModalData.payload.id;
                const favorites = getFavorites();
                const isActive = favorites.some(item => item.id === currentEvModalData.payload.id);
                eventModalFavoriteButton.classList.toggle('is-active', isActive);
                eventModalFavoriteButton.textContent = isActive ? 'お気に入りを解除' : 'お気に入りに追加';
            };

            if (eventModalFavoriteButton) {
                eventModalFavoriteButton.addEventListener('click', (event) => {
                    event.stopPropagation();
                    if (!currentEvModalData.payload || !currentEvModalData.payload.id) return;
                    toggleFavorite(currentEvModalData.payload);
                    syncEvModalFavoriteButton();
                    renderFavorites();
                    updateFavoriteButtons();
                });
            }

            document.querySelectorAll('.tt-item').forEach(item => {
                item.addEventListener('click', (event) => {
                    const currentItem = event.currentTarget;
                    const d = currentItem.dataset;
                    currentEvModalData.payload = {
                        id: currentItem.dataset.favoriteId || `${d.title || 'event'}::${d.time || ''}::${d.stage || ''}`,
                        type: 'event',
                        title: d.title || '',
                        stage: d.stage || '',
                        time: d.time || '',
                        desc: d.desc || ''
                    };

                    if (evStageLabel) evStageLabel.textContent = d.stage || '';
                    if (evTimeLabel) evTimeLabel.textContent = d.time || '';
                    if (evTitle) evTitle.textContent = d.title || '';
                    if (evDesc) evDesc.innerHTML = d.desc || '';

                    if (evStageLabel) {
                        if (d.stage.includes('メイン')) evStageLabel.style.background = 'var(--accent)';
                        else if (d.stage.includes('稲稜')) evStageLabel.style.background = 'var(--accent2)';
                        else evStageLabel.style.background = '#4caf77';
                    }

                    syncEvModalFavoriteButton();
                    evModal.classList.add('is-open');
                    document.body.style.overflow = 'hidden';
                });
            });

            const closeEvModal = () => {
                evModal.classList.remove('is-open');
                document.body.style.overflow = '';
                currentEvModalData.payload = null;
                syncEvModalFavoriteButton();
            };

            if (evModalClose) evModalClose.addEventListener('click', closeEvModal);
            evModal.addEventListener('click', (e) => {
                if (e.target === evModal) closeEvModal();
            });
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeEvModal();
            });
        }
    }

    renderFavorites();
    updateFavoriteButtons();

    // --- Loading Animation ---
    const loading = document.getElementById('loading');
    const loadingText = loading?.querySelector('.loading-text');
    const loadingPercent = loading?.querySelector('.loading-percent');
    const loadingBar = loading?.querySelector('.loading-bar');
    const loadingFinal = loading?.querySelector('.loading-final');
    const loadingBall = loading?.querySelector('.loading-ball');

    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const finishLoading = () => {
        if (!loading) return;
        loading.classList.remove('is-final');
        loading.classList.add('is-hidden');
        if (loadingText) loadingText.textContent = 'READY';
        if (loadingPercent) loadingPercent.textContent = '100%';
        if (loadingBar) loadingBar.style.width = '100%';
        if (loadingFinal) loadingFinal.textContent = 'WELCOME TO THE STADIUM';
    };

    const runLoadingSequence = async () => {
        if (!loading || !loadingText || !loadingPercent || !loadingBar || !loadingFinal) return;

        loading.classList.remove('is-hidden');
        loading.classList.remove('is-final');
        loadingBar.style.width = '0%';
        loadingBar.style.background = 'linear-gradient(90deg, var(--accent2), var(--accent))';
        loadingPercent.textContent = '0%';
        loadingText.textContent = 'KICK OFF';
        loadingFinal.textContent = 'WASEDA CUP 2026';

        if (loadingBall) {
            loadingBall.classList.add('is-rolling');
        }

        try {
            for (let i = 0; i <= 100; i += 1) {
                loadingPercent.textContent = `${i}%`;
                loadingBar.style.width = `${i}%`;
                await sleep(4);
            }

            loadingText.textContent = 'READY';
            loadingPercent.textContent = '100%';
            await sleep(250);

            loadingText.textContent = 'WELCOME TO THE STADIUM';
            loadingPercent.textContent = '';
            loading.classList.add('is-final');
            await sleep(180);
        } catch (error) {
            console.error(error);
        } finally {
            finishLoading();
        }
    };

    if (!hasSeenLoading) {
        sessionStorage.setItem('hasSeenLoading', 'true');
        runLoadingSequence();
    } else {
        loading?.classList.add('is-hidden');
    }

    } catch (error) {
        console.error(error);
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.remove('is-final');
            loading.classList.add('is-hidden');
        }
    }

    // --- Hamburger Menu ---
    const hamburger = document.getElementById('js-hamburger');
    const nav = document.getElementById('js-nav');

    if (hamburger && nav) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('is-active');
            nav.classList.toggle('is-active');
        });

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('is-active');
                nav.classList.remove('is-active');
            });
        });
    }

    // --- Text Split Animation (1文字ずつ) ---
    const splitTargets = document.querySelectorAll('.js-split-text');
    splitTargets.forEach(target => {
        const text = target.textContent;
        target.textContent = '';

        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char === ' ' ? '\u00A0' : char;
            span.style.transitionDelay = `${index * 0.05}s`;
            target.appendChild(span);
        });
    });

    // --- Intersection Observer (スクロール連動アニメーション) ---
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-animated');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.js-split-text, .anim-fade-up').forEach(el => {
        observer.observe(el);
    });

    // --- Booth cards toggle (旧方式。モーダルがある場合はモーダルで代替) ---
    document.querySelectorAll('.booth-toggle').forEach(button => {
        button.textContent = '続きを見る';
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', () => {
            const description = button.previousElementSibling;
            const isOpen = description.classList.toggle('is-open');
            button.textContent = isOpen ? '閉じる' : '続きを見る';
            button.setAttribute('aria-expanded', String(isOpen));
        });
    });

    // --- Booth Card Modal ---
    const modal = document.getElementById('js-booth-modal');
    const modalClose = document.getElementById('js-modal-close');
    const modalImage = document.getElementById('js-modal-image');
    const modalClass = document.getElementById('js-modal-class');
    const modalRoom = document.getElementById('js-modal-room');
    const modalTitle = document.getElementById('js-modal-title');
    const modalDesc = document.getElementById('js-modal-desc');
    const modalInsta = document.getElementById('js-modal-insta');

    if (modal) {
        document.querySelectorAll('.booth-card[data-modal]').forEach(card => {
            card.addEventListener('click', () => {
                const d = card.dataset;
                if (modalImage) {
                    modalImage.src = d.image || '';
                    modalImage.alt = d.classname || '';
                }
                if (modalClass) modalClass.textContent = d.classname || '';
                if (modalRoom) modalRoom.textContent = d.room || '';
                if (modalTitle) modalTitle.textContent = d.title || '';
                if (modalDesc) modalDesc.textContent = d.desc || '';
                if (modalInsta) {
                    if (d.insta) {
                        modalInsta.href = d.insta;
                        modalInsta.style.display = 'inline-flex';
                    } else {
                        modalInsta.style.display = 'none';
                    }
                }
                modal.classList.add('is-open');
                document.body.style.overflow = 'hidden';
            });
        });

        const closeModal = () => {
            modal.classList.remove('is-open');
            document.body.style.overflow = '';
        };

        if (modalClose) modalClose.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeModal();
        });
    }

    // --- Sticky year indicator (逆スクロール対応) ---
    const yearIndicator = document.querySelector('.floor-sticky-indicator');
    const yearLabel = document.getElementById('js-floor-label');
    const yearTitle = document.getElementById('js-floor-title');
    const floorSections = document.querySelectorAll('.floor-section');

    if (yearIndicator && yearLabel && yearTitle && floorSections.length) {
        let indicatorReset;
        let currentSectionIndex = 0;

        const updateYearIndicator = (activeSection, index) => {
            currentSectionIndex = index;
            yearLabel.textContent = activeSection.dataset.floorLabel || '';
            yearTitle.textContent = activeSection.dataset.floorTitle || '';
            yearIndicator.classList.remove('is-switching');
            void yearIndicator.offsetWidth;
            yearIndicator.classList.add('is-switching');
            clearTimeout(indicatorReset);
            indicatorReset = setTimeout(() => yearIndicator.classList.remove('is-switching'), 220);
        };

        // 双方向スクロール対応：各セクションのtop/bottom両端を監視
        const sectionVisibility = new Map();
        floorSections.forEach((sec, i) => sectionVisibility.set(sec, false));

        const floorObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                sectionVisibility.set(entry.target, entry.isIntersecting);
            });

            // 現在見えているセクションのうち最も上にあるものを選ぶ
            let topmost = null;
            let topmostTop = Infinity;
            floorSections.forEach((sec, i) => {
                if (sectionVisibility.get(sec)) {
                    const rect = sec.getBoundingClientRect();
                    if (rect.top < topmostTop) {
                        topmostTop = rect.top;
                        topmost = { sec, i };
                    }
                }
            });

            if (topmost) {
                updateYearIndicator(topmost.sec, topmost.i);
            }
        }, {
            rootMargin: '-140px 0px -10% 0px',
            threshold: [0, 0.1, 0.5, 1.0]
        });

        floorSections.forEach(section => floorObserver.observe(section));
        updateYearIndicator(floorSections[0], 0);
    }

    // --- Event Timeline Tab ---
    const tabBtns = document.querySelectorAll('.event-tab-btn');
    const tabPanels = document.querySelectorAll('.event-tab-panel');

    if (tabBtns.length && tabPanels.length) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.dataset.day;
                tabBtns.forEach(b => b.classList.remove('is-active'));
                tabPanels.forEach(p => p.classList.remove('is-active'));
                btn.classList.add('is-active');
                document.querySelector(`.event-tab-panel[data-day="${target}"]`)?.classList.add('is-active');
            });
        });
    }

    // --- スケジュールアコーディオン（新設） ---
    const accordions = document.querySelectorAll('.js-accordion');
    accordions.forEach(acc => {
        const header = acc.querySelector('.schedule-item-header');
        if(header) {
            header.addEventListener('click', () => {
                // 他の開いているものを閉じる場合は以下の2行を有効化
                // document.querySelectorAll('.js-accordion.is-open').forEach(openAcc => {
                //     if(openAcc !== acc) openAcc.classList.remove('is-open');
                // });
                
                acc.classList.toggle('is-open');
            });
        }
    });

});
