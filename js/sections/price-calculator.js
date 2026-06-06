const SHOOT_RATE = 4500;

const EDIT_TIERS = {
    none: { name: 'БЕЗ МОНТАЖА', price: 0 },
    basic: { name: 'БАЗОВЫЙ', price: 1500 },
    dynamic: { name: 'ДИНАМИЧНЫЙ', price: 3500 }
};

const PACKAGES = {
    promo: {
        name: 'ПРОМО-РОЛИК',
        intro: 'Рекламная подача для продукта, услуги, события или презентации компании.',
        shootHours: 4,
        shootMax: 12,
        editTier: 'dynamic',
        editMinutes: 2,
        editMax: 5,
        features: [
            'бриф и сценарный план',
            'съемка до 4 часов',
            'камера, свет и запись звука',
            'динамичный монтаж до 2 минут',
            'цветокоррекция и саунд-дизайн',
            'простая графика и титры',
            '2 круга правок'
        ]
    },
    ad: {
        name: 'РЕКЛАМНЫЙ РОЛИК',
        intro: 'Имиджевое или продающее видео с более детальной проработкой подачи.',
        shootHours: 5,
        shootMax: 12,
        editTier: 'dynamic',
        editMinutes: 2,
        editMax: 8,
        features: [
            'бриф и разработка подачи',
            'сценарный план',
            'съемка до 5 часов',
            'камера, свет и запись звука',
            'динамичный монтаж до 2 минут',
            'цветокоррекция, звук и графика',
            '2 круга правок'
        ]
    },
    clip: {
        name: 'МУЗЫКАЛЬНЫЙ КЛИП',
        intro: 'Визуальная история для артиста: от обсуждения идеи до готового клипа.',
        shootHours: 6,
        shootMax: 12,
        editTier: 'dynamic',
        editMinutes: 4,
        editMax: 10,
        features: [
            'обсуждение идеи и референсов',
            'сценарный план',
            'съемочная смена до 6 часов',
            'камера и базовый свет',
            'авторский монтаж до 4 минут',
            'цветокоррекция и саунд-дизайн',
            '2 круга правок'
        ]
    },
    interview: {
        name: 'ИНТЕРВЬЮ',
        intro: 'Разговорный формат для эксперта, команды или героя проекта.',
        shootHours: 2,
        shootMax: 12,
        editTier: 'basic',
        editMinutes: 10,
        editMax: 60,
        features: [
            'подготовка площадки',
            'съемка до 2 часов',
            'камера, свет и запись звука',
            'монтаж интервью до 10 минут',
            'цветокоррекция и чистка звука',
            'титры и простые плашки',
            '1 круг правок'
        ]
    },
    podcast: {
        name: 'ПОДКАСТ',
        intro: 'Разговорный выпуск с аккуратной сборкой материала и чистым звуком.',
        shootHours: 3,
        shootMax: 12,
        editTier: 'basic',
        editMinutes: 30,
        editMax: 120,
        features: [
            'подготовка площадки',
            'съемка до 3 часов',
            'камера, свет и запись звука',
            'монтаж выпуска до 30 минут',
            'цветокоррекция и чистка звука',
            'титры и простые плашки',
            '1 круг правок'
        ]
    },
    report: {
        name: 'ОТЧЕТНЫЙ РОЛИК',
        intro: 'Живое видео с мероприятия, открытия, выступления или события.',
        shootHours: 3,
        shootMax: 12,
        editTier: 'dynamic',
        editMinutes: 2,
        editMax: 10,
        features: [
            'съемка события до 3 часов',
            'общие и детальные планы',
            'живые эмоции и атмосфера',
            'динамичный монтаж до 2 минут',
            'цветокоррекция и саунд-дизайн',
            'простые титры',
            '2 круга правок'
        ]
    },
    reels: {
        name: 'REELS / SHORTS',
        intro: 'Вертикальный ролик для бизнеса, эксперта или артиста.',
        shootHours: 1,
        shootMax: 6,
        editTier: 'dynamic',
        editMinutes: 1,
        editMax: 0,
        reelsCount: 1,
        reelsMax: 20,
        volumeType: 'reels',
        features: [
            'идея и план кадров',
            'съемка до 1 часа',
            'вертикальный формат',
            'динамичный монтаж ролика',
            'субтитры и акценты',
            'простая графика',
            '2 круга правок'
        ]
    },
    shoot: {
        name: 'ТОЛЬКО СЪЕМКА',
        intro: 'Снимем материал и передадим исходники для дальнейшей работы.',
        shootHours: 2,
        shootMax: 12,
        editTier: 'none',
        editMinutes: 0,
        editMax: 0,
        features: [
            'работа оператора',
            'камера и базовый свет',
            'запись чистого звука',
            'общие и детальные планы',
            'подготовка техники',
            'передача исходников'
        ]
    },
    edit: {
        name: 'ТОЛЬКО МОНТАЖ',
        intro: 'Соберем готовое видео из ваших исходных материалов.',
        shootHours: 0,
        shootMax: 0,
        editTier: 'basic',
        editMinutes: 5,
        editMax: 120,
        features: [
            'отбор и сборка материала',
            'цветокоррекция',
            'чистка и выравнивание звука',
            'субтитры при необходимости',
            'простые плашки и инфографика',
            '1 круг правок'
        ]
    }
};

const MANUAL_OPTIONS = [
    'СТУДИЯ ИЛИ ПЛАТНАЯ ЛОКАЦИЯ',
    'ДОПОЛНИТЕЛЬНАЯ КАМЕРА / ОПЕРАТОР',
    'АЭРОСЪЕМКА',
    'СЛОЖНАЯ 2D / 3D-ГРАФИКА',
    'ДИКТОРСКАЯ ОЗВУЧКА',
    'СРОЧНЫЙ МОНТАЖ'
];

const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

function getEditDiscount(minutes, tier) {
    if (tier === 'none') return 0;
    if (minutes >= 41) return 0.25;
    if (minutes >= 21) return 0.2;
    if (minutes >= 11) return 0.15;
    if (minutes >= 6) return 0.1;
    return 0;
}

function getShootDiscount(hours) {
    return hours >= 3 ? 0.15 : 0;
}

function getReelsDiscount(quantity, tier) {
    if (tier === 'none') return 0;
    if (quantity >= 15) return 0.15;
    if (quantity >= 10) return 0.1;
    if (quantity >= 5) return 0.05;
    return 0;
}

function option(value, label, active) {
    return `<option value="${value}"${String(value) === String(active) ? ' selected' : ''}>${label}</option>`;
}

export function initPriceCalculator() {
    const root = document.querySelector('[data-price-calculator]');
    if (!root || root.dataset.priceReady === 'true') return;
    root.dataset.priceReady = 'true';

    const options = root.querySelector('[data-price-options]');
    const total = root.querySelector('[data-price-total]');
    const shootCost = root.querySelector('[data-price-service]');
    const editCost = root.querySelector('[data-price-addons]');
    const discountCost = root.querySelector('[data-price-discount]');
    const selection = root.querySelector('[data-price-selection]');
    const mobileTotal = root.querySelector('[data-price-mobile-total]');
    const scrollSurface = root.querySelector(':scope > .stack-card__surface');

    const state = {
        packageId: 'report',
        shootHours: PACKAGES.report.shootHours,
        editTier: PACKAGES.report.editTier,
        editMinutes: PACKAGES.report.editMinutes,
        reelsCount: 1,
        manualOptions: new Set()
    };

    function calculate() {
        const selected = PACKAGES[state.packageId];
        const tier = EDIT_TIERS[state.editTier];
        const shootBeforeDiscount = SHOOT_RATE * state.shootHours;
        const shootDiscount = shootBeforeDiscount * getShootDiscount(state.shootHours);
        const editVolume = selected.volumeType === 'reels' ? state.reelsCount : state.editMinutes;
        const editBeforeDiscount = tier.price * editVolume;
        const editDiscountRate = selected.volumeType === 'reels'
            ? getReelsDiscount(state.reelsCount, state.editTier)
            : getEditDiscount(state.editMinutes, state.editTier);
        const editDiscount = editBeforeDiscount * editDiscountRate;

        return {
            tier,
            shoot: shootBeforeDiscount - shootDiscount,
            edit: editBeforeDiscount - editDiscount,
            discount: shootDiscount + editDiscount,
            total: shootBeforeDiscount + editBeforeDiscount - shootDiscount - editDiscount
        };
    }

    function applyPackage(packageId) {
        const selected = PACKAGES[packageId];
        state.packageId = packageId;
        state.shootHours = selected.shootHours;
        state.editTier = selected.editTier;
        state.editMinutes = selected.editMinutes;
        state.reelsCount = selected.reelsCount || 1;
    }

    function renderOptions() {
        const selected = PACKAGES[state.packageId];
        const hasShoot = selected.shootMax > 0;
        const isReels = selected.volumeType === 'reels';
        const hasEdit = state.editTier !== 'none' && (selected.editMax > 0 || isReels);
        const showConfig = window.matchMedia('(min-width: 769px)').matches;
        options.innerHTML = `
            <div class="price-calculator__controls">
                <label class="price-calculator__field price-calculator__field--wide">
                    <span>ТИП ПРОЕКТА</span>
                    <select data-price-package>
                        ${Object.entries(PACKAGES).map(([id, item]) => option(id, item.name, state.packageId)).join('')}
                    </select>
                </label>

                <details class="price-calculator__config" data-price-config${showConfig ? ' open' : ''}>
                    <summary>НАСТРОИТЬ ПАРАМЕТРЫ <span>раскрыть +</span></summary>
                    <div class="price-calculator__config-grid">
                        <label class="price-calculator__field">
                            <span>МОНТАЖ</span>
                            <select data-price-control="editTier">
                                ${Object.entries(EDIT_TIERS).map(([id, tier]) => option(id, tier.name, state.editTier)).join('')}
                            </select>
                        </label>

                        <label class="price-calculator__field price-calculator__field--range${hasShoot ? '' : ' is-disabled'}">
                            <span>СЪЕМКА <b data-price-value="shootHours">${state.shootHours} Ч</b></span>
                            <input type="range" min="${hasShoot ? 1 : 0}" max="${selected.shootMax}" value="${state.shootHours}" data-price-range="shootHours"${hasShoot ? '' : ' disabled'}>
                        </label>

                        ${isReels ? `
                            <label class="price-calculator__field price-calculator__field--range${hasEdit ? '' : ' is-disabled'}">
                                <span>КОЛИЧЕСТВО РОЛИКОВ <b data-price-value="reelsCount">${state.reelsCount} ШТ</b></span>
                                <input type="range" min="${hasEdit ? 1 : 0}" max="${selected.reelsMax}" value="${state.reelsCount}" data-price-range="reelsCount"${hasEdit ? '' : ' disabled'}>
                            </label>
                        ` : `
                            <label class="price-calculator__field price-calculator__field--range${hasEdit ? '' : ' is-disabled'}">
                                <span>ГОТОВОЕ ВИДЕО <b data-price-value="editMinutes">${state.editMinutes} МИН</b></span>
                                <input type="range" min="${hasEdit ? 1 : 0}" max="${selected.editMax}" value="${state.editMinutes}" data-price-range="editMinutes"${hasEdit ? '' : ' disabled'}>
                            </label>
                        `}
                    </div>
                </details>
            </div>

            <div class="price-calculator__package">
                <div class="price-calculator__package-head">
                    <div>
                        <span>БАЗОВЫЙ ПАКЕТ</span>
                        <h3>${selected.name}</h3>
                    </div>
                    <b>от ${money(calculate().total)}</b>
                </div>
                <p>${selected.intro}</p>
                <div class="price-calculator__feature-list">
                    ${selected.features.map((feature) => `<span>${feature}</span>`).join('')}
                </div>
            </div>

            <details class="price-calculator__extras">
                <summary>ДОПОЛНИТЕЛЬНЫЕ ЗАДАЧИ <span>раскрыть +</span></summary>
                <p>Отметьте нужное. Эти пункты зависят от задачи и не прибавляют выдуманную фиксированную цену.</p>
                <div class="price-calculator__addons">
                    ${MANUAL_OPTIONS.map((name) => `
                        <label class="price-calculator__addon">
                            <input type="checkbox" value="${name}" data-price-manual-option${state.manualOptions.has(name) ? ' checked' : ''}>
                            <span>${name}</span>
                            <b>отдельно</b>
                        </label>
                    `).join('')}
                </div>
            </details>

            <p class="price-calculator__hint">
                Съемка считается по ${money(SHOOT_RATE)} за час: при заказе от 3 часов скидка 15%.
                ${isReels
                    ? 'Для пакета reels применяется скидка: 5% от 5 роликов, 10% от 10, 15% от 15.'
                    : 'На длинный монтаж автоматически применяется скидка до 25%.'}
            </p>
        `;
    }

    function renderSummary() {
        const result = calculate();
        total.textContent = money(result.total);
        if (mobileTotal) mobileTotal.textContent = money(result.total);
        shootCost.textContent = money(result.shoot);
        editCost.textContent = money(result.edit);
        discountCost.textContent = `− ${money(result.discount)}`;

        const selected = PACKAGES[state.packageId];
        const items = [
            `<div><span>${selected.name}</span><b>базовый пакет</b></div>`,
            ...(state.shootHours ? [`<div><span>СЪЕМКА</span><b>${state.shootHours} ч × ${money(SHOOT_RATE)}</b></div>`] : []),
            ...(state.editTier !== 'none' ? [`<div><span>${result.tier.name}</span><b>${selected.volumeType === 'reels' ? `${state.reelsCount} рол.` : `${state.editMinutes} мин`}</b></div>`] : []),
            ...Array.from(state.manualOptions).map((name) => `<div><span>${name}</span><b>отдельно</b></div>`)
        ];
        selection.innerHTML = items.join('');
    }

    function render() {
        renderOptions();
        renderSummary();
    }

    options.addEventListener('change', (event) => {
        if (event.target.matches('[data-price-package]')) {
            applyPackage(event.target.value);
            render();
            return;
        }

        const key = event.target.dataset.priceControl;
        if (key) {
            state[key] = event.target.value;
            if (key === 'editTier' && state.editTier === 'none') state.editMinutes = 0;
            if (key === 'editTier' && state.editTier !== 'none' && state.editMinutes === 0) state.editMinutes = 1;
            render();
            return;
        }

        if (!event.target.matches('[data-price-manual-option]')) return;
        if (event.target.checked) state.manualOptions.add(event.target.value);
        else state.manualOptions.delete(event.target.value);
        renderSummary();
    });

    options.addEventListener('input', (event) => {
        const key = event.target.dataset.priceRange;
        if (!key) return;
        state[key] = Number(event.target.value);
        const value = options.querySelector(`[data-price-value="${key}"]`);
        if (value) value.textContent = `${state[key]} ${key === 'shootHours' ? 'Ч' : key === 'reelsCount' ? 'ШТ' : 'МИН'}`;
        renderSummary();
    });

    function setMobileSummaryOpen(isOpen) {
        root.classList.toggle('is-mobile-summary-open', isOpen);
        document.body.classList.toggle('price-summary-lock', isOpen);

        if (!isOpen && scrollSurface) {
            scrollSurface.style.overscrollBehaviorY = 'auto';
            window.requestAnimationFrame(() => window.dispatchEvent(new Event('scroll')));
        }
    }

    function initMobileScrollGuard() {
        if (!scrollSurface) return;

        let touchStartY = 0;
        let startsAtTop = false;
        let startsAtBottom = false;
        let directionResolved = false;

        const release = () => {
            directionResolved = false;
            scrollSurface.style.overscrollBehaviorY = 'auto';
        };

        scrollSurface.addEventListener('touchstart', (event) => {
            if (!window.matchMedia('(max-width: 768px)').matches) return;

            const maxScrollTop = Math.max(0, scrollSurface.scrollHeight - scrollSurface.clientHeight);
            touchStartY = event.touches[0]?.clientY || 0;
            startsAtTop = scrollSurface.scrollTop <= 2;
            startsAtBottom = scrollSurface.scrollTop >= maxScrollTop - 2;
            directionResolved = false;
            scrollSurface.style.overscrollBehaviorY = 'auto';
        }, { passive: true });

        scrollSurface.addEventListener('touchmove', (event) => {
            if (directionResolved || !window.matchMedia('(max-width: 768px)').matches) return;

            const deltaY = (event.touches[0]?.clientY || 0) - touchStartY;
            if (Math.abs(deltaY) < 4) return;

            const exitsAtTop = startsAtTop && deltaY > 0;
            const exitsAtBottom = startsAtBottom && deltaY < 0;
            scrollSurface.style.overscrollBehaviorY = exitsAtTop || exitsAtBottom ? 'auto' : 'contain';
            directionResolved = true;
        }, { passive: true });

        scrollSurface.addEventListener('touchend', release, { passive: true });
        scrollSurface.addEventListener('touchcancel', release, { passive: true });
    }

    root.querySelector('[data-price-mobile-open]')?.addEventListener('click', () => {
        setMobileSummaryOpen(true);
    });

    root.querySelector('[data-price-mobile-close]')?.addEventListener('click', () => {
        setMobileSummaryOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setMobileSummaryOpen(false);
    });

    render();
    initMobileScrollGuard();
}
